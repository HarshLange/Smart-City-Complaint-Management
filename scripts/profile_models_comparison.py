"""
Comprehensive model profiling script comparing EfficientNetV2-S vs ResNet18 + BiLSTM + Additive Attention.
Measures:
- Checkpoint file size on disk (bytes & MB)
- Parameter count (total and trainable)
- Memory consumption (RSS / Working Set RAM before, during load, after load, and during peak inference)
- CPU Inference Latency (mean, median, p90, p95, min, max over 50 iterations after 5 warmups)
"""
import gc
import io
import os
import sys
import time
import zipfile
from pathlib import Path
import numpy as np
import psutil
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# Ensure process is measured accurately
process = psutil.Process(os.getpid())

def get_ram_mb() -> float:
    return process.memory_info().rss / (1024 * 1024)

# ---------------------------------------------------------------------------
# Architecture Definitions
# ---------------------------------------------------------------------------

class AdditiveAttention(nn.Module):
    """Additive (Bahdanau) Attention mechanism."""
    def __init__(self, hidden_dim: int = 512, attention_dim: int = 256):
        super().__init__()
        self.attention_layer = nn.Sequential(
            nn.Linear(hidden_dim, attention_dim),
            nn.Tanh(),
            nn.Linear(attention_dim, 1)
        )

    def forward(self, x):
        # x: (batch_size, seq_len, hidden_dim)
        scores = self.attention_layer(x)  # (batch_size, seq_len, 1)
        weights = torch.softmax(scores, dim=1)
        context = torch.sum(weights * x, dim=1)  # (batch_size, hidden_dim)
        return context, weights


class ResNet18BiLSTMAdditiveAttention(nn.Module):
    """ResNet-18 feature extractor + Bidirectional LSTM + Additive Attention classifier."""
    def __init__(self, num_classes: int = 5, lstm_hidden_size: int = 256, dropout: float = 0.3):
        super().__init__()
        resnet = models.resnet18(weights=None)
        # Backbone: layers 0 through 7 (ending after layer4, output shape: B, 512, 7, 7)
        self.backbone = nn.Sequential(*list(resnet.children())[:8])
        self.bilstm = nn.LSTM(
            input_size=512,
            hidden_size=lstm_hidden_size,
            batch_first=True,
            bidirectional=True
        )
        self.attention = AdditiveAttention(
            hidden_dim=lstm_hidden_size * 2,
            attention_dim=lstm_hidden_size
        )
        self.classifier = nn.Sequential(
            nn.LayerNorm(lstm_hidden_size * 2),
            nn.Dropout(dropout),
            nn.Linear(lstm_hidden_size * 2, num_classes)
        )

    def forward(self, x):
        features = self.backbone(x)  # (B, 512, 7, 7)
        seq = features.flatten(2).permute(0, 2, 1)  # (B, 49, 512)
        lstm_out, _ = self.bilstm(seq)  # (B, 49, 512)
        context, attn_weights = self.attention(lstm_out)  # (B, 512)
        logits = self.classifier(context)  # (B, num_classes)
        return logits


# ---------------------------------------------------------------------------
# Profiling Function
# ---------------------------------------------------------------------------

