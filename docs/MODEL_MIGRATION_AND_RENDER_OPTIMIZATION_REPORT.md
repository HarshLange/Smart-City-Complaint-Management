# CivicPulse / Reslexia — Model Migration & Render Resource Optimization Report
**Project:** AI-Based Smart City Complaint Management & Citizen Grievance Classification System  
**Date:** October 25, 2026  
**Scope:** Architecture Audit, Model Replacement (EfficientNetV2-S → ResNet18 + BiLSTM + Attention), CPU Profiling & Render Free-Tier Resource Optimization  

---

## 1. Executive Summary

CivicPulse (Reslexia) has successfully transitioned its core defect classification vision engine from **EfficientNetV2-S** to the custom-trained **ResNet18 + BiLSTM + Additive Attention** deep neural architecture trained on the municipal **TP100 dataset**.

### Key Outcomes & Improvements:
1. **CPU Latency Reduction:** Mean CPU inference latency dropped from **79.25 ms** down to **32.82 ms** — a **58.6% speedup (2.4x faster)**. 95th-percentile (P95) latency dropped from **106.49 ms** to **38.57 ms**.
2. **Model Parameter Reduction:** Total parameters decreased from **20,183,893** down to **12,888,646** — a **36.1% reduction** (~7.3 million fewer parameters), shrinking tensor memory from 77.0 MB to 49.2 MB.
3. **Inference Footprint Optimization:** By generating an inference-optimized checkpoint (`best_resnet18_bilstm_attention_clean.pt`) that strips training-only AdamW momentum/variance tensors, disk and loading RAM payload dropped from **147.65 MB** to **49.25 MB** (**-66.6%**).
4. **Render Free-Tier Headroom:** Peak application process RAM with the active model loaded and inferring on CPU is **379.59 MB**, leaving **132.41 MB (25.9%) of headroom** below Render's strict **512 MB** out-of-memory kill boundary (`SIGKILL 137`).
5. **Zero Interface Breakage:** 100% backward compatibility maintained across all frontend contracts, Supabase Storage paths, deterministic department routing, and database schemas. All **38/38 backend tests** and **frontend production build** pass cleanly.

---

## 2. Architecture Comparison

```
+---------------------------------------------------------------------------------------------------+
| PREVIOUS ARCHITECTURE: EfficientNetV2-S Baseline                                                  |
| Image (224x224x3) --> Fused-MBConv & MBConv Blocks (20.18M Params) --> Global Pool --> FC (5)    |
+---------------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------------+
| PROPOSED ARCHITECTURE: ResNet18 + BiLSTM + Additive Attention (12.89M Params)                     |
|                                                                                                   |
|  [Input Image: 224x224x3 RGB]                                                                     |
|         |                                                                                         |
|         v                                                                                         |
|  [ResNet-18 Backbone (Layers 0-7)] --------> Feature Map: (B x 512 x 7 x 7)                       |
|         |                                                                                         |
|         v                                                                                         |
|  [Spatial Sequence Flattening] -----------> Token Sequence: (B x 49 tokens x 512 dim)             |
|         |                                                                                         |
|         v                                                                                         |
|  [Bidirectional LSTM (h=256)] ------------> BiLSTM Outputs: (B x 49 tokens x 512 dim)             |
|         |                                                                                         |
|         v                                                                                         |
|  [Additive Attention Mechanism] ----------> Attention Weights: (B x 49 x 1)                       |
|     (Linear 512->256, Tanh, Linear 256->1)  Context Vector: (B x 512 dim)                         |
|         |                                                                                         |
|         v                                                                                         |
|  [Classification Head] -------------------> LayerNorm(512) -> Dropout(0.3) -> Linear(512 -> 5)  |
|         |                                                                                         |
|         v                                                                                         |
|  [Softmax Probabilities & Deterministic Routing]                                                  |
|     1. damaged_road        --> ROAD_AUTHORITY                                                     |
|     2. garbage             --> GARBAGE_DEPT                                                       |
|     3. pothole             --> ROAD_AUTHORITY                                                     |
|     4. streetlight_failure --> INFRASTRUCTURE                                                     |
|     5. water_leak          --> WATER_DEPT                                                         |
+---------------------------------------------------------------------------------------------------+
```

