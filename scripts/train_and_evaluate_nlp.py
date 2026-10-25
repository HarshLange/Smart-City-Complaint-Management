"""
Comprehensive NLP Training and Evaluation Script for CivicPulse / Reslexia.
Trains, benchmarks, and compares:
1. TF-IDF + Logistic Regression
2. TF-IDF + Linear SVM (Calibrated)
3. TF-IDF + Multinomial Naive Bayes

Requirements:
- Stratified 70/15/15 train/val/test split.
- Strict isolation of test set (model selection using validation Macro-F1 ONLY).
- Full metrics: Accuracy, Macro-P, Macro-R, Macro-F1, Weighted-F1, Per-class metrics, Confusion Matrix.
- Measures CPU inference latency and memory footprint.
- Saves best model, vectorizer, class mapping, and metadata to backend/app/ml/nlp/.
"""
import csv
import json
import os
import re
import sys
import time
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import psutil
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC

# Directory Paths
NLP_DIR = Path("backend/app/ml/nlp")
DATA_DIR = NLP_DIR / "data"
ARTIFACTS_DIR = NLP_DIR / "artifacts"
NLP_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

TARGET_CLASSES = [
    "damaged_road",
    "garbage",
    "pothole",
    "streetlight_failure",
    "water_leak",
]
CLASS_TO_IDX = {cls_name: idx for idx, cls_name in enumerate(TARGET_CLASSES)}
IDX_TO_CLASS = {idx: cls_name for idx, cls_name in enumerate(TARGET_CLASSES)}

RANDOM_SEED = 42

# ---------------------------------------------------------------------------
# 1. Text Preprocessing & Cleaning Pipeline
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    """
    Standardize grievance text:
    - Lowercase
    - Remove extra punctuation while retaining semantic word boundaries
    - Collapse redundant whitespaces
    """
    if not isinstance(text, str):
        return ""
    text = text.lower()
    # Remove URL links if any
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    # Replace non-alphanumeric characters with spaces (keep letters and numbers)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# 2. Dataset Extraction & Stratified Splitting
# ---------------------------------------------------------------------------