def profile_model(model_name: str, loader_fn, weights_path: Path):
    print(f"\n{'='*70}")
    print(f"PROFILING: {model_name}")
    print(f"{'='*70}")
    
    # 1. File size on disk
    file_size_bytes = weights_path.stat().st_size
    file_size_mb = file_size_bytes / (1024 * 1024)
    print(f"File Size on Disk: {file_size_bytes:,} bytes ({file_size_mb:.2f} MB)")
    
    # Clean memory before load
    gc.collect()
    ram_before_load = get_ram_mb()
    
    # 2. Load model
    t0_load = time.perf_counter()
    model = loader_fn()
    t1_load = time.perf_counter()
    load_time_ms = (t1_load - t0_load) * 1000
    
    ram_after_load = get_ram_mb()
    ram_delta_load = ram_after_load - ram_before_load
    
    # Parameter counts
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    model_param_size_mb = sum(p.numel() * p.element_size() for p in model.parameters()) / (1024 * 1024)
    
    print(f"Model Load Time: {load_time_ms:.2f} ms")
    print(f"RAM before load: {ram_before_load:.2f} MB")
    print(f"RAM after load:  {ram_after_load:.2f} MB")
    print(f"RAM delta (load): {ram_delta_load:.2f} MB")
    print(f"Total Parameters: {total_params:,}")
    print(f"Trainable Parameters (frozen in eval): {trainable_params:,}")
    print(f"Parameter Tensor Memory: {model_param_size_mb:.2f} MB")
    
    # Preprocessing
    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    # Create test image
    img = Image.new("RGB", (640, 480), color=(128, 128, 128))
    input_tensor = eval_transform(img).unsqueeze(0)
    
    # Warmup runs
    model.eval()
    with torch.no_grad():
        for _ in range(5):
            _ = model(input_tensor)
            
    # Measure latency over 50 iterations
    latencies = []
    peak_ram = get_ram_mb()
    
    with torch.no_grad():
        for i in range(50):
            t0 = time.perf_counter()
            out = model(input_tensor)
            t1 = time.perf_counter()
            latencies.append((t1 - t0) * 1000)
            cur_ram = get_ram_mb()
            if cur_ram > peak_ram:
                peak_ram = cur_ram
                
    latencies = np.array(latencies)
    mean_lat = np.mean(latencies)
    median_lat = np.median(latencies)
    p90_lat = np.percentile(latencies, 90)
    p95_lat = np.percentile(latencies, 95)
    min_lat = np.min(latencies)
    max_lat = np.max(latencies)
    
    print(f"\nLatency Benchmark (50 runs on CPU):")
    print(f"  Mean:   {mean_lat:.2f} ms")
    print(f"  Median: {median_lat:.2f} ms")
    print(f"  P90:    {p90_lat:.2f} ms")
    print(f"  P95:    {p95_lat:.2f} ms")
    print(f"  Min:    {min_lat:.2f} ms")
    print(f"  Max:    {max_lat:.2f} ms")
    print(f"Peak RAM during inference: {peak_ram:.2f} MB")
    print(f"Inference RAM overhead:    {(peak_ram - ram_after_load):.2f} MB")
    
    return {
        "model_name": model_name,
        "file_size_bytes": file_size_bytes,
        "file_size_mb": round(file_size_mb, 2),
        "total_params": total_params,
        "model_param_size_mb": round(model_param_size_mb, 2),
        "load_time_ms": round(load_time_ms, 2),
        "ram_before_load_mb": round(ram_before_load, 2),
        "ram_after_load_mb": round(ram_after_load, 2),
        "ram_delta_load_mb": round(ram_delta_load, 2),
        "peak_ram_mb": round(peak_ram, 2),
        "inference_ram_overhead_mb": round(peak_ram - ram_after_load, 2),
        "latency_mean_ms": round(mean_lat, 2),
        "latency_median_ms": round(median_lat, 2),
        "latency_p90_ms": round(p90_lat, 2),
        "latency_p95_ms": round(p95_lat, 2),
        "latency_min_ms": round(min_lat, 2),
        "latency_max_ms": round(max_lat, 2),
    }

