-- =============================================================================
-- SYNAPTRA — Supabase PostgreSQL Schema
-- AI-Powered Research Collaboration & Intelligent Team Formation Platform
-- =============================================================================
-- This file contains ONLY database structure and security definitions.
-- Application queries and seed data are in supabase/queries/queries.sql.
-- =============================================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. HELPER FUNCTIONS
-- ============================================================

-- Generic trigger function to auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. ENUMS
-- ============================================================

CREATE TYPE platform_role AS ENUM ('student', 'faculty', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE proficiency_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE profile_visibility AS ENUM ('public', 'members', 'institution', 'private');
CREATE TYPE project_visibility AS ENUM ('public', 'private', 'restricted');
CREATE TYPE project_status AS ENUM ('open', 'closed', 'completed', 'flagged', 'removed');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE join_request_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE member_status AS ENUM ('invited', 'active', 'left', 'removed', 'declined');
CREATE TYPE system_role AS ENUM ('owner', 'mentor', 'lead', 'member');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ai_confidence AS ENUM ('high', 'medium', 'low');
CREATE TYPE ai_analysis_type AS ENUM ('compatibility', 'team_recommendation', 'skill_gap', 'project_summary');
CREATE TYPE notification_type AS ENUM (
    'join_request', 'application_accepted', 'application_rejected',
    'project_invitation', 'task_assigned', 'task_deadline',
    'new_team_member', 'project_update', 'ai_recommendation',
    'github_activity', 'mentor_feedback', 'mention',
    'details_request', 'mentorship_request'
);
CREATE TYPE report_type AS ENUM (
    'fake_profile', 'spam', 'harassment', 'misleading_project',
    'inappropriate_content', 'suspicious_activity', 'other'
);
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE moderation_action AS ENUM ('warn', 'suspend', 'remove_content', 'escalate', 'dismiss');
CREATE TYPE note_category AS ENUM ('literature', 'experiment', 'meeting', 'idea');
CREATE TYPE document_access AS ENUM ('project_members', 'role_restricted', 'owner_only', 'mentor_owner');
CREATE TYPE details_request_status AS ENUM ('pending', 'granted', 'denied');
CREATE TYPE mentorship_request_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE discussion_status AS ENUM ('open', 'closed');

-- ============================================================
-- 4. TAXONOMY / REFERENCE TABLES
-- ============================================================

-- Skill categories (e.g., Programming, Machine Learning, Data, Systems, Research, Design, Domain)
CREATE TABLE skill_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE skill_categories IS 'Taxonomy categories grouping related skills.';

-- Individual skills within categories
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES skill_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE skills IS 'Normalized skill taxonomy. Users select skills from this table.';

-- Interest categories (e.g., Computing, Science, Society, Engineering)
CREATE TABLE interest_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE interest_categories IS 'Taxonomy categories grouping related research interests.';

-- Individual research interests within categories
CREATE TABLE research_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES interest_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE research_interests IS 'Normalized research interest taxonomy.';

-- Project types reference table
CREATE TABLE project_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE project_types IS 'Reference table for project type categories (Academic, Research, Hackathon, etc.).';

-- ============================================================
-- 5. USER / PROFILE TABLES
-- ============================================================
-- Authentication is managed by Supabase Auth (auth.users).
-- profiles.id = auth.users.id (1:1 relationship).
-- No custom password storage — Supabase Auth handles credentials.

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role platform_role NOT NULL DEFAULT 'student',
    status account_status NOT NULL DEFAULT 'active',
    full_name TEXT NOT NULL,
    photo_url TEXT,
    institution TEXT NOT NULL,
    department TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    bio TEXT,
    visibility profile_visibility NOT NULL DEFAULT 'public',
    profile_completeness INTEGER NOT NULL DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
    github_username TEXT,
    github_connected BOOLEAN NOT NULL DEFAULT FALSE,
    linkedin_url TEXT,
    portfolio_url TEXT,
    availability_hours INTEGER CHECK (availability_hours >= 0 AND availability_hours <= 168),
    preferred_team_size INTEGER CHECK (preferred_team_size >= 1 AND preferred_team_size <= 50),
    preferred_roles TEXT[] NOT NULL DEFAULT '{}',
    programming_languages TEXT[] NOT NULL DEFAULT '{}',
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE profiles IS 'Public user profile linked 1:1 with auth.users. Contains common fields for all user types.';
COMMENT ON COLUMN profiles.id IS 'Equals auth.users.id — Supabase Auth is the identity source.';
COMMENT ON COLUMN profiles.preferred_roles IS 'Free-text array of preferred project roles (e.g., ML Engineer, Researcher).';
COMMENT ON COLUMN profiles.programming_languages IS 'Free-text array of programming languages.';

-- Student-specific profile extension
CREATE TABLE student_profiles (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    degree_program TEXT,
    academic_year INTEGER CHECK (academic_year >= 1 AND academic_year <= 10),
    graduation_year INTEGER CHECK (graduation_year >= 2000 AND graduation_year <= 2100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE student_profiles IS 'Extension fields for student users.';

-- Faculty-specific profile extension
CREATE TABLE faculty_profiles (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    designation TEXT,
    subjects_taught TEXT[] NOT NULL DEFAULT '{}',
    teaching_areas TEXT[] NOT NULL DEFAULT '{}',
    academic_experience INTEGER CHECK (academic_experience >= 0),
    research_experience INTEGER CHECK (research_experience >= 0),
    research_domains TEXT[] NOT NULL DEFAULT '{}',
    expertise TEXT[] NOT NULL DEFAULT '{}',
    google_scholar TEXT,
    orcid TEXT,
    researchgate TEXT,
    personal_website TEXT,
    open_to_collaboration BOOLEAN NOT NULL DEFAULT TRUE,
    open_to_mentoring BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_project_types TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE faculty_profiles IS 'Extension fields for faculty/mentor users.';

-- ============================================================
-- 6. SKILL / INTEREST RELATIONSHIPS (Normalized many-to-many)
-- ============================================================

-- User skills with proficiency (normalized junction table)
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency proficiency_level NOT NULL DEFAULT 'intermediate',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, skill_id)
);

COMMENT ON TABLE user_skills IS 'Many-to-many: users ↔ skills with proficiency level. Prevents duplicate user/skill combinations.';

-- User research interests (normalized junction table)
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES research_interests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profile_id, interest_id)
);

