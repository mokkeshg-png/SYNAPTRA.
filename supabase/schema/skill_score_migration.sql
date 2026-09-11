-- =============================================================================
-- SYNAPTRA — AI Skill Score Engine Migration
-- student_skill_scores table
-- Run this migration AFTER the main schema.sql has been applied.
-- =============================================================================

-- ============================================================
-- 1. NEW ENUM for ai_analysis_type extension
-- NOTE: PostgreSQL does not support adding a value to an enum
-- inside a transaction block in older versions. Run this
-- migration outside a transaction or on Supabase SQL editor.
-- ============================================================

-- Add 'skill_score' to the existing ai_analysis_type enum
-- (safe if already added — will fail silently on re-run, wrap in DO block)
DO $$
BEGIN
    -- Only add if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'ai_analysis_type'::regtype
        AND enumlabel = 'skill_score'
    ) THEN
        ALTER TYPE ai_analysis_type ADD VALUE 'skill_score';
    END IF;
END$$;

-- ============================================================
-- 2. ADD resume_url COLUMN TO profiles
-- resume_url was defined in the TypeScript Profile type and used in the UI
-- but was never added to the database schema. This migration adds it safely.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;

COMMENT ON COLUMN profiles.resume_url IS
    'Optional URL to the user''s resume or CV (PDF, Google Drive, etc.).
     Used as a soft external evidence signal in the AI Skill Score Engine.';

-- ============================================================
-- 3. STUDENT SKILL SCORES TABLE
-- Stores per-user AI skill score analysis results.
-- One row per analysis run; history is preserved.
-- RLS: students can only read their own scores.
-- ============================================================

CREATE TABLE IF NOT EXISTS student_skill_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Overall score: validated 0–100
    overall_score   INTEGER NOT NULL
                        CHECK (overall_score >= 0 AND overall_score <= 100),

    -- Category-level breakdown stored as JSONB for flexibility
    -- Shape: { skillEvidence, projectEvidence, githubEvidence,
    --          experienceEvidence, certificationEvidence,
    --          consistencyScore, publicationBonus }
    breakdown       JSONB NOT NULL DEFAULT '{}',

    -- Per-skill evidence array stored as JSONB
    -- Shape: [{ skill, claimedLevel, confidenceScore, status,
    --           supportingEvidence[], gapNote? }]
    skill_evidence  JSONB NOT NULL DEFAULT '[]',

    -- Narrative arrays
    strengths       JSONB NOT NULL DEFAULT '[]',
    improvement_areas JSONB NOT NULL DEFAULT '[]',

    -- Narrative summary paragraph
    summary         TEXT NOT NULL DEFAULT '',

    -- AI confidence: high | medium | low
    confidence      ai_confidence NOT NULL DEFAULT 'low',

    -- Engine/model version string for reproducibility tracking
    model_version   TEXT NOT NULL DEFAULT 'skill-engine-v1',

    -- Analysis status
    status          TEXT NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('pending', 'completed', 'failed')),

    -- When the analysis was performed (may differ from created_at if async)
    analyzed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE student_skill_scores IS
    'AI-generated skill score analyses per student profile. Each row is a
     point-in-time snapshot. Latest row per profile_id is the current score.
     AI estimates only — not certified assessments.';

COMMENT ON COLUMN student_skill_scores.overall_score IS
    'Validated integer 0–100. Composite of breakdown sub-scores.';

COMMENT ON COLUMN student_skill_scores.breakdown IS
    'JSONB breakdown by evidence category. See SkillScoreBreakdown TS type.';

COMMENT ON COLUMN student_skill_scores.skill_evidence IS
    'JSONB array of per-skill confidence scores. See SkillEvidenceItem TS type.';

COMMENT ON COLUMN student_skill_scores.model_version IS
    'Identifies which scoring engine version produced this result.
     Used for cache invalidation and reproducibility.';

-- ============================================================
-- 4. INDEXES
-- ============================================================

-- Fast lookup of the latest score for a given student
CREATE INDEX IF NOT EXISTS idx_skill_scores_profile_analyzed
    ON student_skill_scores (profile_id, analyzed_at DESC);

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE student_skill_scores ENABLE ROW LEVEL SECURITY;

-- Students can read only their own scores
CREATE POLICY "skill_scores_select_own"
    ON student_skill_scores
    FOR SELECT
    USING (profile_id = auth.uid());

-- Students can insert only their own score rows
CREATE POLICY "skill_scores_insert_own"
    ON student_skill_scores
    FOR INSERT
    WITH CHECK (profile_id = auth.uid());

-- Students cannot update or delete historical score rows
-- (immutable history — new analysis creates a new row)

-- Admins can read all scores (for moderation)
CREATE POLICY "skill_scores_admin_select"
    ON student_skill_scores
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- 6. HELPER VIEW: latest score per student
-- ============================================================

CREATE OR REPLACE VIEW student_latest_skill_score AS
SELECT DISTINCT ON (profile_id)
    id,
    profile_id,
    overall_score,
    breakdown,
    skill_evidence,
    strengths,
    improvement_areas,
    summary,
    confidence,
    model_version,
    status,
    analyzed_at,
    created_at
FROM student_skill_scores
WHERE status = 'completed'
ORDER BY profile_id, analyzed_at DESC;

COMMENT ON VIEW student_latest_skill_score IS
    'Convenience view: returns the most recent completed skill score per student.';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