### Architectural Submodule Breakdown:

| Submodule | Specification | Output Shape | Parameters | Function |
| :--- | :--- | :--- | :--- | :--- |
| **Backbone** | `resnet18.children()[:8]` | `(B, 512, 7, 7)` | 11,176,512 | Multi-scale convolutional spatial defect feature extraction. |
| **Token Flattening** | `.flatten(2).permute(0, 2, 1)` | `(B, 49, 512)` | 0 | Converts 7x7 spatial grid into 49 sequential patch tokens. |
| **BiLSTM** | `nn.LSTM(512, 256, batch_first=True, bidirectional=True)` | `(B, 49, 512)` | 1,576,960 | Captures sequential context across spatial patches. |
| **Additive Attention** | `Linear(512, 256) -> Tanh -> Linear(256, 1)` | `(B, 512)` context | 131,585 | Computes soft importance distribution over patches. |
| **Classification Head**| `LayerNorm(512) -> Dropout(0.3) -> Linear(512, 5)` | `(B, 5)` logits | 3,589 | Normalized, regularized linear projection to target classes. |
| **Total** | **Full Composite Model** | `(B, 5)` logits | **12,888,646** | End-to-end differentiable municipal classifier. |

---

## 3. Training Results & Performance Metrics (TP100 Dataset)

*Note: The following metrics are derived from the training logs, evaluation checkpoints, and test matrices supplied in `ResNet18_BiLSTM_Attention_TP100_Results.zip`.*

### Dataset & Training Configuration
- **Dataset:** TP100 (Total images: 9,693: Train: 6,785, Validation: 1,454, Test: 1,454)
- **Batch Size:** 64
- **Max Epochs:** 100 | **Completed Epochs:** 67 (Early stopping triggered after validation macro-F1 plateau)
- **Best Epoch:** 47 (Saved to `best_resnet18_bilstm_attention.pt`)
- **Total Training Duration:** 1,876.64 seconds (~31.3 minutes)

### Aggregate Test Set Performance
| Evaluation Metric | Value | Percentage |
| :--- | :--- | :--- |
| **Best Validation Macro-F1** | 0.998667 | **99.87%** |
| **Test Accuracy** | 0.997937 | **99.79%** |
| **Test Macro-F1** | 0.998000 | **99.80%** |
| **Test Macro Precision** | 0.998011 | **99.80%** |
| **Test Macro Recall** | 0.998000 | **99.80%** |
| **Test Loss** | 0.008411 | — |

### Per-Class Test Set Performance Breakdown (1,454 Test Images)
| Civic Category | Precision | Recall | F1-Score | Support | Responsible Department |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `damaged_road` | 0.9934 | 1.0000 | 0.9967 | 300 | Road Authority |
| `garbage` | 0.9967 | 1.0000 | 0.9983 | 300 | Garbage Department |
| `pothole` | 1.0000 | 0.9933 | 0.9967 | 300 | Road Authority |
| `streetlight_failure` | 1.0000 | 1.0000 | 1.0000 | 254 | Infrastructure Department |
| `water_leak` | 1.0000 | 0.9967 | 0.9983 | 300 | Water Department |
| **Macro Average** | **0.9980** | **0.9980** | **0.9980** | **1,454** | — |
| **Weighted Average** | **0.9979** | **0.9979** | **0.9979** | **1,454** | — |

### Test Confusion Matrix (1,454 Samples)
```
Actual \ Predicted       damaged_road   garbage   pothole   streetlight   water_leak
----------------------------------------------------------------------------------
damaged_road                  300          0         0           0            0
garbage                         0        300         0           0            0
pothole                         2          0       298           0            0
streetlight_failure             0          0         0         254            0
water_leak                      0          1         0           0          299
```
*Out of 1,454 unseen test images, only 3 samples were misclassified (2 minor pavement potholes categorized as damaged road; 1 complex pooling water leak near debris categorized as garbage).*

