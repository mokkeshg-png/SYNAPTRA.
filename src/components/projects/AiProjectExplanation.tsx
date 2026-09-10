import { useState } from "react";
import type { AiProjectFitResult } from "@/types";
import { Badge } from "@/components/ui/Card";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AiProjectExplanationProps {
  analysis: AiProjectFitResult;
  defaultExpanded?: boolean;
}

export function AiProjectExplanation({
  analysis,
  defaultExpanded = false,
}: AiProjectExplanationProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const confidenceTone =
    analysis.confidence === "high"
      ? "green"
      : analysis.confidence === "medium"
      ? "amber"
      : "slate";

  const confidenceLabel =
    analysis.confidence === "high"
      ? "High Confidence"
      : analysis.confidence === "medium"
      ? "Medium Confidence"
      : "Low Confidence";

  return (
    <div className="mt-3 rounded-xl border border-navy-100 bg-navy-50/40 p-3.5 text-xs text-ink-700 space-y-3 transition-all">
      {/* Header with match summary and confidence */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-serif font-bold text-navy text-sm">
            <Sparkles className="h-3.5 w-3.5 text-navy" />
            AI Compatibility Analysis
          </span>
          <Badge tone={confidenceTone} className="text-[10px] py-0 px-1.5 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            {confidenceLabel}
          </Badge>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-navy font-semibold hover:underline flex items-center gap-0.5 focus:outline-hidden"
        >
          {expanded ? "Show less" : "View breakdown"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Summary statement */}
      <p className="text-xs text-ink-600 leading-relaxed font-normal">
        {analysis.summary}
      </p>

      {/* Expanded evidence, strengths, gaps, and recommendations */}
      {expanded && (
        <div className="space-y-3.5 pt-2 border-t border-navy-100/70 text-xs">
          {/* Strengths / Why you match */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold text-emerald-800 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Why you match
              </span>
              <ul className="space-y-1 pl-1">
                {analysis.strengths.map((st, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-ink-600">
                    <span className="text-emerald-600 font-bold leading-none">✓</span>
                    <div>
                      <strong className="text-ink-800 font-medium">{st.category}:</strong>{" "}
                      <span>{st.evidence}</span>{" "}
                      {st.impact && <span className="text-ink-400 italic">({st.impact})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps / Areas to improve */}
          {analysis.gaps && analysis.gaps.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold text-amber-800 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Areas to improve / Missing evidence
              </span>
              <ul className="space-y-1 pl-1">
                {analysis.gaps.map((gp, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-ink-600">
                    <span className="text-amber-600 font-bold leading-none">•</span>
                    <div>
                      <strong className="text-ink-800 font-medium">{gp.category}:</strong>{" "}
                      <span>{gp.gap}</span>{" "}
                      {gp.evidence && <span className="text-ink-400 italic">({gp.evidence})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations / Next steps */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold text-navy-800 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <ArrowRight className="h-3.5 w-3.5 text-navy" /> Recommended next steps
              </span>
              <ul className="space-y-1 pl-1">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-ink-600">
                    <span className="text-navy font-bold leading-none">→</span>
                    <div>
                      <strong className="text-ink-800 font-medium">{rec.action}:</strong>{" "}
                      <span>{rec.reason}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