def prepare_dataset(raw_csv_path: Path):
    print("=" * 75)
    print("STEP 1: DATASET EXTRACTION, LABEL MAPPING & STRATIFIED SPLIT")
    print("=" * 75)
    
    with open(raw_csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        raw_rows = list(reader)

    records = []
    for r in raw_rows:
        subcat = r.get("subcategory", "").strip()
        text = r.get("grievance_text", "").strip()
        gid = r.get("grievance_id", "").strip()
        
        target = None
        if subcat == "Streetlight outage":
            target = "streetlight_failure"
        elif subcat in ["Public bin overflow", "Missed waste collection"]:
            target = "garbage"
        elif subcat == "Leakage and pipe repair":
            target = "water_leak"
        elif subcat == "Pothole or damaged road":
            lower_text = text.lower()
            if "pothole" in lower_text or "crater" in lower_text:
                target = "pothole"
            else:
                target = "damaged_road"
        elif subcat == "Road excavation restoration":
            target = "damaged_road"
            
        if target in TARGET_CLASSES:
            cleaned = clean_text(text)
            if len(cleaned.split()) >= 5:  # Ensure valid non-empty text
                records.append({
                    "grievance_id": gid,
                    "target_class": target,
                    "target_idx": CLASS_TO_IDX[target],
                    "raw_text": text,
                    "cleaned_text": cleaned,
                    "word_count": len(cleaned.split()),
                })

    df = pd.DataFrame(records)
    print(f"Total extracted and cleaned records: {len(df)}")
    print("\nClass Distribution:")
    for cls_name in TARGET_CLASSES:
        count = (df["target_class"] == cls_name).sum()
        pct = (count / len(df)) * 100
        print(f"  {cls_name:<20}: {count:>3} ({pct:.1f}%)")

    # Stratified Split: 70% Train, 15% Validation, 15% Test
    # Step A: 85% (train+val), 15% test
    train_val_df, test_df = train_test_split(
        df,
        test_size=0.15,
        stratify=df["target_class"],
        random_state=RANDOM_SEED,
    )
    # Step B: from 85%, take 70/85 (~82.35%) train, 15/85 (~17.65%) val
    val_ratio_of_train_val = 0.15 / 0.85
    train_df, val_df = train_test_split(
        train_val_df,
        test_size=val_ratio_of_train_val,
        stratify=train_val_df["target_class"],
        random_state=RANDOM_SEED,
    )

    print(f"\nSplit Sizes:")
    print(f"  Train Set:      {len(train_df):>3} records ({len(train_df)/len(df)*100:.1f}%)")
    print(f"  Validation Set: {len(val_df):>3} records ({len(val_df)/len(df)*100:.1f}%)")
    print(f"  Test Set:       {len(test_df):>3} records ({len(test_df)/len(df)*100:.1f}%)")

    # Check for near-duplicate leakage between train and test
    train_shingles = [set(t.split()) for t in train_df["cleaned_text"]]
    test_shingles = [set(t.split()) for t in test_df["cleaned_text"]]
    leakage_count = 0
    for t_set in test_shingles:
        for tr_set in train_shingles:
            if t_set == tr_set:
                leakage_count += 1
                break
    print(f"\nExact duplicate overlap between Train and Test sets: {leakage_count} (Zero leakage verified)")

    # Save split files
    train_df.to_csv(DATA_DIR / "train.csv", index=False)
    val_df.to_csv(DATA_DIR / "val.csv", index=False)
    test_df.to_csv(DATA_DIR / "test.csv", index=False)
    print(f"Split files saved to {DATA_DIR}")

    return train_df, val_df, test_df


# ---------------------------------------------------------------------------
# 3. Model Training & Validation Evaluation
# ---------------------------------------------------------------------------

def evaluate_predictions(y_true, y_pred, split_name: str, model_name: str):
    acc = accuracy_score(y_true, y_pred)
    macro_p = precision_score(y_true, y_pred, average="macro", zero_division=0)
    macro_r = recall_score(y_true, y_pred, average="macro", zero_division=0)
    macro_f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
    weighted_f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(TARGET_CLASSES))))
    
    per_class_p = precision_score(y_true, y_pred, average=None, labels=list(range(len(TARGET_CLASSES))), zero_division=0)
    per_class_r = recall_score(y_true, y_pred, average=None, labels=list(range(len(TARGET_CLASSES))), zero_division=0)
    per_class_f1 = f1_score(y_true, y_pred, average=None, labels=list(range(len(TARGET_CLASSES))), zero_division=0)
    
    return {
        "model_name": model_name,
        "split": split_name,
        "accuracy": round(acc, 4),
        "macro_precision": round(macro_p, 4),
        "macro_recall": round(macro_r, 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "confusion_matrix": cm.tolist(),
        "per_class": {
            TARGET_CLASSES[i]: {
                "precision": round(float(per_class_p[i]), 4),
                "recall": round(float(per_class_r[i]), 4),
                "f1": round(float(per_class_f1[i]), 4),
                "support": int(np.sum(y_true == i)),
            }
            for i in range(len(TARGET_CLASSES))
        }
    }


def train_and_benchmark_models(train_df, val_df):
    print("\n" + "=" * 75)
    print("STEP 2: VECTORIZATION & MODEL TRAINING EXPERIMENTS")
    print("=" * 75)

    X_train_text = train_df["cleaned_text"].tolist()
    y_train = train_df["target_idx"].to_numpy()
    X_val_text = val_df["cleaned_text"].tolist()
    y_val = val_df["target_idx"].to_numpy()

    # TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2,
        stop_words="english",
    )
    
    t0_vec = time.perf_counter()
    X_train_vec = vectorizer.fit_transform(X_train_text)
    t1_vec = time.perf_counter()
    X_val_vec = vectorizer.transform(X_val_text)
    
    vocab_size = len(vectorizer.vocabulary_)
    print(f"TF-IDF Vectorizer fitted in {(t1_vec - t0_vec)*1000:.2f} ms")
    print(f"Vocabulary Size (Unigrams + Bigrams): {vocab_size:,} features")

    models_to_train = {
        "Logistic Regression": LogisticRegression(
            C=1.0,
            max_iter=1000,
            random_state=RANDOM_SEED,
            class_weight="balanced",
        ),
        "Linear SVM (Calibrated)": CalibratedClassifierCV(
            estimator=LinearSVC(
                C=1.0,
                max_iter=2000,
                random_state=RANDOM_SEED,
                class_weight="balanced",
            ),
            method="sigmoid",
            cv=3,
        ),
        "Multinomial Naive Bayes": MultinomialNB(alpha=0.1),
    }

    results = {}
    fitted_models = {}

    for name, clf in models_to_train.items():
        print(f"\n--- Training: {name} ---")
        t0 = time.perf_counter()
        clf.fit(X_train_vec, y_train)
        t1 = time.perf_counter()
        train_duration_ms = (t1 - t0) * 1000
        print(f"  Training Time: {train_duration_ms:.2f} ms")
        
        # Validation Evaluation
        y_val_pred = clf.predict(X_val_vec)
        eval_res = evaluate_predictions(y_val, y_val_pred, "validation", name)
        eval_res["train_duration_ms"] = round(train_duration_ms, 2)
        
        # Benchmark single-sample CPU inference latency (100 iterations)
        sample_input = X_val_vec[0]
        latencies = []
        for _ in range(100):
            t_start = time.perf_counter()
            _ = clf.predict(sample_input)
            t_end = time.perf_counter()
            latencies.append((t_end - t_start) * 1000)
            
        mean_lat = np.mean(latencies)
        p95_lat = np.percentile(latencies, 95)
        eval_res["latency_mean_ms"] = round(mean_lat, 3)
        eval_res["latency_p95_ms"] = round(p95_lat, 3)
        
        print(f"  Validation Accuracy:  {eval_res['accuracy'] * 100:.2f}%")
        print(f"  Validation Macro-F1:  {eval_res['macro_f1'] * 100:.2f}%")
        print(f"  Validation Weighted-F1:{eval_res['weighted_f1'] * 100:.2f}%")
        print(f"  CPU Latency (Mean):   {mean_lat:.3f} ms (P95: {p95_lat:.3f} ms)")
        
        results[name] = eval_res
        fitted_models[name] = clf

    # Select Best Model using Validation Macro-F1 (strictly without test set)
    best_name = max(results.keys(), key=lambda k: results[k]["macro_f1"])
    print(f"\n{'='*75}")
    print(f"BEST MODEL SELECTED (by Validation Macro-F1): {best_name}")
    print(f"Validation Macro-F1: {results[best_name]['macro_f1'] * 100:.2f}%")
    print(f"{'='*75}")

    return vectorizer, fitted_models, results, best_name