def main():
    root = Path(__file__).resolve().parent.parent
    eff_weights = root / "backend" / "app" / "ml" / "weights" / "best_model.pt"
    
    # 1. Profile EfficientNetV2-S
    def load_efficientnet():
        model = models.efficientnet_v2_s(weights=None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, 5)
        ckpt = torch.load(eff_weights, map_location="cpu", weights_only=False)
        sd = ckpt["model_state_dict"] if isinstance(ckpt, dict) and "model_state_dict" in ckpt else ckpt
        model.load_state_dict(sd)
        model.eval()
        for p in model.parameters():
            p.requires_grad = False
        return model

    eff_metrics = profile_model("EfficientNetV2-S (Baseline)", load_efficientnet, eff_weights)
    
    # Clean memory between runs
    gc.collect()
    
    # 2. Extract and Profile ResNet18 + BiLSTM + Attention
    zip_path = root / "ResNet18_BiLSTM_Attention_TP100_Results.zip"
    z = zipfile.ZipFile(zip_path)
    temp_ckpt_dir = root / "backend" / "app" / "ml" / "weights"
    ckpt_target = temp_ckpt_dir / "best_resnet18_bilstm_attention.pt"
    
    if not ckpt_target.exists():
        with open(ckpt_target, "wb") as f:
            f.write(z.read("ResNet18_BiLSTM_Attention_TP100/checkpoints/best_resnet18_bilstm_attention.pt"))
            
    def load_resnet_bilstm():
        model = ResNet18BiLSTMAdditiveAttention(num_classes=5, lstm_hidden_size=256, dropout=0.3)
        ckpt = torch.load(ckpt_target, map_location="cpu", weights_only=False)
        sd = ckpt["model_state_dict"] if isinstance(ckpt, dict) and "model_state_dict" in ckpt else ckpt
        model.load_state_dict(sd, strict=True)
        model.eval()
        for p in model.parameters():
            p.requires_grad = False
        return model

    resnet_metrics = profile_model("ResNet18 + BiLSTM + Additive Attention (Proposed)", load_resnet_bilstm, ckpt_target)
    
    print("\n" + "="*80)
    print("COMPARISON SUMMARY TABLE")
    print("="*80)
    header = f"{'Metric':<35} | {'EfficientNetV2-S':<18} | {'ResNet18+BiLSTM+Attn':<20} | {'Delta / Improvement':<20}"
    print(header)
    print("-" * len(header))
    
    comparisons = [
        ("Checkpoint File Size (MB)", eff_metrics["file_size_mb"], resnet_metrics["file_size_mb"], 
         f"{(resnet_metrics['file_size_mb'] - eff_metrics['file_size_mb']):+.2f} MB ({((resnet_metrics['file_size_mb']/eff_metrics['file_size_mb'])-1)*100:+.1f}%)"),
        ("Total Parameters", f"{eff_metrics['total_params']:,}", f"{resnet_metrics['total_params']:,}",
         f"{(resnet_metrics['total_params'] - eff_metrics['total_params']):,d} ({((resnet_metrics['total_params']/eff_metrics['total_params'])-1)*100:+.1f}%)"),
        ("Param Tensor Size (MB)", eff_metrics["model_param_size_mb"], resnet_metrics["model_param_size_mb"],
         f"{(resnet_metrics['model_param_size_mb'] - eff_metrics['model_param_size_mb']):+.2f} MB ({((resnet_metrics['model_param_size_mb']/eff_metrics['model_param_size_mb'])-1)*100:+.1f}%)"),
        ("Model Load Time (ms)", eff_metrics["load_time_ms"], resnet_metrics["load_time_ms"],
         f"{(resnet_metrics['load_time_ms'] - eff_metrics['load_time_ms']):+.2f} ms"),
        ("RAM Delta on Load (MB)", eff_metrics["ram_delta_load_mb"], resnet_metrics["ram_delta_load_mb"],
         f"{(resnet_metrics['ram_delta_load_mb'] - eff_metrics['ram_delta_load_mb']):+.2f} MB"),
        ("Peak Process RAM (MB)", eff_metrics["peak_ram_mb"], resnet_metrics["peak_ram_mb"],
         f"{(resnet_metrics['peak_ram_mb'] - eff_metrics['peak_ram_mb']):+.2f} MB"),
        ("CPU Latency Mean (ms)", eff_metrics["latency_mean_ms"], resnet_metrics["latency_mean_ms"],
         f"{(resnet_metrics['latency_mean_ms'] - eff_metrics['latency_mean_ms']):+.2f} ms ({((resnet_metrics['latency_mean_ms']/eff_metrics['latency_mean_ms'])-1)*100:+.1f}%)"),
        ("CPU Latency Median (ms)", eff_metrics["latency_median_ms"], resnet_metrics["latency_median_ms"],
         f"{(resnet_metrics['latency_median_ms'] - eff_metrics['latency_median_ms']):+.2f} ms"),
        ("CPU Latency P95 (ms)", eff_metrics["latency_p95_ms"], resnet_metrics["latency_p95_ms"],
         f"{(resnet_metrics['latency_p95_ms'] - eff_metrics['latency_p95_ms']):+.2f} ms"),
    ]
    
    for label, v1, v2, diff in comparisons:
        print(f"{label:<35} | {str(v1):<18} | {str(v2):<20} | {diff:<20}")
    print("="*80)

if __name__ == "__main__":
    main()