COMMENT ON TABLE user_interests IS 'Many-to-many: users ↔ research interests. Prevents duplicate user/interest combinations.';

-- User past projects
CREATE TABLE user_past_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER CHECK (year >= 1990 AND year <= 2100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_past_projects IS 'Past academic/research projects listed on a user profile.';

-- User internships
CREATE TABLE user_internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_internships IS 'Internship experience listed on a user profile.';

-- User certifications
CREATE TABLE user_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    year INTEGER CHECK (year >= 1990 AND year <= 2100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_certifications IS 'Academic/professional certifications listed on a user profile.';

-- User publications
CREATE TABLE user_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    venue TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_publications IS 'Academic publications listed on a user profile.';

-- ============================================================
-- 7. GITHUB TABLES
-- ============================================================
-- GitHub OAuth tokens are NEVER stored here.
-- Tokens are managed by Supabase Edge Functions + Vault.
-- Only safe metadata is stored.

CREATE TABLE github_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    github_username TEXT NOT NULL,
    github_user_id TEXT,
    avatar_url TEXT,
    profile_url TEXT,
    public_repos INTEGER DEFAULT 0,
    bio TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE github_connections IS 'GitHub connection metadata. OAuth tokens stored server-side via Edge Functions, NOT here.';

CREATE TABLE github_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,  -- FK added after projects table creation
    github_repo_url TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    repo_owner TEXT NOT NULL,
    description TEXT,
    languages JSONB DEFAULT '{}',
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    open_issues INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    default_branch TEXT DEFAULT 'main',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE github_repositories IS 'Linked GitHub repositories for projects. Synced via Edge Functions.';

CREATE TABLE github_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES github_repositories(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('commit', 'pull_request', 'issue', 'release', 'review')),
    title TEXT NOT NULL,
    description TEXT,
    author TEXT,
    author_github_id TEXT,
    metadata JSONB DEFAULT '{}',
    activity_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE github_activity IS 'GitHub activity feed (commits, PRs, issues) synced via Edge Functions.';

-- ============================================================
-- 8. PROJECT TABLES
-- ============================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (length(title) >= 5),
    short_description TEXT NOT NULL CHECK (length(short_description) >= 20),
    detailed_description TEXT,
    problem_statement TEXT,
    objectives TEXT[] NOT NULL DEFAULT '{}',
    domains TEXT[] NOT NULL DEFAULT '{}',
    interests TEXT[] NOT NULL DEFAULT '{}',
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    team_min INTEGER NOT NULL DEFAULT 2 CHECK (team_min >= 1),
    team_max INTEGER NOT NULL DEFAULT 5 CHECK (team_max >= 1),
    duration TEXT,
    difficulty difficulty_level NOT NULL DEFAULT 'intermediate',
    project_type TEXT NOT NULL,
    visibility project_visibility NOT NULL DEFAULT 'public',
    deadline TIMESTAMPTZ,
    expected_outcomes TEXT,
    mentor_required BOOLEAN NOT NULL DEFAULT FALSE,
    github_required BOOLEAN NOT NULL DEFAULT FALSE,
    github_repo TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    status project_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT projects_team_size_check CHECK (team_max >= team_min)
);

COMMENT ON TABLE projects IS 'Research/academic projects. Owned by a user. Supports discovery, applications, and collaboration.';
COMMENT ON COLUMN projects.project_type IS 'Matches project_types.name (Academic Project, Research Project, etc.).';
COMMENT ON COLUMN projects.domains IS 'Research domains as text array (e.g., AI, Healthcare, Agriculture).';
COMMENT ON COLUMN projects.required_skills IS 'Required skill names as text array.';

-- Add FK from github_repositories to projects (deferred because of creation order)
ALTER TABLE github_repositories
    ADD CONSTRAINT fk_github_repositories_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Project roles (custom or from templates)
CREATE TABLE project_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    openings INTEGER NOT NULL DEFAULT 1 CHECK (openings >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE project_roles IS 'Roles defined by the project owner. Members and applicants are assigned to roles.';

-- ============================================================
-- 9. PROJECT MEMBERSHIP / APPLICATION TABLES
-- ============================================================

-- Project members (owner, mentors, leads, members)
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES project_roles(id) ON DELETE SET NULL,
    system_role system_role NOT NULL DEFAULT 'member',
    status member_status NOT NULL DEFAULT 'invited',
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE project_members IS 'Project team membership. Tracks role, system role, and membership status.';

-- Prevent duplicate active membership (same user, same project, active status)
CREATE UNIQUE INDEX idx_unique_active_member
    ON project_members (project_id, user_id)
    WHERE status = 'active';

-- Join requests / applications
CREATE TABLE join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    selected_role_id UUID REFERENCES project_roles(id) ON DELETE SET NULL,
    motivation TEXT NOT NULL,
    relevant_experience TEXT NOT NULL,
    message TEXT,
    status join_request_status NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    ai_analysis_id UUID,  -- FK added after ai_analyses table creation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE join_requests IS 'Applications to join a project. One per user per project (when not withdrawn).';

-- Enforce one active application per user per project
CREATE UNIQUE INDEX idx_unique_pending_application
    ON join_requests (project_id, applicant_id)
    WHERE status NOT IN ('withdrawn', 'rejected');

-- Project invitations
CREATE TABLE project_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES project_roles(id) ON DELETE SET NULL,
    message TEXT,
    status invitation_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE project_invitations IS 'Invitations sent by project owners to potential collaborators.';

-- Details requests (for restricted-visibility projects)
CREATE TABLE details_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status details_request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, user_id)
);