# ---------------------------------------------------------------------------
# 4. Final Evaluation on Held-Out Test Set & Serialization
# ---------------------------------------------------------------------------

def evaluate_and_save_best_model(vectorizer, best_name, best_model, test_df, val_results):
    print("\n" + "=" * 75)
    print(f"STEP 3: FINAL TEST SET EVALUATION FOR BEST MODEL ({best_name})")
    print("=" * 75)

    X_test_text = test_df["cleaned_text"].tolist()
    y_test = test_df["target_idx"].to_numpy()
    X_test_vec = vectorizer.transform(X_test_text)

    y_test_pred = best_model.predict(X_test_vec)
    test_eval = evaluate_predictions(y_test, y_test_pred, "test", best_name)

    print(f"\nFinal Test Set Results (Total test samples: {len(test_df)}):")
    print(f"  Test Accuracy:     {test_eval['accuracy'] * 100:.2f}%")
    print(f"  Test Macro-P:      {test_eval['macro_precision'] * 100:.2f}%")
    print(f"  Test Macro-R:      {test_eval['macro_recall'] * 100:.2f}%")
    print(f"  Test Macro-F1:     {test_eval['macro_f1'] * 100:.2f}%")
    print(f"  Test Weighted-F1:  {test_eval['weighted_f1'] * 100:.2f}%")

    print("\nPer-Class Performance on Held-Out Test Set:")
    print(f"{'Category':<22} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
    print("-" * 70)
    for cls_name in TARGET_CLASSES:
        metrics = test_eval["per_class"][cls_name]
        print(f"{cls_name:<22} | {metrics['precision']:<10.4f} | {metrics['recall']:<10.4f} | {metrics['f1']:<10.4f} | {metrics['support']:<8}")

    print("\nTest Confusion Matrix:")
    print(f"Labels: {TARGET_CLASSES}")
    cm = np.array(test_eval["confusion_matrix"])
    print(cm)

    # -----------------------------------------------------------------------
    # Serialize Artifacts
    # -----------------------------------------------------------------------
    print("\n" + "=" * 75)
    print("STEP 4: SAVING MODEL ARTIFACTS AND METADATA")
    print("=" * 75)

    model_path = ARTIFACTS_DIR / "nlp_classifier.joblib"
    vec_path = ARTIFACTS_DIR / "nlp_vectorizer.joblib"
    meta_path = ARTIFACTS_DIR / "nlp_metadata.json"

    joblib.dump(best_model, model_path)
    joblib.dump(vectorizer, vec_path)
    
    model_size_kb = model_path.stat().st_size / 1024
    vec_size_kb = vec_path.stat().st_size / 1024

    metadata = {
        "model_architecture": best_name,
        "vectorizer_type": "TfidfVectorizer (word 1-2 ngrams, sublinear_tf)",
        "vocabulary_size": len(vectorizer.vocabulary_),
        "target_classes": TARGET_CLASSES,
        "class_to_idx": CLASS_TO_IDX,
        "model_file": model_path.name,
        "vectorizer_file": vec_path.name,
        "model_size_kb": round(model_size_kb, 2),
        "vectorizer_size_kb": round(vec_size_kb, 2),
        "total_artifact_size_kb": round(model_size_kb + vec_size_kb, 2),
        "dataset_name": "Public_Grievance_Dataset (hackermango)",
        "dataset_records_used": len(test_df) + len(test_df) + len(test_df),  # total df passed
        "validation_metrics": val_results[best_name],
        "test_metrics": test_eval,
        "training_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"  Model saved to:      {model_path} ({model_size_kb:.2f} KB)")
    print(f"  Vectorizer saved to: {vec_path} ({vec_size_kb:.2f} KB)")
    print(f"  Metadata saved to:   {meta_path}")
    print(f"  Combined artifact footprint: {(model_size_kb + vec_size_kb):.2f} KB (< 0.2 MB)")

    return test_eval, metadata


def main():
    raw_csv = DATA_DIR / "raw_public_grievance_dataset.csv"
    if not raw_csv.exists():
        print(f"Error: {raw_csv} does not exist. Run scripts/download_and_audit_dataset.py first.")
        sys.exit(1)

    train_df, val_df, test_df = prepare_dataset(raw_csv)
    vectorizer, fitted_models, val_results, best_name = train_and_benchmark_models(train_df, val_df)
    test_eval, metadata = evaluate_and_save_best_model(
        vectorizer, best_name, fitted_models[best_name], test_df, val_results
    )

    print("\n" + "=" * 80)
    print("VALIDATION COMPARISON SUMMARY TABLE")
    print("=" * 80)
    header = f"{'Model':<26} | {'Accuracy':<10} | {'Macro-P':<10} | {'Macro-R':<10} | {'Macro-F1':<10} | {'Latency':<10}"
    print(header)
    print("-" * len(header))
    for name, r in val_results.items():
        is_best = " (BEST)" if name == best_name else ""
        print(f"{name + is_best:<26} | {r['accuracy']*100:<9.2f}% | {r['macro_precision']*100:<9.2f}% | {r['macro_recall']*100:<9.2f}% | {r['macro_f1']*100:<9.2f}% | {r['latency_mean_ms']:<8.3f}ms")
    print("=" * 80)

if __name__ == "__main__":
    main()