---

## 4. Empirical Resource Profiling: Baseline vs Proposed

Both models were independently profiled using the project's real PyTorch runtime (`python 3.13`, PyTorch CPU) on identical hardware over 50 consecutive inference iterations with 5 warmup passes.

| Metric | EfficientNetV2-S (Baseline) | ResNet18 + BiLSTM + Attention | Delta / Improvement |
| :--- | :--- | :--- | :--- |
| **Total Parameters** | 20,183,893 | **12,888,646** | **-7,295,247 (-36.1%)** |
| **Parameter Tensor Size** | 77.00 MB | **49.17 MB** | **-27.83 MB (-36.1%)** |
| **Clean Checkpoint on Disk** | 77.86 MB | **49.25 MB** | **-28.61 MB (-36.7%)** |
| **Raw Training Checkpoint** | 77.86 MB | 147.65 MB | +69.79 MB *(includes AdamW states)* |
| **Model Cold-Load Time** | 397.24 ms | **220.03 ms** | **-177.21 ms (-44.6%)** |
| **RAM Delta on Model Load** | 164.72 MB | **101.81 MB** | **-62.91 MB (-38.2%)** |
| **Peak Application RAM** | 451.50 MB | **379.59 MB** | **-71.91 MB (-15.9%)** |
| **Mean CPU Latency** | 79.25 ms | **32.82 ms** | **-46.43 ms (-58.6%)** |
| **Median CPU Latency** | 79.10 ms | **32.42 ms** | **-46.68 ms (-59.0%)** |
| **P90 CPU Latency** | 91.38 ms | **36.16 ms** | **-55.22 ms (-60.4%)** |
| **P95 CPU Latency** | 106.49 ms | **38.57 ms** | **-67.92 ms (-63.8%)** |
| **Minimum CPU Latency** | 61.85 ms | **27.12 ms** | **-34.73 ms (-56.1%)** |
| **Maximum CPU Latency** | 118.07 ms | **42.74 ms** | **-75.33 ms (-63.8%)** |

---

## 5. Render Free-Tier Resource Audit & Optimization Strategy

Render's free web service tier operates under strict constraints:
- **Memory Limit:** 512 MB RAM (Hard ceiling; exceeding triggers immediate OS `SIGKILL 137`)
- **CPU:** Shared single vCPU (0.1 to 1.0 vCPU)
- **Cold Starts:** Instance spins down after 15 minutes of inactivity; restarts on subsequent incoming HTTP requests.

### Critical Discovery: Checkpoint Memory Overhead
During initial inspection, `best_resnet18_bilstm_attention.pt` was **147.65 MB** because PyTorch saved the entire training environment: AdamW optimizer momentum and variance tensors for all 12.8M parameters, plus learning rate scheduler states.
- Loading the raw 147MB checkpoint in Python temporarily surged memory to **~478 MB**, leaving only ~34 MB of RAM before Render's 512MB threshold.
- **Solution Implemented:** Generated `best_resnet18_bilstm_attention_clean.pt` containing only `model_state_dict`, `class_names`, `class_to_idx`, and `model_config`. This reduced disk size to **49.25 MB** and dropped peak load RAM to **379.59 MB**, providing **132.41 MB of safe headroom**.

### Applied Optimization Measures:
1. **Single-Worker Execution (`--workers 1`):**
   Multi-worker setups (`--workers 2` or `4`) duplicate the Python process and PyTorch model in memory, which would consume `2 x 379 MB = 758 MB` (instant crash on Render). The `Dockerfile` CMD strictly enforces `--workers 1`.
2. **CPU Thread Limiting (`torch.set_num_threads(1)`):**
   On a single-core or shared CPU, PyTorch's default thread pool creates context-switch overhead and thread memory buffers. Setting thread count to 1 eliminates context switching and ensures deterministic, low-latency execution.
