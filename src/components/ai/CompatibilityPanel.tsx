import { AI_DISCLAIMER, type CompatibilityAnalysis } from "@/types";
import { Badge, Card, Progress } from "@/components/ui/Card";
import { AlertTriangle, Check } from "lucide-react";

export function CompatibilityPanel({ analysis }: { analysis: CompatibilityAnalysis }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">AI compatibility</p>
          <p className="mt-1 font-serif text-3xl text-ink">{analysis.compatibilityScore}%</p>
        </div>
        <Badge tone={analysis.confidence === "high" ? "green" : analysis.confidence === "medium" ? "amber" : "slate"}>
          {analysis.confidence.toUpperCase()} CONFIDENCE
        </Badge>
      </div>
      {[
        ["Skill match", analysis.skillMatch],
        ["Interest match", analysis.interestMatch],
        ["Role match", analysis.roleMatch],
        ["Experience match", analysis.experienceMatch],
      ].map(([label, value]) => (
        <div key={String(label)} className="space-y-1">
          <div className="flex justify-between text-xs text-ink-500">
            <span>{label}</span>
            <span>{value}%</span>
          </div>
          <Progress value={Number(value)} />
        </div>
      ))}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Strengths</p>
          <ul className="space-y-1.5 text-sm text-ink-600">
            {analysis.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Potential gaps</p>
          <ul className="space-y-1.5 text-sm text-ink-600">
            {analysis.gaps.map((s) => (
              <li key={s} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-sm leading-6 text-ink-600">{analysis.reason}</p>
      <p className="rounded-md bg-paper px-3 py-2 text-xs text-ink-500">{analysis.disclaimer || AI_DISCLAIMER}</p>
    </Card>
  );
}
