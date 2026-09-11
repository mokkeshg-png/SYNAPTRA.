/**
 * SkillScorePanel.tsx
 *
 * AI Student Skill Intelligence & Score Engine — UI component.
 *
 * ISOLATION:
 *   This component is completely independent of AiAssistant.tsx and
 *   CompatibilityPanel.tsx. It does not import from, share state with,
 *   or affect any chatbot component.
 *
 * USAGE:
 *   Only rendered on the student's own profile (isSelf === true).
 *   Receives userId and profile from the Profile page.
 *
 * DESIGN:
 *   Follows the existing Synaptra design system:
 *   - Card / Badge / Progress primitives from @/components/ui/Card
 *   - Tailwind tokens: navy, brass, ink, paper, emerald, amber, red
 *   - font-serif headings, text-xs body copy
 */

import { useState } from "react";
import type { Profile, SkillEvidenceStatus } from "@/types";
import { SKILL_SCORE_DISCLAIMER } from "@/types";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSkillScore } from "@/hooks/useSkillScore";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Loader2,
  Clock,
  ArrowRight,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SkillScorePanelProps {
  userId: string;
  profile: Profile;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Circular score ring — pure SVG, no external deps */
function ScoreRing({
  score,
  size = 96,
  strokeWidth = 8,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const color =
    score >= 75 ? "#059669" : // emerald-600
    score >= 50 ? "#2563EB" : // blue-600 (navy-ish)
    score >= 30 ? "#D97706" : // amber-600
    "#DC2626";                // red-600

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Score text */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.22}
        fontWeight="700"
        fill="#0f172a"
        fontFamily="'Source Serif 4', Georgia, serif"
      >
        {score}
      </text>
      <text
        x="50%"
        y="50%"
        dy={size * 0.16}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.12}
        fill="#64748b"
      >
        / 100
      </text>
    </svg>
  );
}

/** Badge for evidence status */
function EvidenceStatusBadge({ status }: { status: SkillEvidenceStatus }) {
  if (status === "SUPPORTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        SUPPORTED
      </span>
    );
  }
  if (status === "PARTIALLY_SUPPORTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
        <AlertTriangle className="h-3 w-3" />
        PARTIALLY SUPPORTED
      </span>
    );
  }
  if (status === "UNVERIFIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
        <HelpCircle className="h-3 w-3" />
        UNVERIFIED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
      <XCircle className="h-3 w-3" />
      INSUFFICIENT EVIDENCE
    </span>
  );
}

/** Bar color for per-skill confidence */
function confidenceBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-400";
}

/** Score change chip */
function ScoreChangePill({
  previous,
  current,
}: {
  previous: number;
  current: number;
}) {
  const delta = current - previous;
  if (Math.abs(delta) < 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
        <Minus className="h-3 w-3" /> No change
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <TrendingUp className="h-3 w-3" /> +{delta} pts
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
      <TrendingDown className="h-3 w-3" /> {delta} pts
    </span>
  );
}

// ---------------------------------------------------------------------------
// Score section row helpers
// ---------------------------------------------------------------------------

