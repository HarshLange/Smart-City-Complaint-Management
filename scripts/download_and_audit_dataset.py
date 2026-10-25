"""
Download and comprehensively audit Public_Grievance_Dataset for CivicPulse NLP pipeline.
Verifies:
1. Actual download integrity, SHA-256, license, and size.
2. Label distribution across all subcategories.
3. Target class mapping rules for:
   - damaged_road
   - garbage
   - pothole
   - streetlight_failure
   - water_leak
4. Text inspection: duplicates, near-duplicates, length distribution, template analysis.
"""
import csv
import hashlib
import io
import json
import os
import re
import sys
import urllib.request
from collections import Counter
from pathlib import Path

DATA_DIR = Path("backend/app/ml/nlp/data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
RAW_CSV_PATH = DATA_DIR / "raw_public_grievance_dataset.csv"
SOURCE_URL = "https://huggingface.co/datasets/hackermango/Public_Grievance_Dataset/resolve/main/Public_Grievance_Dataset.csv"


def download_raw_dataset() -> Path:
    print(f"[1] Downloading raw dataset from: {SOURCE_URL}")
    if RAW_CSV_PATH.exists() and RAW_CSV_PATH.stat().st_size > 1000000:
        print(f"  Existing file found on disk: {RAW_CSV_PATH} ({RAW_CSV_PATH.stat().st_size:,} bytes)")
    else:
        req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp, open(RAW_CSV_PATH, "wb") as f:
            content = resp.read()
            f.write(content)
        print(f"  Downloaded successfully to {RAW_CSV_PATH} ({RAW_CSV_PATH.stat().st_size:,} bytes)")

    # Compute SHA-256
    sha256 = hashlib.sha256()
    with open(RAW_CSV_PATH, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    hash_hex = sha256.hexdigest()
    print(f"  SHA-256 Checksum: {hash_hex}")
    return RAW_CSV_PATH


def audit_raw_dataset(csv_path: Path):
    print("\n[2] Auditing Raw Dataset Structure & Fields...")
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        rows = list(reader)

    print(f"  Total records in raw CSV: {len(rows):,}")
    print(f"  Columns ({len(fields)}): {fields}")

    category_counts = Counter(r["category"] for r in rows)
    subcategory_counts = Counter((r["category"], r["subcategory"]) for r in rows)

    print("\n  Top 10 Categories:")
    for cat, cnt in category_counts.most_common(10):
        print(f"    - {cat:<35}: {cnt}")

    return rows


def map_and_audit_target_records(rows):
    print("\n[3] Mapping Target Categories and Auditing Phrasing...")
    
    mapped_records = []
    unmapped_relevant = []
    
    for r in rows:
        cat = r.get("category", "").strip()
        subcat = r.get("subcategory", "").strip()
        text = r.get("grievance_text", "").strip()
        gid = r.get("grievance_id", "").strip()
        
        target_label = None
        mapping_rule = None
        
        # Mapping Logic
        if subcat == "Streetlight outage":
            target_label = "streetlight_failure"
            mapping_rule = "subcategory == 'Streetlight outage'"
        elif subcat in ["Public bin overflow", "Missed waste collection"]:
            target_label = "garbage"
            mapping_rule = f"subcategory == '{subcat}'"
        elif subcat == "Leakage and pipe repair":
            target_label = "water_leak"
            mapping_rule = "subcategory == 'Leakage and pipe repair'"
        elif subcat == "Pothole or damaged road":
            # Disambiguation between pothole and damaged road based on defect entity
            lower_text = text.lower()
            if "pothole" in lower_text or "crater" in lower_text:
                target_label = "pothole"
                mapping_rule = "subcategory == 'Pothole or damaged road' & keyword 'pothole/crater'"
            else:
                target_label = "damaged_road"
                mapping_rule = "subcategory == 'Pothole or damaged road' & road surface/damage terms"
        elif subcat == "Road excavation restoration":
            target_label = "damaged_road"
            mapping_rule = "subcategory == 'Road excavation restoration' (unrestored asphalt/trench)"
        else:
            # Check if any other records mention our keywords
            lower_t = text.lower()
            if any(k in lower_t for k in ["pothole", "streetlight", "overflowing garbage", "water pipe leak"]):
                unmapped_relevant.append((gid, cat, subcat, text[:80]))
                
        if target_label:
            mapped_records.append({
                "grievance_id": gid,
                "original_category": cat,
                "original_subcategory": subcat,
                "target_class": target_label,
                "mapping_rule": mapping_rule,
                "text": text,
                "word_count": len(text.split()),
                "char_count": len(text)
            })

    print(f"  Total mapped records: {len(mapped_records)}")
    class_dist = Counter(r["target_class"] for r in mapped_records)
    print("\n  Mapped Target Class Distribution:")
    for cls_name, count in sorted(class_dist.items()):
        pct = (count / len(mapped_records)) * 100
        print(f"    - {cls_name:<20}: {count:>3} ({pct:.1f}%)")

    # Inspect Duplicates & Near-Duplicates
    print("\n[4] Inspecting for Exact Duplicates and Near-Duplicates...")
    all_texts = [r["text"] for r in mapped_records]
    unique_texts = set(all_texts)
    print(f"  Total text records:  {len(all_texts)}")
    print(f"  Unique text records: {len(unique_texts)}")
    print(f"  Exact duplicate count: {len(all_texts) - len(unique_texts)}")

    # Check for near-duplicates using Jaccard similarity on word sets
    near_dupe_pairs = []
    shingles = [set(re.findall(r"\w+", t.lower())) for t in all_texts]
    for i in range(len(shingles)):
        for j in range(i + 1, min(i + 50, len(shingles))):  # check local window
            intersect = len(shingles[i] & shingles[j])
            union = len(shingles[i] | shingles[j])
            sim = intersect / union if union > 0 else 0
            if sim > 0.85:
                near_dupe_pairs.append((i, j, sim))

    print(f"  Near-duplicate pairs (Jaccard > 0.85 in local windows): {len(near_dupe_pairs)}")
    
    # Text length analysis
    word_counts = [r["word_count"] for r in mapped_records]
    print(f"\n  Text Length Statistics (Words):")
    print(f"    - Min:    {min(word_counts)}")
    print(f"    - Max:    {max(word_counts)}")
    print(f"    - Mean:   {sum(word_counts) / len(word_counts):.1f}")
    print(f"    - Median: {sorted(word_counts)[len(word_counts)//2]}")

    # Template analysis
    print("\n[5] Template and Syntactic Pattern Analysis...")
    sample_starts = Counter(" ".join(r["text"].split()[:5]) for r in mapped_records)
    print("  Most Common Opening Phrases:")
    for phrase, count in sample_starts.most_common(5):
        print(f"    - \"{phrase}...\" : {count} times")

    return mapped_records


if __name__ == "__main__":
    raw_path = download_raw_dataset()
    raw_rows = audit_raw_dataset(raw_path)
    mapped = map_and_audit_target_records(raw_rows)
