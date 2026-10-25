import React from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Eye,
  FileText,
  Layers,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { CategoryBadge } from "../common/CategoryBadge";
import { StatusBadge } from "../common/StatusBadge";
import { AIPrediction, CivicCategory, ComplaintStatus } from "../../types";

interface AIClassificationAnalysisProps {
  prediction?: AIPrediction | null;
  complaintStatus?: ComplaintStatus;
  departmentName?: string | null;
  departmentCode?: string | null;
  className?: string;
  isCompact?: boolean;
}

export const AIClassificationAnalysis: React.FC<AIClassificationAnalysisProps> = ({
  prediction,
  complaintStatus,
  departmentName,
  departmentCode,
  className = "",
  isCompact = false,
}) => {
  if (!prediction) {
    return (
      <div className={`bg-slate-50 border border-slate-200 rounded-md p-4 text-xs text-slate-500 text-center ${className}`}>
        <Brain className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
        <p className="font-semibold text-slate-700">AI Diagnostic Data Pending</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Automated inference records are not attached to this ticket.</p>
      </div>
    );
  }

  const {
    model_name,
    model_version,
    predicted_category,
    confidence_score,
    all_probabilities,
    suggested_department_code,
    processing_status,
  } = prediction;

  const probs = all_probabilities || {};
  const fusedProbs: Record<string, number> = probs.fused || {};
  const visionProbs: Record<string, number> = probs.vision || {};
  const nlpProbs: Record<string, number> = probs.nlp || {};
  const fusionDetails = probs.fusion_details || {};
  const disagreementDetected = probs.disagreement_detected || fusionDetails.mode === "STRONG_DISAGREEMENT";

  // Modality category & confidence values
  const visionCategory = fusionDetails.vision_category || (Object.keys(visionProbs).length > 0
    ? Object.keys(visionProbs).reduce((a, b) => (visionProbs[a] > visionProbs[b] ? a : b))
    : null);
  const visionConf = fusionDetails.vision_confidence ?? (visionCategory ? visionProbs[visionCategory] : null);

  const nlpCategory = fusionDetails.nlp_category || (Object.keys(nlpProbs).length > 0
    ? Object.keys(nlpProbs).reduce((a, b) => (nlpProbs[a] > nlpProbs[b] ? a : b))
    : null);
  const nlpConf = fusionDetails.nlp_confidence ?? (nlpCategory ? nlpProbs[nlpCategory] : null);

  const matchedTerms: string[] = fusionDetails.matched_terms || [];
  const weights = fusionDetails.weights;
  const isUnderReview = complaintStatus === "UNDER_REVIEW" || disagreementDetected || processing_status === "DISAGREEMENT_REVIEW";

  // Classification Mode calculation
  const getClassificationMode = () => {
    if (fusionDetails.mode === "AGREEMENT") {
      return { label: "Dual-Modality Corroboration (Vision + NLP)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    }
    if (fusionDetails.mode === "STRONG_DISAGREEMENT" || disagreementDetected) {
      return { label: "Disagreement Detected (Review Held)", color: "text-amber-800 bg-amber-50 border-amber-300" };
    }
    if (fusionDetails.mode === "WEAK_TEXT_DISAGREEMENT" || fusionDetails.mode === "VISION_ONLY") {
      return { label: "Vision-Dominant Inference", color: "text-blue-700 bg-blue-50 border-blue-200" };
    }
    if (fusionDetails.mode === "TEXT_ONLY") {
      return { label: "Text-Dominant Inference", color: "text-purple-700 bg-purple-50 border-purple-200" };
    }
    return { label: "Multimodal Evidential Fusion", color: "text-slate-700 bg-slate-100 border-slate-200" };
  };

  const modeBadge = getClassificationMode();

  return (
    <div className={`bg-white rounded-md border border-slate-200 shadow-panel overflow-hidden ${className}`}>
      {/* Component Header with System Identity */}
      <div className="bg-gradient-to-r from-gov-navy to-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
            <Cpu className="w-5 h-5 text-blue-300" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded border border-blue-400/30">
                AI Transparency & Academic Evaluation
              </span>
              <span className="text-[10px] text-slate-300 font-mono hidden sm:inline">{model_version}</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5">
              Multimodal Grievance Classification & Routing Analysis
            </h2>
          </div>
        </div>

        <div className="self-start sm:self-auto">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border ${modeBadge.color}`}>
            <Sparkles className="w-3 h-3" />
            <span>{modeBadge.label}</span>
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Section 1: Hybrid Fused Model Decision Card */}
        <div className="bg-slate-50 rounded-md border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Primary Fused Category
              </span>
              <div className="mt-1 flex items-center gap-2.5">
                <CategoryBadge category={predicted_category as CivicCategory} />
                <span className="text-xs text-slate-600 font-medium">
                  Overall Confidence: <strong className="text-slate-900">{(confidence_score * 100).toFixed(1)}%</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Status:</span>
              {complaintStatus && <StatusBadge status={complaintStatus} />}
            </div>
          </div>

          {/* Visual Confidence Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Multimodal Confidence Score</span>
              <span className={confidence_score >= 0.8 ? "text-emerald-700" : "text-amber-700"}>
                {(confidence_score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  confidence_score >= 0.8 ? "bg-emerald-600" : confidence_score >= 0.6 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, confidence_score * 100))}%` }}
              />
            </div>
          </div>

          {/* Policy Decision Notice: Direct Routing vs Review Queue */}
          {isUnderReview ? (
            <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold text-amber-950">Manual Verification Required — Held in Review Queue</p>
                <p className="mt-0.5 text-amber-900 leading-relaxed">
                  {fusionDetails.reason ||
                    "A divergence was detected between the photographic evidence and the citizen grievance text, or confidence score was below municipal dispatch threshold. Automatic department assignment has been held unassigned until a supervisor reviews the evidence."}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold text-emerald-950">Direct Automated Dispatch — Verified Corroboration</p>
                <p className="mt-0.5 text-emerald-900 leading-relaxed">
                  Visual detection and natural language processing mutually corroborated this defect category. Automated assignment dispatched directly to {departmentName || suggested_department_code || "the municipal department"}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Individual Modalities Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Modality A: Visual Classifier */}
          <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3 shadow-subtle">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Vision-Based Classifier</h3>
                  <span className="text-[10px] text-slate-500 font-mono">ResNet18 + BiLSTM + Attention</span>
                </div>
              </div>
              {weights && (
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Weight: {Math.round(weights.vision * 100)}%
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Visual Prediction:</span>
                {visionCategory ? (
                  <CategoryBadge category={visionCategory as CivicCategory} />
                ) : (
                  <span className="text-slate-400 italic">Not processed</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Confidence:</span>
                <span className="font-bold text-slate-900">
                  {visionConf !== null ? `${(visionConf * 100).toFixed(1)}%` : "N/A"}
                </span>
              </div>

              {/* Vision Probability Vector Bar Breakdown */}
              {Object.keys(visionProbs).length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Visual Class Probabilities
                  </span>
                  {Object.entries(visionProbs)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cls, prob]) => (
                      <div key={cls} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-medium text-slate-700">{cls}</span>
                          <span className="font-mono text-slate-500">{(prob * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cls === visionCategory ? "bg-blue-600" : "bg-slate-300"}`}
                            style={{ width: `${Math.min(100, Math.max(0, prob * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Modality B: NLP Text Classifier */}
          <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3 shadow-subtle">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Text-Based Classifier (NLP)</h3>
                  <span className="text-[10px] text-slate-500 font-mono">TF-IDF + Logistic Regression</span>
                </div>
              </div>
              {weights && (
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Weight: {Math.round(weights.nlp * 100)}%
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Text Prediction:</span>
                {nlpCategory ? (
                  <CategoryBadge category={nlpCategory as CivicCategory} />
                ) : (
                  <span className="text-slate-400 italic">Not processed</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Confidence:</span>
                <span className="font-bold text-slate-900">
                  {nlpConf !== null ? `${(nlpConf * 100).toFixed(1)}%` : "N/A"}
                </span>
              </div>

              {/* Matched Domain Vocabulary Terms */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Extracted Civic Keywords
                </span>
                {matchedTerms.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {matchedTerms.map((term) => (
                      <span
                        key={term}
                        className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono text-[11px]"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    No high-confidence domain terms detected (brief/colloquial text). Text weight lowered to protect photographic precision.
                  </p>
                )}
              </div>

              {/* NLP Probability Vector Bar Breakdown */}
              {Object.keys(nlpProbs).length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    NLP Class Probabilities
                  </span>
                  {Object.entries(nlpProbs)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cls, prob]) => (
                      <div key={cls} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-medium text-slate-700">{cls}</span>
                          <span className="font-mono text-slate-500">{(prob * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cls === nlpCategory ? "bg-indigo-600" : "bg-slate-300"}`}
                            style={{ width: `${Math.min(100, Math.max(0, prob * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Municipal Department Routing Decision */}
        <div className="bg-slate-50 rounded-md border border-slate-200 p-4 text-xs space-y-2">
          <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
            Municipal Routing Resolution
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Suggested Department</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {suggested_department_code || "UNASSIGNED"}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Target Department</span>
              <span className="font-bold text-blue-700 block mt-0.5 truncate">
                {isUnderReview ? "Review Queue (Unassigned)" : departmentName || suggested_department_code || "Assigned"}
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Architecture / Model</span>
              <span className="font-bold text-slate-900 block mt-0.5 truncate" title={model_name}>
                {model_name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