const BREAKDOWN_LABELS: Record<string, { label: string; max: number }> = {
  skillEvidence:        { label: "Skill Evidence",         max: 20 },
  projectEvidence:      { label: "Project Evidence",       max: 25 },
  githubEvidence:       { label: "GitHub / External",      max: 20 },
  experienceEvidence:   { label: "Experience Evidence",    max: 15 },
  certificationEvidence:{ label: "Certification Evidence", max: 10 },
  consistencyScore:     { label: "Consistency",            max: 5  },
  publicationBonus:     { label: "Publication Bonus",      max: 5  },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SkillScorePanel({ userId, profile }: SkillScorePanelProps) {
  const {
    currentScore,
    previousScore,
    history,
    scoreChangeSummary,
    status,
    error,
    runAnalysis,
    isAnalyzing,
    isLoading,
  } = useSkillScore(userId, profile);

  // Local UI state for collapsible sections
  const [showSkillCards, setShowSkillCards] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showImprovements, setShowImprovements] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // ── Idle / no score yet ─────────────────────────────────────────────────
  if (status === "idle" || (!currentScore && !isLoading && !isAnalyzing)) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-ink-100 pb-3">
          <Brain className="h-5 w-5 text-brass" />
          <div>
            <h3 className="font-serif text-lg font-bold text-ink">
              AI Skill Score
            </h3>
            <p className="text-[11px] text-ink-400 mt-0.5">
              Evidence-based profile intelligence
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-brass-300 bg-brass-50/30 px-5 py-6 text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brass-100 text-brass">
              <Brain className="h-7 w-7" />
            </div>
          </div>
          <div>
            <p className="font-serif text-base font-semibold text-ink">
              No analysis yet
            </p>
            <p className="mt-1 text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">
              Run your first AI skill analysis to get a personalized evidence
              score based on your projects, certifications, GitHub, and more.
            </p>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="mt-1"
          >
            <Brain className="h-4 w-4 mr-1.5" />
            Analyze My Profile
          </Button>
        </div>

        <p className="text-[10px] text-ink-400 leading-relaxed text-center px-2">
          {SKILL_SCORE_DISCLAIMER}
        </p>
      </Card>
    );
  }

  // ── Loading persisted score ─────────────────────────────────────────────
  if (isLoading && !currentScore) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 border-b border-ink-100 pb-3 mb-4">
          <Brain className="h-5 w-5 text-brass" />
          <h3 className="font-serif text-lg font-bold text-ink">AI Skill Score</h3>
        </div>
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin text-navy" />
          Loading your skill analysis…
        </div>
      </Card>
    );
  }

  // ── Analyzing in progress ───────────────────────────────────────────────
  if (isAnalyzing && !currentScore) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 border-b border-ink-100 pb-3 mb-4">
          <Brain className="h-5 w-5 text-brass animate-pulse" />
          <h3 className="font-serif text-lg font-bold text-ink">AI Skill Score</h3>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
          <p className="font-serif text-base font-semibold text-ink">
            Analyzing your profile…
          </p>
          <p className="text-xs text-ink-500 max-w-xs leading-relaxed">
            Evaluating skills, projects, certifications, GitHub evidence,
            and consistency across all sources.
          </p>
        </div>
      </Card>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (status === "error" && !currentScore) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-ink-100 pb-3">
          <Brain className="h-5 w-5 text-brass" />
          <h3 className="font-serif text-lg font-bold text-ink">AI Skill Score</h3>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800 space-y-2">
          <p className="font-medium">Analysis failed</p>
          <p className="text-xs">{error ?? "An unexpected error occurred. Please try again."}</p>
        </div>
        <Button onClick={runAnalysis} variant="outline" size="sm">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry Analysis
        </Button>
      </Card>
    );
  }

  // ── Result view ─────────────────────────────────────────────────────────
  if (!currentScore) return null;

  const score = currentScore.overallScore;
  const scoreLabel =
    score >= 80 ? "Strong" :
    score >= 60 ? "Solid" :
    score >= 40 ? "Developing" :
    "Early Stage";

  const scoreTone =
    score >= 75 ? "green" :
    score >= 50 ? "navy" :
    score >= 30 ? "amber" :
    "red";

  return (
    <Card className="p-6 space-y-5">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-brass shrink-0" />
          <div>
            <h3 className="font-serif text-lg font-bold text-ink leading-tight">
              AI Skill Score
            </h3>
            <p className="text-[11px] text-ink-400 mt-0.5">
              Evidence-based profile intelligence
            </p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          title="Re-analyze profile"
          className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-paper px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
          aria-label="Re-analyze my profile"
        >
          {isAnalyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {isAnalyzing ? "Analyzing…" : "Re-analyze"}
        </button>
      </div>

      {/* ── Score + confidence ───────────────────────────────────────── */}
      <div className="flex items-center gap-5">
        <ScoreRing score={score} size={96} />
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-2xl font-bold text-ink">
              {scoreLabel}
            </span>
            <Badge tone={scoreTone as any}>
              {currentScore.confidence.toUpperCase()} CONFIDENCE
            </Badge>
          </div>

          {/* Score change pill */}
          {previousScore && (
            <div className="flex items-center gap-2 flex-wrap">
              <ScoreChangePill
                previous={previousScore.overallScore}
                current={score}
              />
              <span className="text-[11px] text-ink-400">
                vs. previous {previousScore.overallScore}/100
              </span>
            </div>
          )}

          {/* Last analyzed */}
          <p className="flex items-center gap-1 text-[11px] text-ink-400">
            <Clock className="h-3 w-3 shrink-0" />
            Last analyzed:{" "}
            {new Date(currentScore.analyzedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Score change summary narrative */}
      {scoreChangeSummary && previousScore && (
        <div className="rounded-lg border border-ink-100 bg-paper-50/60 px-3 py-2 text-xs text-ink-600 leading-relaxed flex gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-navy" />
          {scoreChangeSummary}
        </div>
      )}

      {/* ── Category Breakdown (collapsible) ─────────────────────────── */}
      <div className="space-y-2">
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-brass-700 hover:text-brass transition-colors"
          aria-expanded={showBreakdown}
        >
          Score Breakdown
          {showBreakdown ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showBreakdown && (
          <div className="space-y-2.5 pt-1">
            {Object.entries(BREAKDOWN_LABELS).map(([key, { label, max }]) => {
              const val = (currentScore.breakdown as any)[key] ?? 0;
              const pct = Math.round((val / max) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs text-ink-500">
                    <span>{label}</span>
                    <span className="font-semibold text-ink">
                      {val}/{max}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-ink-100"
                    role="progressbar"
                    aria-valuenow={val}
                    aria-valuemin={0}
                    aria-valuemax={max}
                  >
                    <div
                      className="h-full rounded-full bg-navy transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Strengths ────────────────────────────────────────────────── */}
      {currentScore.strengths.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Evidence Strengths
          </p>
          <ul className="space-y-1.5">
            {currentScore.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-ink-600 leading-relaxed">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Improvement Areas (collapsible) ──────────────────────────── */}
      {currentScore.improvementAreas.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowImprovements((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-700 hover:text-amber-600 transition-colors"
            aria-expanded={showImprovements}
          >
            Improvement Areas
            {showImprovements ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showImprovements && (
            <ul className="space-y-1.5 pt-0.5">
              {currentScore.improvementAreas.map((area, i) => (
                <li key={i} className="flex gap-2 text-xs text-ink-600 leading-relaxed">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  {area}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Per-Skill Evidence Cards (collapsible) ───────────────────── */}
      {currentScore.skillEvidence.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowSkillCards((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-navy hover:text-navy-700 transition-colors"
            aria-expanded={showSkillCards}
          >
            Skill Evidence ({currentScore.skillEvidence.length})
            {showSkillCards ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showSkillCards && (
            <div className="space-y-2.5 pt-0.5">
              {currentScore.skillEvidence.map((item) => (
                <div
                  key={item.skill}
                  className="rounded-xl border border-ink-100 bg-paper-50/60 p-3 space-y-2"
                >
                  {/* Skill name + status */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-sm text-ink">{item.skill}</span>
                      <span className="ml-2 text-[11px] text-ink-400 capitalize">
                        ({item.claimedLevel})
                      </span>
                    </div>
                    <EvidenceStatusBadge status={item.status} />
                  </div>

                  {/* Confidence bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-ink-500">
                      <span>Evidence Confidence</span>
                      <span className="font-semibold text-ink">
                        {item.confidenceScore}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-ink-100"
                      role="progressbar"
                      aria-valuenow={item.confidenceScore}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${confidenceBarColor(item.confidenceScore)}`}
                        style={{ width: `${item.confidenceScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Supporting evidence list */}
                  {item.supportingEvidence.length > 0 && (
                    <ul className="space-y-0.5">
                      {item.supportingEvidence.map((ev, i) => (
                        <li
                          key={i}
                          className="flex gap-1.5 text-[11px] text-ink-500 leading-relaxed"
                        >
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          {ev}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Gap note */}
                  {item.gapNote && (
                    <p className="flex gap-1.5 text-[11px] text-amber-700 leading-relaxed italic">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {item.gapNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Summary narrative ────────────────────────────────────────── */}
      {currentScore.summary && (
        <div className="rounded-lg border border-navy-100 bg-navy-50/30 px-3 py-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy">
            Analysis Summary
          </p>
          <p className="text-xs text-ink-600 leading-relaxed">
            {/* Strip the SKILL_SCORE_DISCLAIMER from inline display — shown separately below */}
            {currentScore.summary.replace(SKILL_SCORE_DISCLAIMER, "").trim()}
          </p>
        </div>
      )}

      {/* ── Analysis History (collapsible) ───────────────────────────── */}
      {history.length > 1 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-500 hover:text-ink transition-colors"
            aria-expanded={showHistory}
          >
            Score History ({history.length} runs)
            {showHistory ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showHistory && (
            <div className="space-y-1.5 pt-0.5">
              {history.map((record, idx) => {
                const next = history[idx + 1];
                const delta = next ? record.overallScore - next.overallScore : null;
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border border-ink-100 bg-paper-50 px-3 py-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-ink">
                        {record.overallScore}/100
                      </span>
                      {idx === 0 && (
                        <Badge tone="navy" className="ml-2 text-[9px] py-0">
                          CURRENT
                        </Badge>
                      )}
                      <p className="text-[10px] text-ink-400">
                        {new Date(record.analyzedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {delta !== null && (
                      <span
                        className={`text-xs font-semibold ${
                          delta > 1
                            ? "text-emerald-600"
                            : delta < -1
                            ? "text-red-500"
                            : "text-ink-400"
                        }`}
                      >
                        {delta > 1 ? `+${delta}` : delta < -1 ? `${delta}` : "—"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <p className="rounded-md bg-paper px-3 py-2 text-[10px] text-ink-400 leading-relaxed">
        {SKILL_SCORE_DISCLAIMER}
      </p>
    </Card>
  );
}
