"""
Test trained NLP classifier on realistic, colloquial, short, and ambiguous citizen inputs.
"""
import joblib
import numpy as np
from pathlib import Path

TARGET_CLASSES = [
    "damaged_road",
    "garbage",
    "pothole",
    "streetlight_failure",
    "water_leak",
]

model_path = Path("backend/app/ml/nlp/artifacts/nlp_classifier.joblib")
vec_path = Path("backend/app/ml/nlp/artifacts/nlp_vectorizer.joblib")

model = joblib.load(model_path)
vec = joblib.load(vec_path)

test_sentences = [
    # 1. Realistic typical citizen complaints
    "Huge deep crater in the road damaging vehicle suspensions on 5th avenue",
    "Massive puddle of drinking water gushing from broken pipe under sidewalk",
    "Trash cans overflowing with rotten food waste and plastic bags near the market",
    "Street light is totally dead at night and street is completely dark",
    "Asphalt surface has collapsed and road excavation was never repaired after trenching",
    # 2. Short / telegraphic mobile complaints
    "pot hole near shop",
    "no light on pole",
    "water leak in main line",
    "garbage everywhere smelly",
    "road broken badly",
    # 3. Ambiguous / multi-issue sentences
    "water leaking onto damaged road near the corner",
    "garbage pile blocking the streetlight pole at night",
    # 4. Out of domain / irrelevant text
    "I want to apply for a birth certificate",
    "Hello testing 123",
]

print("=" * 80)
print("EVALUATING UNSEEN CITIZEN COMPLAINT VARIATIONS")
print("=" * 80)

for s in test_sentences:
    X = vec.transform([s.lower()])
    probs = model.predict_proba(X)[0]
    top_idx = int(np.argmax(probs))
    conf = probs[top_idx]
    pred = TARGET_CLASSES[top_idx]
    
    # Check if vocabulary words were even present in input
    features_present = [w for w in s.lower().split() if w in vec.vocabulary_]
    
    print(f"\nInput: \"{s}\"")
    print(f"  Matched N-grams: {features_present}")
    print(f"  Predicted Category: [{pred}] (Confidence: {conf*100:.1f}%)")
    prob_summary = {TARGET_CLASSES[i]: round(float(probs[i]), 3) for i in range(len(TARGET_CLASSES))}
    print(f"  Probability Distribution: {prob_summary}")