COMMENT ON TABLE details_requests IS 'Requests for full details on restricted-visibility projects.';

-- Mentorship requests
CREATE TABLE mentorship_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status mentorship_request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mentorship_requests IS 'Faculty mentorship requests for projects.';

-- ============================================================
-- 10. AI TABLES
-- ============================================================

-- AI analyses (compatibility, skill gap, project summary, etc.)
CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type ai_analysis_type NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    input_context JSONB NOT NULL DEFAULT '{}',
    output_result JSONB NOT NULL DEFAULT '{}',
    model_used TEXT,
    confidence ai_confidence,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

COMMENT ON TABLE ai_analyses IS 'Generic store for AI analysis results. Output is validated JSONB. AI recommends, humans decide.';
COMMENT ON COLUMN ai_analyses.input_context IS 'Sanitized input data sent to the AI model (no PII, no tokens).';
COMMENT ON COLUMN ai_analyses.output_result IS 'Validated structured AI output (scores, reasoning, disclaimers).';

-- Add FK from join_requests to ai_analyses (deferred)
ALTER TABLE join_requests
    ADD CONSTRAINT fk_join_requests_ai_analysis
    FOREIGN KEY (ai_analysis_id) REFERENCES ai_analyses(id) ON DELETE SET NULL;

-- Team recommendations (structured team formation results)
CREATE TABLE team_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ai_analysis_id UUID REFERENCES ai_analyses(id) ON DELETE SET NULL,
    recommended_team JSONB NOT NULL DEFAULT '[]',
    role_coverage NUMERIC(5,2) DEFAULT 0 CHECK (role_coverage >= 0 AND role_coverage <= 100),
    skill_coverage NUMERIC(5,2) DEFAULT 0 CHECK (skill_coverage >= 0 AND skill_coverage <= 100),
    skill_duplication TEXT CHECK (skill_duplication IN ('low', 'medium', 'high')),
    gaps TEXT[] NOT NULL DEFAULT '{}',
    alternatives JSONB NOT NULL DEFAULT '[]',
    reasoning TEXT,
    confidence ai_confidence,
    disclaimer TEXT NOT NULL DEFAULT 'This is an AI-estimated recommendation. AI recommends; humans decide.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE team_recommendations IS 'AI-generated team composition recommendations. Final decisions belong to the project owner.';
COMMENT ON COLUMN team_recommendations.recommended_team IS 'JSONB array of {role, candidateId, candidateName, compatibilityScore, reason}.';

-- ============================================================
-- 11. COLLABORATION TABLES (Tasks, Milestones)
-- ============================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    role_id UUID REFERENCES project_roles(id) ON DELETE SET NULL,
    priority task_priority NOT NULL DEFAULT 'medium',
    deadline TIMESTAMPTZ,
    status task_status NOT NULL DEFAULT 'todo',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'Project task management with assignment, priority, and status tracking.';

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE task_comments IS 'Comments on project tasks.';

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE milestones IS 'Project milestones for tracking major deliverables.';

-- ============================================================
-- 12. RESEARCH WORKSPACE TABLES
-- ============================================================

CREATE TABLE research_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category note_category NOT NULL DEFAULT 'idea',
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE research_notes IS 'Research notes organized by category (literature, experiment, meeting, idea).';

CREATE TABLE reference_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
    venue TEXT NOT NULL,
    link TEXT,
    notes TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    added_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reference_items IS 'Academic references and citations for project research.';

CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    objective TEXT NOT NULL,
    method TEXT NOT NULL,
    results TEXT NOT NULL,
    conclusion TEXT NOT NULL,
    experiment_date TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE experiments IS 'Experiment records within the research workspace.';

CREATE TABLE meeting_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    meeting_date TIMESTAMPTZ NOT NULL,
    attendees TEXT[] NOT NULL DEFAULT '{}',
    agenda TEXT NOT NULL,
    decisions TEXT,
    action_items TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE meeting_notes IS 'Meeting notes with attendees, agenda, decisions, and action items.';

CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT,
    size TEXT,
    format TEXT,
    license TEXT,
    link TEXT,
    added_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE datasets IS 'Dataset references for project research.';

-- ============================================================
-- 13. DOCUMENT MANAGEMENT
-- ============================================================
-- Files are stored in Supabase Storage (buckets: avatars, documents).
-- This table stores metadata and storage paths only — no binary data.

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    access document_access NOT NULL DEFAULT 'project_members',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'Document metadata for files stored in Supabase Storage. No binary data in PostgreSQL.';
COMMENT ON COLUMN documents.storage_path IS 'Path within the Supabase Storage "documents" bucket.';

-- ============================================================
-- 14. DISCUSSIONS
-- ============================================================

CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status discussion_status NOT NULL DEFAULT 'open',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE discussions IS 'Discussion threads within project rooms.';

CREATE TABLE discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE discussion_replies IS 'Replies to discussion threads.';

-- ============================================================
-- 15. NOTIFICATION / ACTIVITY TABLES
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '/',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'User notifications. Users can only access their own notifications.';

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE activity_logs IS 'Project activity timeline for tracking actions and changes.';
COMMENT ON COLUMN activity_logs.action IS 'Action type string (e.g., project, member, task, document).';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional structured data about the action (e.g., message, details).';

-- ============================================================
-- 16. ADMIN / MODERATION TABLES
-- ============================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reported_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    type report_type NOT NULL,
    description TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'pending',
    action moderation_action,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reports_target_check CHECK (
        reported_user_id IS NOT NULL OR reported_project_id IS NOT NULL
    )
);

COMMENT ON TABLE reports IS 'User/project reports for moderation. At least one target (user or project) must be specified.';

CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'project', 'report', 'content')),
    target_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_actions IS 'Audit log for administrative operations. All sensitive admin actions are recorded.';

-- ============================================================
-- 17. PLATFORM CONFIGURATION
-- ============================================================

CREATE TABLE platform_configuration (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE platform_configuration IS 'Platform-wide configuration (recommendation weights, feature flags, etc.).';

-- ============================================================
-- 18. RLS HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================
-- These functions bypass RLS to avoid circular policy dependencies.
-- They use SECURITY DEFINER with controlled search_path.

-- Check if a user is an active member of a project
CREATE OR REPLACE FUNCTION is_project_member(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM project_members
        WHERE user_id = p_user_id
        AND project_id = p_project_id
        AND status = 'active'
    );
$$;

-- Check if a user is the owner of a project
CREATE OR REPLACE FUNCTION is_project_owner(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM projects
        WHERE id = p_project_id
        AND owner_id = p_user_id
    );
$$;

-- Get a user's platform role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS platform_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role FROM profiles WHERE id = p_user_id;
$$;

-- Check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'admin'
    );
$$;

-- Check if a user has access to a project (owner OR active member)
CREATE OR REPLACE FUNCTION has_project_access(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT is_project_owner(p_user_id, p_project_id)
        OR is_project_member(p_user_id, p_project_id)
        OR is_admin(p_user_id);
$$;

-- ============================================================
-- 19. INDEXES
-- ============================================================

-- Profile indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_institution ON profiles(institution);
CREATE INDEX idx_profiles_visibility ON profiles(visibility);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Student/Faculty profile indexes
CREATE INDEX idx_student_profiles_graduation_year ON student_profiles(graduation_year);
CREATE INDEX idx_faculty_profiles_open_to_mentoring ON faculty_profiles(open_to_mentoring) WHERE open_to_mentoring = TRUE;

-- User skills/interests indexes
CREATE INDEX idx_user_skills_profile_id ON user_skills(profile_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX idx_user_interests_profile_id ON user_interests(profile_id);
CREATE INDEX idx_user_interests_interest_id ON user_interests(interest_id);

-- Project indexes
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_difficulty ON projects(difficulty);
CREATE INDEX idx_projects_project_type ON projects(project_type);
CREATE INDEX idx_projects_deadline ON projects(deadline);

-- Project role indexes
CREATE INDEX idx_project_roles_project_id ON project_roles(project_id);

-- Project member indexes
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_status ON project_members(status);

-- Join request indexes
CREATE INDEX idx_join_requests_project_id ON join_requests(project_id);
CREATE INDEX idx_join_requests_applicant_id ON join_requests(applicant_id);
CREATE INDEX idx_join_requests_status ON join_requests(status);

-- Invitation indexes
CREATE INDEX idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX idx_project_invitations_invitee_id ON project_invitations(invitee_id);
CREATE INDEX idx_project_invitations_status ON project_invitations(status);

-- Task indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;

-- Activity log indexes
CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- AI analysis indexes
CREATE INDEX idx_ai_analyses_project_id ON ai_analyses(project_id);
CREATE INDEX idx_ai_analyses_user_id ON ai_analyses(user_id);
CREATE INDEX idx_ai_analyses_type ON ai_analyses(type);

-- Research workspace indexes
CREATE INDEX idx_research_notes_project_id ON research_notes(project_id);
CREATE INDEX idx_reference_items_project_id ON reference_items(project_id);
CREATE INDEX idx_experiments_project_id ON experiments(project_id);
CREATE INDEX idx_meeting_notes_project_id ON meeting_notes(project_id);
CREATE INDEX idx_datasets_project_id ON datasets(project_id);

-- Document indexes
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_uploader_id ON documents(uploader_id);

-- Discussion indexes
CREATE INDEX idx_discussions_project_id ON discussions(project_id);
CREATE INDEX idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);

-- GitHub indexes
CREATE INDEX idx_github_connections_profile_id ON github_connections(profile_id);
CREATE INDEX idx_github_repositories_project_id ON github_repositories(project_id);
CREATE INDEX idx_github_activity_repository_id ON github_activity(repository_id);

-- Report indexes
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_reported_project_id ON reports(reported_project_id);

-- Admin action indexes
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);