3. **Inference Autograd Disabling (`torch.inference_mode()`):**
   `torch.inference_mode()` disables view tracking and version counters, outperforming `torch.no_grad()` by eliminating autograd metadata allocations.
4. **Immediate Garbage Collection on Load:**
   `ModelManager.load_model()` explicitly executes `del checkpoint; del state_dict; gc.collect()` immediately after transferring weights into `model.state_dict()`.
5. **Image Resolution Safety Guard:**
   `run_inference_sync()` downsamples giant uploaded images (>1920px) using Pillow's `thumbnail()` before tensor conversion, preventing multi-megapixel images from allocating huge intermediate numpy arrays.
6. **Container Build Exclusions (`.dockerignore`):**
   The 143MB `ResNet18_BiLSTM_Attention_TP100_Results.zip` archive and other large archives are excluded from Docker context, keeping container image size lean.

---

## 6. End-to-End Application Integration & Verification

### File Modifications Summary:
1. **`backend/app/ml/architecture.py` (New):** Clean, modular implementation of `AdditiveAttention` and `ResNet18BiLSTMAdditiveAttention`.
2. **`backend/app/ml/model.py` (Updated):** Singleton `ModelManager` loading `ResNet18BiLSTMAdditiveAttention` with `strict=True`, automatic fallback path discovery, and thread pool configuration.
3. **`backend/app/ml/inference.py` (Updated):** Modern `torch.inference_mode()`, Pillow image downsampling guard, and updated model metadata output (`ResNet18 + BiLSTM + Attention`, `TP100-epoch47`).
4. **`backend/app/ml/weights/` (Updated):**
   - `best_resnet18_bilstm_attention.pt` (147.6MB full checkpoint)
   - `best_resnet18_bilstm_attention_clean.pt` (49.2MB clean inference checkpoint)
   - `model_metadata.json` (Full 5-class metadata, parameter counts, metrics)
   - `backup_efficientnet_v2_s/` (Safe archive of all previous EfficientNetV2-S weights)
5. **`backend/app/main.py` (Updated):** Lifespan startup and `/health` endpoint dynamically reflect active model name.
6. **`backend/app/models/complaint.py` & `complaint_service.py` (Updated):** Updated default database metadata references.
7. **`backend/tests/` (Updated & Verified):** Updated assertions in `test_ml_inference.py`.
8. **`frontend/src/` (Updated & Verified):** Updated landing page and disclaimer text; verified clean production build.
9. **`Dockerfile` (Updated):** Build-time checkpoint integrity check verifies `best_resnet18_bilstm_attention_clean.pt` (>40MB).

### Automated Test Verification:
```
backend/tests/test_auth.py:                   10 passed
backend/tests/test_complaints.py:              9 passed
backend/tests/test_department_isolation.py:    4 passed
backend/tests/test_ml_inference.py:            4 passed
backend/tests/test_security_and_admin.py:      8 passed
backend/tests/test_storage.py:                 3 passed
-------------------------------------------------------
Total Backend Test Suite:                     38 passed (100% pass rate in 108s)
ML Inference Integration Suite:                4 passed (0.97s)
Frontend TypeScript & Vite Build:             0 errors (built in 5.75s)
```

---

## 7. Production Deployment Recommendations

1. **Render Web Service Configuration:**
   - **Build Command:** Built via Dockerfile.
   - **Start Command:** Managed by container entrypoint (`uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`).
   - **Health Check Path:** `/health` (Responds with `{"status": "healthy", "ai_model_loaded": true, "ai_model_name": "ResNet18 + BiLSTM + Attention"}`).
   - **Memory Alert:** Configure Render notification alert at 80% RAM (~410 MB). The current working set is ~380 MB, well within safe operational limits.
2. **Git LFS Safety:**
   - Confirm `git lfs pull` is executed in CI/CD before Docker build so that the container copies the actual 49MB `.pt` binary rather than a 130-byte Git LFS pointer text file.

---
*Report compiled and verified by Antigravity Senior Engineering Orchestrator.*
