/**
 * useSkillScore.ts
 *
 * React hook for the AI Student Skill Intelligence & Score Engine.
 *
 * RESPONSIBILITIES:
 *   1. On mount (or when userId changes): load the latest persisted score
 *      from student_skill_scores via fetchLatestSkillScore().
 *   2. Expose a runAnalysis() function that:
 *        a. Optionally fetches the live GitHub public repo count.
 *        b. Tries the Edge Function (invokeSkillScoreAnalysis) first.
 *        c. Falls back to client-side scoring (analyzeStudentSkillScore)
 *           + saveSkillScoreLocally() if the Edge Function is unavailable.
 *        d. Updates local state with the new result.
 *        e. Loads the previous score beforehand so a delta can be shown.
 *   3. Track loading / error states for the UI.
 *
 * ISOLATION:
 *   This hook is completely independent of the existing AI Chatbot hooks
 *   (useAI.ts) and does not import from or affect any chatbot code.
 */

import { useState, useEffect, useCallback } from "react";
import type { Profile, SkillScoreRecord } from "@/types";
import {
  fetchLatestSkillScore,
  fetchSkillScoreHistory,
  invokeSkillScoreAnalysis,
  saveSkillScoreLocally,
} from "@/lib/supabase-db";
import {
  analyzeStudentSkillScore,
  describeScoreChange,
} from "@/lib/skillScoreEngine";
import { fetchGithubPublic } from "@/lib/github";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillScoreStatus =
  | "idle"           // Hook just mounted, no fetch started yet
  | "loading"        // Loading latest persisted score from DB
  | "analyzing"      // Analysis in progress (Edge Function or local engine)
  | "success"        // Analysis completed and result is ready
  | "error";         // Something went wrong

export interface UseSkillScoreReturn {
  /** Latest completed skill score record (from DB or fresh analysis) */
  currentScore: SkillScoreRecord | null;

  /** The score record immediately before the last runAnalysis() call */
  previousScore: SkillScoreRecord | null;

  /** Recent analysis history (newest first, up to 5 records) */
  history: SkillScoreRecord[];

  /** Human-readable explanation of the score change since previous */
  scoreChangeSummary: string | null;

  /** Current hook status */
  status: SkillScoreStatus;

  /** Error message if status === 'error' */
  error: string | null;

  /**
   * Run a new skill score analysis.
   * Triggers loading state, calls Edge Function or falls back to local engine,
   * saves result, and updates currentScore + previousScore.
   */
  runAnalysis: () => Promise<void>;

  /** Whether an analysis is currently in progress */
  isAnalyzing: boolean;

  /** Whether the initial DB load is in progress */
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSkillScore(
  userId: string | null | undefined,
  profile: Profile | null | undefined
): UseSkillScoreReturn {
  const [currentScore, setCurrentScore] = useState<SkillScoreRecord | null>(null);
  const [previousScore, setPreviousScore] = useState<SkillScoreRecord | null>(null);
  const [history, setHistory] = useState<SkillScoreRecord[]>([]);
  const [scoreChangeSummary, setScoreChangeSummary] = useState<string | null>(null);
  const [status, setStatus] = useState<SkillScoreStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // ── Load persisted score on mount / when userId changes ─────────────────
  useEffect(() => {
    if (!userId) {
      setCurrentScore(null);
      setHistory([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;

    async function loadPersistedScore() {
      setStatus("loading");
      setError(null);

      try {
        const [latest, hist] = await Promise.all([
          fetchLatestSkillScore(userId!),
          fetchSkillScoreHistory(userId!, 5),
        ]);

        if (cancelled) return;

        setCurrentScore(latest);
        setHistory(hist);
        setStatus(latest ? "success" : "idle");
      } catch (err) {
        if (cancelled) return;
        console.error("useSkillScore load error:", err);
        setStatus("error");
        setError("Unable to load your skill score. Please try again.");
      }
    }

    loadPersistedScore();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── runAnalysis ──────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!userId || !profile) {
      setError("Profile not available. Please ensure you are logged in.");
      setStatus("error");
      return;
    }

    setStatus("analyzing");
    setError(null);

    // Snapshot previous score before we overwrite it
    const prev = currentScore;
    setPreviousScore(prev);

    try {
      // ── Step 1: Optionally fetch live GitHub repo count ────────────────
      let githubPublicRepos: number | undefined;
      if (profile.githubUsername) {
        try {
          const ghData = await fetchGithubPublic(profile.githubUsername);
          githubPublicRepos = ghData.public_repos;
        } catch {
          // GitHub fetch failed — continue without it; score is still valid
        }
      }

      // ── Step 2: Try Edge Function first ───────────────────────────────
      let result: SkillScoreRecord | null = await invokeSkillScoreAnalysis(githubPublicRepos);

      // ── Step 3: Fall back to local engine if Edge Function unavailable ─
      if (!result) {
        const localAnalysis = analyzeStudentSkillScore(profile, githubPublicRepos);
        result = await saveSkillScoreLocally(userId, localAnalysis);

        // If DB save also failed, use the in-memory result for this session
        if (!result) {
          result = {
            id: `local-${Date.now()}`,
            profileId: userId,
            overallScore: localAnalysis.overallScore,
            breakdown: localAnalysis.breakdown,
            skillEvidence: localAnalysis.skillEvidence,
            strengths: localAnalysis.strengths,
            improvementAreas: localAnalysis.improvementAreas,
            summary: localAnalysis.summary,
            confidence: localAnalysis.confidence,
            analyzedAt: localAnalysis.analyzedAt,
            modelVersion: localAnalysis.modelVersion,
          };
        }
      }

      // ── Step 4: Compute score change description ────────────────────
      let changeSummary: string | null = null;
      if (prev !== null) {
        changeSummary = describeScoreChange(prev.overallScore, result.overallScore);
      }

      // ── Step 5: Refresh history from DB ─────────────────────────────
      let updatedHistory = history;
      try {
        updatedHistory = await fetchSkillScoreHistory(userId, 5);
      } catch {
        // Non-critical — keep existing history
      }

      setCurrentScore(result);
      setHistory(updatedHistory);
      setScoreChangeSummary(changeSummary);
      setStatus("success");
    } catch (err) {
      console.error("useSkillScore runAnalysis error:", err);
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Analysis failed. Please try again."
      );
    }
  }, [userId, profile, currentScore, history]);

  return {
    currentScore,
    previousScore,
    history,
    scoreChangeSummary,
    status,
    error,
    runAnalysis,
    isAnalyzing: status === "analyzing",
    isLoading: status === "loading",
  };
}