-- ============================================================
-- 20. TRIGGERS (updated_at automation)
-- ============================================================

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_faculty_profiles_updated_at
    BEFORE UPDATE ON faculty_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_github_connections_updated_at
    BEFORE UPDATE ON github_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_github_repositories_updated_at
    BEFORE UPDATE ON github_repositories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_project_roles_updated_at
    BEFORE UPDATE ON project_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_project_members_updated_at
    BEFORE UPDATE ON project_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_join_requests_updated_at
    BEFORE UPDATE ON join_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_project_invitations_updated_at
    BEFORE UPDATE ON project_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_details_requests_updated_at
    BEFORE UPDATE ON details_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_mentorship_requests_updated_at
    BEFORE UPDATE ON mentorship_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_milestones_updated_at
    BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_research_notes_updated_at
    BEFORE UPDATE ON research_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_discussions_updated_at
    BEFORE UPDATE ON discussions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_platform_configuration_updated_at
    BEFORE UPDATE ON platform_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 21. ROW LEVEL SECURITY — ENABLE
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_past_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE details_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_configuration ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 22. ROW LEVEL SECURITY — POLICIES
-- ============================================================

-- -------------------------------------------------------
-- TAXONOMY TABLES (public read, admin write)
-- -------------------------------------------------------

-- skill_categories
CREATE POLICY "Anyone can view skill categories"
    ON skill_categories FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage skill categories"
    ON skill_categories FOR ALL
    USING (is_admin(auth.uid()));

-- skills
CREATE POLICY "Anyone can view skills"
    ON skills FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can add custom skills"
    ON skills FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage skills"
    ON skills FOR ALL
    USING (is_admin(auth.uid()));

-- interest_categories
CREATE POLICY "Anyone can view interest categories"
    ON interest_categories FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage interest categories"
    ON interest_categories FOR ALL
    USING (is_admin(auth.uid()));

-- research_interests
CREATE POLICY "Anyone can view research interests"
    ON research_interests FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can add custom interests"
    ON research_interests FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage research interests"
    ON research_interests FOR ALL
    USING (is_admin(auth.uid()));

-- project_types
CREATE POLICY "Anyone can view project types"
    ON project_types FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage project types"
    ON project_types FOR ALL
    USING (is_admin(auth.uid()));

-- -------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------

-- Users can view non-private profiles, their own profile, or admins see all
CREATE POLICY "View accessible profiles"
    ON profiles FOR SELECT
    USING (
        visibility != 'private'
        OR id = auth.uid()
        OR is_admin(auth.uid())
    );

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can delete own profile"
    ON profiles FOR DELETE
    USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
    ON profiles FOR ALL
    USING (is_admin(auth.uid()));

-- -------------------------------------------------------
-- STUDENT PROFILES
-- -------------------------------------------------------

CREATE POLICY "View student profiles if parent profile visible"
    ON student_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = student_profiles.profile_id
            AND (p.visibility != 'private' OR p.id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users manage own student profile"
    ON student_profiles FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users update own student profile"
    ON student_profiles FOR UPDATE
    USING (profile_id = auth.uid());

CREATE POLICY "Users delete own student profile"
    ON student_profiles FOR DELETE
    USING (profile_id = auth.uid());

-- -------------------------------------------------------
-- FACULTY PROFILES
-- -------------------------------------------------------

CREATE POLICY "View faculty profiles if parent profile visible"
    ON faculty_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = faculty_profiles.profile_id
            AND (p.visibility != 'private' OR p.id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users manage own faculty profile"
    ON faculty_profiles FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users update own faculty profile"
    ON faculty_profiles FOR UPDATE
    USING (profile_id = auth.uid());

CREATE POLICY "Users delete own faculty profile"
    ON faculty_profiles FOR DELETE
    USING (profile_id = auth.uid());

-- -------------------------------------------------------
-- USER SKILLS (follow parent profile visibility)
-- -------------------------------------------------------

CREATE POLICY "View user skills if profile visible"
    ON user_skills FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = user_skills.profile_id
            AND (p.visibility != 'private' OR p.id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users manage own skills"
    ON user_skills FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users update own skills"
    ON user_skills FOR UPDATE
    USING (profile_id = auth.uid());

CREATE POLICY "Users delete own skills"
    ON user_skills FOR DELETE
    USING (profile_id = auth.uid());

-- -------------------------------------------------------
-- USER INTERESTS (follow parent profile visibility)
-- -------------------------------------------------------

CREATE POLICY "View user interests if profile visible"
    ON user_interests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = user_interests.profile_id
            AND (p.visibility != 'private' OR p.id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users manage own interests"
    ON user_interests FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users update own interests"
    ON user_interests FOR UPDATE
    USING (profile_id = auth.uid());

CREATE POLICY "Users delete own interests"
    ON user_interests FOR DELETE
    USING (profile_id = auth.uid());

-- -------------------------------------------------------
-- USER PAST PROJECTS, INTERNSHIPS, CERTIFICATIONS, PUBLICATIONS
-- (Same pattern: follow parent profile visibility)
-- -------------------------------------------------------

-- user_past_projects
CREATE POLICY "View user past projects if profile visible"
    ON user_past_projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = user_past_projects.profile_id
            AND (p.visibility != 'private' OR p.id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users manage own past projects"
    ON user_past_projects FOR ALL
    USING (profile_id = auth.uid());

-- user_internships
CREATE POLICY "View user internships if profile visible"
    ON user_internships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = user_internships.profile_id
            AND (p.visibility != 'private' OR p.id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users manage own internships"
    ON user_internships FOR ALL
    USING (profile_id = auth.uid());

-- user_certifications
CREATE POLICY "View user certifications if profile visible"
    ON user_certifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = user_certifications.profile_id
            AND (p.visibility != 'private' OR p.id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users manage own certifications"
    ON user_certifications FOR ALL
    USING (profile_id = auth.uid());

-- user_publications
CREATE POLICY "View user publications if profile visible"
    ON user_publications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = user_publications.profile_id
            AND (p.visibility != 'private' OR p.id = auth.uid() OR is_admin(auth.uid()))
        )
    );

CREATE POLICY "Users manage own publications"
    ON user_publications FOR ALL
    USING (profile_id = auth.uid());

-- -------------------------------------------------------
-- GITHUB CONNECTIONS
-- -------------------------------------------------------

CREATE POLICY "View own github connection"
    ON github_connections FOR SELECT
    USING (profile_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users manage own github connection"
    ON github_connections FOR ALL
    USING (profile_id = auth.uid());

-- -------------------------------------------------------
-- PROJECTS
-- -------------------------------------------------------

-- Public projects visible to all authenticated. Private/restricted based on access.
CREATE POLICY "View accessible projects"
    ON projects FOR SELECT
    USING (
        visibility = 'public'
        OR owner_id = auth.uid()
        OR has_project_access(auth.uid(), id)
    );

CREATE POLICY "Authenticated users can create projects"
    ON projects FOR INSERT
    WITH CHECK (owner_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update their projects"
    ON projects FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their projects"
    ON projects FOR DELETE
    USING (owner_id = auth.uid());

CREATE POLICY "Admins can manage all projects"
    ON projects FOR ALL
    USING (is_admin(auth.uid()));

-- -------------------------------------------------------
-- PROJECT ROLES
-- -------------------------------------------------------

CREATE POLICY "View roles for accessible projects"
    ON project_roles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_roles.project_id
            AND (p.visibility = 'public' OR p.owner_id = auth.uid() OR has_project_access(auth.uid(), p.id))
        )
    );

CREATE POLICY "Project owners manage roles"
    ON project_roles FOR ALL
    USING (is_project_owner(auth.uid(), project_id));

-- -------------------------------------------------------
-- PROJECT MEMBERS
-- -------------------------------------------------------

CREATE POLICY "View members of accessible projects"
    ON project_members FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project owners manage members"
    ON project_members FOR INSERT
    WITH CHECK (is_project_owner(auth.uid(), project_id));

CREATE POLICY "Owners update member status"
    ON project_members FOR UPDATE
    USING (
        is_project_owner(auth.uid(), project_id)
        OR user_id = auth.uid()
    );

CREATE POLICY "Admins manage all members"
    ON project_members FOR ALL
    USING (is_admin(auth.uid()));

-- -------------------------------------------------------
-- JOIN REQUESTS
-- -------------------------------------------------------

-- Applicants see own requests; project owners see requests for their projects
CREATE POLICY "View own or project requests"
    ON join_requests FOR SELECT
    USING (
        applicant_id = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
        OR is_admin(auth.uid())
    );

CREATE POLICY "Authenticated users can apply"
    ON join_requests FOR INSERT
    WITH CHECK (
        applicant_id = auth.uid()
        AND NOT is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Applicant can withdraw; owner can review"
    ON join_requests FOR UPDATE
    USING (
        applicant_id = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- -------------------------------------------------------
-- PROJECT INVITATIONS
-- -------------------------------------------------------

CREATE POLICY "View own invitations or project invitations"
    ON project_invitations FOR SELECT
    USING (
        invitee_id = auth.uid()
        OR inviter_id = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Project owners can send invitations"
    ON project_invitations FOR INSERT
    WITH CHECK (is_project_owner(auth.uid(), project_id));

CREATE POLICY "Invitee or owner can update invitation"
    ON project_invitations FOR UPDATE
    USING (
        invitee_id = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- -------------------------------------------------------
-- DETAILS REQUESTS
-- -------------------------------------------------------

CREATE POLICY "View own or project details requests"
    ON details_requests FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Users can request details"
    ON details_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner resolves details requests"
    ON details_requests FOR UPDATE
    USING (is_project_owner(auth.uid(), project_id));

-- -------------------------------------------------------
-- MENTORSHIP REQUESTS
-- -------------------------------------------------------

CREATE POLICY "View own or project mentorship requests"
    ON mentorship_requests FOR SELECT
    USING (
        faculty_id = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Faculty can request mentorship"
    ON mentorship_requests FOR INSERT
    WITH CHECK (faculty_id = auth.uid());

CREATE POLICY "Owner reviews mentorship requests"
    ON mentorship_requests FOR UPDATE
    USING (is_project_owner(auth.uid(), project_id));

-- -------------------------------------------------------
-- AI ANALYSES
-- -------------------------------------------------------

-- Visible to the related project owner, the analyzed user, or admins
CREATE POLICY "View relevant AI analyses"
    ON ai_analyses FOR SELECT
    USING (
        user_id = auth.uid()
        OR (project_id IS NOT NULL AND is_project_owner(auth.uid(), project_id))
        OR is_admin(auth.uid())
    );

-- AI analyses are created by Edge Functions (service_role).
-- Allow authenticated insert for development/transition.
CREATE POLICY "Service or authenticated can insert analyses"
    ON ai_analyses FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- TEAM RECOMMENDATIONS
-- -------------------------------------------------------

CREATE POLICY "Project owners view team recommendations"
    ON team_recommendations FOR SELECT
    USING (
        is_project_owner(auth.uid(), project_id)
        OR is_admin(auth.uid())
    );

CREATE POLICY "Service can insert team recommendations"
    ON team_recommendations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- TASKS (project members only)
-- -------------------------------------------------------

CREATE POLICY "Project members view tasks"
    ON tasks FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members create tasks"
    ON tasks FOR INSERT
    WITH CHECK (
        has_project_access(auth.uid(), project_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "Project members update tasks"
    ON tasks FOR UPDATE
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project owner or creator can delete tasks"
    ON tasks FOR DELETE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- -------------------------------------------------------
-- TASK COMMENTS
-- -------------------------------------------------------

CREATE POLICY "Project members view task comments"
    ON task_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = task_comments.task_id
            AND has_project_access(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members create comments"
    ON task_comments FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = task_comments.task_id
            AND has_project_access(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Comment authors can delete own comments"
    ON task_comments FOR DELETE
    USING (user_id = auth.uid());

-- -------------------------------------------------------
-- MILESTONES
-- -------------------------------------------------------

CREATE POLICY "Project members view milestones"
    ON milestones FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members manage milestones"
    ON milestones FOR ALL
    USING (has_project_access(auth.uid(), project_id));

-- -------------------------------------------------------
-- RESEARCH WORKSPACE (notes, references, experiments, meetings, datasets)
-- All: project members can view/create; creator or owner can update/delete
-- -------------------------------------------------------

-- research_notes
CREATE POLICY "Project members view notes"
    ON research_notes FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members create notes"
    ON research_notes FOR INSERT
    WITH CHECK (
        has_project_access(auth.uid(), project_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "Note creator or owner can update"
    ON research_notes FOR UPDATE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Note creator or owner can delete"
    ON research_notes FOR DELETE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- reference_items
CREATE POLICY "Project members view references"
    ON reference_items FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members manage references"
    ON reference_items FOR INSERT
    WITH CHECK (
        has_project_access(auth.uid(), project_id)
        AND added_by = auth.uid()
    );

CREATE POLICY "Reference author or owner can modify"
    ON reference_items FOR UPDATE
    USING (
        added_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Reference author or owner can delete"
    ON reference_items FOR DELETE
    USING (
        added_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- experiments
CREATE POLICY "Project members view experiments"
    ON experiments FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members create experiments"
    ON experiments FOR INSERT
    WITH CHECK (
        has_project_access(auth.uid(), project_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "Experiment creator or owner can modify"
    ON experiments FOR UPDATE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Experiment creator or owner can delete"
    ON experiments FOR DELETE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- meeting_notes
CREATE POLICY "Project members view meeting notes"
    ON meeting_notes FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members create meeting notes"
    ON meeting_notes FOR INSERT
    WITH CHECK (
        has_project_access(auth.uid(), project_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "Meeting creator or owner can modify"
    ON meeting_notes FOR UPDATE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Meeting creator or owner can delete"
    ON meeting_notes FOR DELETE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- datasets
CREATE POLICY "Project members view datasets"
    ON datasets FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members create datasets"
    ON datasets FOR INSERT
    WITH CHECK (
        has_project_access(auth.uid(), project_id)
        AND added_by = auth.uid()
    );

CREATE POLICY "Dataset author or owner can modify"
    ON datasets FOR UPDATE
    USING (
        added_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Dataset author or owner can delete"
    ON datasets FOR DELETE
    USING (
        added_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- -------------------------------------------------------
-- DOCUMENTS
-- -------------------------------------------------------

CREATE POLICY "View documents based on access level"
    ON documents FOR SELECT
    USING (
        CASE access
            WHEN 'project_members' THEN has_project_access(auth.uid(), project_id)
            WHEN 'owner_only' THEN is_project_owner(auth.uid(), project_id)
            WHEN 'mentor_owner' THEN (
                is_project_owner(auth.uid(), project_id)
                OR EXISTS (
                    SELECT 1 FROM project_members pm
                    WHERE pm.project_id = documents.project_id
                    AND pm.user_id = auth.uid()
                    AND pm.system_role = 'mentor'
                    AND pm.status = 'active'
                )
            )
            WHEN 'role_restricted' THEN has_project_access(auth.uid(), project_id)
            ELSE FALSE
        END
        OR is_admin(auth.uid())
    );

CREATE POLICY "Project members upload documents"
    ON documents FOR INSERT
    WITH CHECK (
        has_project_access(auth.uid(), project_id)
        AND uploader_id = auth.uid()
    );

CREATE POLICY "Uploader or owner can update documents"
    ON documents FOR UPDATE
    USING (
        uploader_id = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Uploader or owner can delete documents"
    ON documents FOR DELETE
    USING (
        uploader_id = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- -------------------------------------------------------
-- DISCUSSIONS
-- -------------------------------------------------------

CREATE POLICY "Project members view discussions"
    ON discussions FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members create discussions"
    ON discussions FOR INSERT
    WITH CHECK (
        has_project_access(auth.uid(), project_id)
        AND created_by = auth.uid()
    );

CREATE POLICY "Discussion creator or owner can update"
    ON discussions FOR UPDATE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

CREATE POLICY "Discussion creator or owner can delete"
    ON discussions FOR DELETE
    USING (
        created_by = auth.uid()
        OR is_project_owner(auth.uid(), project_id)
    );

-- discussion_replies
CREATE POLICY "View replies in accessible discussions"
    ON discussion_replies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM discussions d
            WHERE d.id = discussion_replies.discussion_id
            AND has_project_access(auth.uid(), d.project_id)
        )
    );

CREATE POLICY "Project members create replies"
    ON discussion_replies FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM discussions d
            WHERE d.id = discussion_replies.discussion_id
            AND has_project_access(auth.uid(), d.project_id)
        )
    );

CREATE POLICY "Reply author can delete own replies"
    ON discussion_replies FOR DELETE
    USING (user_id = auth.uid());

-- -------------------------------------------------------
-- GITHUB REPOSITORIES & ACTIVITY
-- -------------------------------------------------------

CREATE POLICY "Project members view repositories"
    ON github_repositories FOR SELECT
    USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Project owners manage repositories"
    ON github_repositories FOR ALL
    USING (is_project_owner(auth.uid(), project_id));

CREATE POLICY "View activity for accessible repos"
    ON github_activity FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM github_repositories gr
            WHERE gr.id = github_activity.repository_id
            AND has_project_access(auth.uid(), gr.project_id)
        )
    );

-- github_activity inserts are done by Edge Functions (service_role)
CREATE POLICY "Service can insert github activity"
    ON github_activity FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- NOTIFICATIONS (users see only their own)
-- -------------------------------------------------------

CREATE POLICY "Users view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Notifications created by Edge Functions or system.
-- Allow authenticated insert for development flexibility.
CREATE POLICY "Authenticated can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users mark own notifications read"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- -------------------------------------------------------
-- ACTIVITY LOGS
-- -------------------------------------------------------

CREATE POLICY "Project members view activity logs"
    ON activity_logs FOR SELECT
    USING (
        project_id IS NULL
        OR has_project_access(auth.uid(), project_id)
        OR is_admin(auth.uid())
    );

CREATE POLICY "Authenticated users create activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- REPORTS
-- -------------------------------------------------------

CREATE POLICY "Reporters view own reports; admins view all"
    ON reports FOR SELECT
    USING (
        reporter_id = auth.uid()
        OR is_admin(auth.uid())
    );

CREATE POLICY "Authenticated users can file reports"
    ON reports FOR INSERT
    WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can update reports"
    ON reports FOR UPDATE
    USING (is_admin(auth.uid()));

-- -------------------------------------------------------
-- ADMIN ACTIONS (admins only)
-- -------------------------------------------------------

CREATE POLICY "Admins view admin actions"
    ON admin_actions FOR SELECT
    USING (is_admin(auth.uid()));

CREATE POLICY "Admins create admin actions"
    ON admin_actions FOR INSERT
    WITH CHECK (
        is_admin(auth.uid())
        AND admin_id = auth.uid()
    );

-- -------------------------------------------------------
-- PLATFORM CONFIGURATION
-- -------------------------------------------------------

CREATE POLICY "Anyone can view configuration"
    ON platform_configuration FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage configuration"
    ON platform_configuration FOR ALL
    USING (is_admin(auth.uid()));

-- ============================================================
-- 15. TRIGGERS
-- ============================================================

-- Trigger function to create a profile automatically after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    safe_role platform_role;
    raw_role TEXT;
BEGIN
    raw_role := NEW.raw_user_meta_data->>'role';
    IF raw_role IN ('student', 'faculty', 'admin') THEN
        safe_role := raw_role::platform_role;
    ELSE
        safe_role := 'student'::platform_role;
    END IF;

    INSERT INTO public.profiles (
        id, email, full_name, role, institution, department, phone, location, status, visibility, profile_completeness
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Unknown User'),
        safe_role,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'institution', ''), 'Unknown Institution'),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Unknown Department'),
        NULLIF(NEW.raw_user_meta_data->>'phone', ''),
        NULLIF(NEW.raw_user_meta_data->>'location', ''),
        'active'::account_status,
        'public'::profile_visibility,
        10
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        institution = EXCLUDED.institution,
        department = EXCLUDED.department,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Drop trigger if exists to allow safe re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- END OF SCHEMA
-- ============================================================
