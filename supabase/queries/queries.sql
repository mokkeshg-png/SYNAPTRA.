-- =============================================================================
-- SYNAPTRA — Application SQL Queries & Seed Data
-- AI-Powered Research Collaboration & Intelligent Team Formation Platform
-- =============================================================================
-- This file contains ALL application-level SQL query examples and seed data.
-- Database structure is defined separately in supabase/schema/schema.sql.
-- =============================================================================
-- Parameter placeholders use $1, $2 etc. for prepared statements.
-- In Supabase JS client, use .eq(), .insert(), etc. instead of raw SQL.
-- All queries respect RLS — do not bypass it from frontend code.
-- =============================================================================

-- ============================================================
-- 1. AUTHENTICATION / PROFILE QUERIES
-- ============================================================

-- Create profile after Supabase Auth signup (called in auth trigger or onboarding)
INSERT INTO profiles (id, role, full_name, institution, department, visibility)
VALUES ($1, $2, $3, $4, $5, 'public');

-- Get current user profile with all details
SELECT
    p.*,
    sp.degree_program,
    sp.academic_year,
    sp.graduation_year,
    fp.designation,
    fp.subjects_taught,
    fp.teaching_areas,
    fp.academic_experience,
    fp.research_experience,
    fp.research_domains,
    fp.expertise,
    fp.google_scholar,
    fp.orcid,
    fp.researchgate,
    fp.personal_website,
    fp.open_to_collaboration,
    fp.open_to_mentoring,
    fp.preferred_project_types
FROM profiles p
LEFT JOIN student_profiles sp ON sp.profile_id = p.id
LEFT JOIN faculty_profiles fp ON fp.profile_id = p.id
WHERE p.id = $1;

-- Get profile with skills and interests (aggregated)
SELECT
    p.*,
    COALESCE(
        (SELECT json_agg(json_build_object('skill', s.name, 'proficiency', us.proficiency))
         FROM user_skills us JOIN skills s ON s.id = us.skill_id
         WHERE us.profile_id = p.id),
        '[]'::json
    ) AS skills,
    COALESCE(
        (SELECT json_agg(ri.name)
         FROM user_interests ui JOIN research_interests ri ON ri.id = ui.interest_id
         WHERE ui.profile_id = p.id),
        '[]'::json
    ) AS interests,
    COALESCE(
        (SELECT json_agg(json_build_object('id', upp.id, 'title', upp.title, 'description', upp.description, 'year', upp.year))
         FROM user_past_projects upp WHERE upp.profile_id = p.id),
        '[]'::json
    ) AS past_projects,
    COALESCE(
        (SELECT json_agg(json_build_object('id', ui2.id, 'organization', ui2.organization, 'role', ui2.role, 'description', ui2.description))
         FROM user_internships ui2 WHERE ui2.profile_id = p.id),
        '[]'::json
    ) AS internships,
    COALESCE(
        (SELECT json_agg(json_build_object('id', uc.id, 'name', uc.name, 'issuer', uc.issuer, 'year', uc.year))
         FROM user_certifications uc WHERE uc.profile_id = p.id),
        '[]'::json
    ) AS certifications,
    COALESCE(
        (SELECT json_agg(json_build_object('id', upb.id, 'title', upb.title, 'venue', upb.venue, 'year', upb.year, 'link', upb.link))
         FROM user_publications upb WHERE upb.profile_id = p.id),
        '[]'::json
    ) AS publications
FROM profiles p
WHERE p.id = $1;

-- Update profile basic fields
UPDATE profiles
SET full_name = $2,
    bio = $3,
    institution = $4,
    department = $5,
    visibility = $6,
    photo_url = $7,
    linkedin_url = $8,
    portfolio_url = $9,
    availability_hours = $10,
    preferred_team_size = $11,
    preferred_roles = $12,
    programming_languages = $13,
    github_username = $14,
    github_connected = $15,
    profile_completeness = $16
WHERE id = $1;

-- Update last active timestamp
UPDATE profiles SET last_active_at = NOW() WHERE id = $1;

-- Soft-delete / change account status
UPDATE profiles SET status = $2 WHERE id = $1;

-- ============================================================
-- 2. STUDENT PROFILE QUERIES
-- ============================================================

-- Upsert student profile
INSERT INTO student_profiles (profile_id, degree_program, academic_year, graduation_year)
VALUES ($1, $2, $3, $4)
ON CONFLICT (profile_id) DO UPDATE SET
    degree_program = EXCLUDED.degree_program,
    academic_year = EXCLUDED.academic_year,
    graduation_year = EXCLUDED.graduation_year;

-- Get student profile
SELECT sp.*, p.full_name, p.institution, p.department
FROM student_profiles sp
JOIN profiles p ON p.id = sp.profile_id
WHERE sp.profile_id = $1;

-- ============================================================
-- 3. FACULTY PROFILE QUERIES
-- ============================================================

-- Upsert faculty profile
INSERT INTO faculty_profiles (
    profile_id, designation, subjects_taught, teaching_areas,
    academic_experience, research_experience, research_domains, expertise,
    google_scholar, orcid, researchgate, personal_website,
    open_to_collaboration, open_to_mentoring, preferred_project_types
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
ON CONFLICT (profile_id) DO UPDATE SET
    designation = EXCLUDED.designation,
    subjects_taught = EXCLUDED.subjects_taught,
    teaching_areas = EXCLUDED.teaching_areas,
    academic_experience = EXCLUDED.academic_experience,
    research_experience = EXCLUDED.research_experience,
    research_domains = EXCLUDED.research_domains,
    expertise = EXCLUDED.expertise,
    google_scholar = EXCLUDED.google_scholar,
    orcid = EXCLUDED.orcid,
    researchgate = EXCLUDED.researchgate,
    personal_website = EXCLUDED.personal_website,
    open_to_collaboration = EXCLUDED.open_to_collaboration,
    open_to_mentoring = EXCLUDED.open_to_mentoring,
    preferred_project_types = EXCLUDED.preferred_project_types;

-- Get faculty profile
SELECT fp.*, p.full_name, p.institution, p.department
FROM faculty_profiles fp
JOIN profiles p ON p.id = fp.profile_id
WHERE fp.profile_id = $1;

-- Get mentors open to collaboration
SELECT p.*, fp.*
FROM profiles p
JOIN faculty_profiles fp ON fp.profile_id = p.id
WHERE fp.open_to_mentoring = TRUE
  AND p.status = 'active'
  AND p.visibility != 'private'
ORDER BY p.full_name;

-- ============================================================
-- 4. SKILLS QUERIES
-- ============================================================

-- Get all skills grouped by category
SELECT s.id, s.name, sc.name AS category_name, sc.id AS category_id
FROM skills s
LEFT JOIN skill_categories sc ON sc.id = s.category_id
ORDER BY sc.name, s.name;

-- Add skill to user profile
INSERT INTO user_skills (profile_id, skill_id, proficiency)
VALUES ($1, $2, $3)
ON CONFLICT (profile_id, skill_id) DO UPDATE SET proficiency = EXCLUDED.proficiency;

-- Add skill by name (find or create, then link)
-- Step 1: Insert skill if not exists
INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;
-- Step 2: Link to user
INSERT INTO user_skills (profile_id, skill_id, proficiency)
SELECT $2, s.id, $3 FROM skills s WHERE s.name = $1
ON CONFLICT (profile_id, skill_id) DO UPDATE SET proficiency = EXCLUDED.proficiency;

-- Remove skill from user profile
DELETE FROM user_skills WHERE profile_id = $1 AND skill_id = $2;

-- Get user skills with proficiency
SELECT s.name AS skill, us.proficiency
FROM user_skills us
JOIN skills s ON s.id = us.skill_id
WHERE us.profile_id = $1
ORDER BY s.name;

-- Bulk replace user skills (delete all, re-insert)
DELETE FROM user_skills WHERE profile_id = $1;
-- Then INSERT each skill:
INSERT INTO user_skills (profile_id, skill_id, proficiency)
SELECT $1, s.id, $2 FROM skills s WHERE s.name = $3
ON CONFLICT (profile_id, skill_id) DO NOTHING;

-- ============================================================
-- 5. INTERESTS QUERIES
-- ============================================================

-- Get all research interests grouped by category
SELECT ri.id, ri.name, ic.name AS category_name, ic.id AS category_id
FROM research_interests ri
LEFT JOIN interest_categories ic ON ic.id = ri.category_id
ORDER BY ic.name, ri.name;

-- Add interest to user profile
INSERT INTO user_interests (profile_id, interest_id)
SELECT $1, ri.id FROM research_interests ri WHERE ri.name = $2
ON CONFLICT (profile_id, interest_id) DO NOTHING;

-- Remove interest from user profile
DELETE FROM user_interests
WHERE profile_id = $1
  AND interest_id = (SELECT id FROM research_interests WHERE name = $2);

-- Get user interests
SELECT ri.name
FROM user_interests ui
JOIN research_interests ri ON ri.id = ui.interest_id
WHERE ui.profile_id = $1
ORDER BY ri.name;

-- Bulk replace user interests
DELETE FROM user_interests WHERE profile_id = $1;
-- Then re-insert each:
INSERT INTO user_interests (profile_id, interest_id)
SELECT $1, ri.id FROM research_interests ri WHERE ri.name = $2
ON CONFLICT (profile_id, interest_id) DO NOTHING;

-- ============================================================
-- 6. PROJECT QUERIES
-- ============================================================

-- Create a new project
INSERT INTO projects (
    owner_id, title, short_description, detailed_description,
    problem_statement, objectives, domains, interests,
    required_skills, team_min, team_max, duration, difficulty,
    project_type, visibility, deadline, expected_outcomes,
    mentor_required, github_required, tags
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
RETURNING *;

-- Automatically add creator as owner member after project creation
INSERT INTO project_members (project_id, user_id, system_role, status, joined_at)
VALUES ($1, $2, 'owner', 'active', NOW());

-- Get project by ID with roles
SELECT
    p.*,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', pr.id, 'name', pr.name, 'description', pr.description,
            'requiredSkills', pr.required_skills, 'openings', pr.openings
        ))
         FROM project_roles pr WHERE pr.project_id = p.id),
        '[]'::json
    ) AS roles
FROM projects p
WHERE p.id = $1;

-- Update project details
UPDATE projects
SET title = $2,
    short_description = $3,
    detailed_description = $4,
    problem_statement = $5,
    objectives = $6,
    domains = $7,
    interests = $8,
    required_skills = $9,
    team_min = $10,
    team_max = $11,
    duration = $12,
    difficulty = $13,
    project_type = $14,
    visibility = $15,
    deadline = $16,
    expected_outcomes = $17,
    mentor_required = $18,
    github_required = $19,
    tags = $20
WHERE id = $1 AND owner_id = auth.uid();

-- Change project status
UPDATE projects SET status = $2 WHERE id = $1 AND owner_id = auth.uid();

-- Soft-delete project
UPDATE projects SET deleted_at = NOW(), status = 'removed' WHERE id = $1 AND owner_id = auth.uid();

-- Get projects owned by user
SELECT p.* FROM projects p
WHERE p.owner_id = $1 AND p.deleted_at IS NULL
ORDER BY p.created_at DESC;

-- ============================================================
-- 7. PROJECT DISCOVERY QUERIES
-- ============================================================

-- Basic project search with filters
SELECT
    p.*,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id AND pm.status = 'active') AS member_count,
    owner.full_name AS owner_name,
    owner.institution AS owner_institution
FROM projects p
JOIN profiles owner ON owner.id = p.owner_id
WHERE p.deleted_at IS NULL
  AND p.status IN ('open', 'closed', 'completed')
  AND p.visibility != 'private'
  -- Keyword search
  AND ($1 IS NULL OR $1 = '' OR (
      p.title ILIKE '%' || $1 || '%'
      OR p.short_description ILIKE '%' || $1 || '%'
      OR $1 = ANY(p.domains)
      OR $1 = ANY(p.required_skills)
      OR $1 = ANY(p.tags)
  ))
  -- Domain filter
  AND ($2 IS NULL OR $2 = ANY(p.domains))
  -- Skill filter
  AND ($3 IS NULL OR $3 = ANY(p.required_skills))
  -- Difficulty filter
  AND ($4 IS NULL OR p.difficulty = $4::difficulty_level)
  -- Project type filter
  AND ($5 IS NULL OR p.project_type = $5)
ORDER BY
    CASE WHEN $6 = 'deadline' THEN p.deadline END ASC NULLS LAST,
    CASE WHEN $6 != 'deadline' OR $6 IS NULL THEN p.created_at END DESC
LIMIT 50;

-- Full-text search using PostgreSQL tsvector (optional enhancement)
SELECT p.*
FROM projects p
WHERE p.deleted_at IS NULL
  AND p.visibility != 'private'
  AND to_tsvector('english', p.title || ' ' || p.short_description || ' ' || COALESCE(p.detailed_description, ''))
      @@ plainto_tsquery('english', $1)
ORDER BY ts_rank(
    to_tsvector('english', p.title || ' ' || p.short_description),
    plainto_tsquery('english', $1)
) DESC
LIMIT 20;

-- ============================================================
-- 8. PROJECT ROLE QUERIES
-- ============================================================

-- Add a role to a project
INSERT INTO project_roles (project_id, name, description, required_skills, openings)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- Update a role
UPDATE project_roles
SET name = $2, description = $3, required_skills = $4, openings = $5
WHERE id = $1;

-- Delete a role
DELETE FROM project_roles WHERE id = $1;

-- Get roles for a project
SELECT * FROM project_roles WHERE project_id = $1 ORDER BY created_at;

-- Get roles with fill counts
SELECT
    pr.*,
    (SELECT COUNT(*) FROM project_members pm
     WHERE pm.role_id = pr.id AND pm.status = 'active') AS filled
FROM project_roles pr
WHERE pr.project_id = $1
ORDER BY pr.created_at;

-- ============================================================
-- 9. PROJECT MEMBER QUERIES
-- ============================================================

-- Add member to project
INSERT INTO project_members (project_id, user_id, role_id, system_role, status, joined_at)
VALUES ($1, $2, $3, $4, 'active', NOW())
RETURNING *;

-- Get project members with profile info
SELECT
    pm.*,
    p.full_name,
    p.photo_url,
    p.institution,
    p.department,
    pr.name AS role_name
FROM project_members pm
JOIN profiles p ON p.id = pm.user_id
LEFT JOIN project_roles pr ON pr.id = pm.role_id
WHERE pm.project_id = $1 AND pm.status = 'active'
ORDER BY
    CASE pm.system_role
        WHEN 'owner' THEN 1
        WHEN 'mentor' THEN 2
        WHEN 'lead' THEN 3
        WHEN 'member' THEN 4
    END;

-- Remove member (soft delete)
UPDATE project_members SET status = 'removed', left_at = NOW()
WHERE id = $1 AND system_role != 'owner';

-- Member leaves project
UPDATE project_members SET status = 'left', left_at = NOW()
WHERE project_id = $1 AND user_id = $2 AND system_role != 'owner';

-- Assign role to member
UPDATE project_members SET role_id = $3
WHERE project_id = $1 AND user_id = $2;

-- Transfer ownership
-- Step 1: Demote current owner
UPDATE project_members SET system_role = 'member'
WHERE project_id = $1 AND user_id = $2 AND system_role = 'owner';
-- Step 2: Promote new owner
UPDATE project_members SET system_role = 'owner'
WHERE project_id = $1 AND user_id = $3;
-- Step 3: Update project owner_id
UPDATE projects SET owner_id = $3 WHERE id = $1;

-- Check if user is active member
SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = $1 AND user_id = $2 AND status = 'active'
) AS is_member;

-- ============================================================
-- 10. JOIN REQUEST QUERIES
-- ============================================================

-- Submit application
INSERT INTO join_requests (project_id, applicant_id, selected_role_id, motivation, relevant_experience, message)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- Get applications for a project (owner view)
SELECT
    jr.*,
    p.full_name AS applicant_name,
    p.photo_url AS applicant_photo,
    p.institution AS applicant_institution,
    pr.name AS selected_role_name,
    aa.output_result AS ai_analysis
FROM join_requests jr
JOIN profiles p ON p.id = jr.applicant_id
LEFT JOIN project_roles pr ON pr.id = jr.selected_role_id
LEFT JOIN ai_analyses aa ON aa.id = jr.ai_analysis_id
WHERE jr.project_id = $1
ORDER BY jr.created_at DESC;

-- Get user's submitted applications
SELECT
    jr.*,
    proj.title AS project_title,
    proj.owner_id,
    pr.name AS selected_role_name,
    aa.output_result AS ai_analysis
FROM join_requests jr
JOIN projects proj ON proj.id = jr.project_id
LEFT JOIN project_roles pr ON pr.id = jr.selected_role_id
LEFT JOIN ai_analyses aa ON aa.id = jr.ai_analysis_id
WHERE jr.applicant_id = $1
ORDER BY jr.created_at DESC;

-- Withdraw application
UPDATE join_requests SET status = 'withdrawn'
WHERE id = $1 AND applicant_id = $2 AND status = 'pending';

-- ============================================================
-- 11. APPLICATION REVIEW QUERIES
-- ============================================================

-- Accept application
UPDATE join_requests SET status = 'accepted'
WHERE id = $1 AND status = 'pending';

-- After accepting, add member
INSERT INTO project_members (project_id, user_id, role_id, system_role, status, joined_at)
SELECT jr.project_id, jr.applicant_id, jr.selected_role_id, 'member', 'active', NOW()
FROM join_requests jr
WHERE jr.id = $1;

-- Reject application with reason
UPDATE join_requests SET status = 'rejected', reject_reason = $2
WHERE id = $1 AND status = 'pending';

-- Get pending application count for a project
SELECT COUNT(*) AS pending_count
FROM join_requests
WHERE project_id = $1 AND status = 'pending';

-- ============================================================
-- 12. TASK QUERIES
-- ============================================================

-- Create task
INSERT INTO tasks (project_id, title, description, assigned_to, role_id, priority, deadline, status, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- Get tasks for a project
SELECT
    t.*,
    assignee.full_name AS assignee_name,
    creator.full_name AS creator_name,
    pr.name AS role_name
FROM tasks t
LEFT JOIN profiles assignee ON assignee.id = t.assigned_to
JOIN profiles creator ON creator.id = t.created_by
LEFT JOIN project_roles pr ON pr.id = t.role_id
WHERE t.project_id = $1
ORDER BY
    CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    t.created_at DESC;

-- Update task
UPDATE tasks
SET title = $2, description = $3, assigned_to = $4, role_id = $5,
    priority = $6, deadline = $7, status = $8
WHERE id = $1;

-- Update task status only
UPDATE tasks SET status = $2 WHERE id = $1;

-- Delete task
DELETE FROM tasks WHERE id = $1;

-- Get task comments
SELECT tc.*, p.full_name AS user_name, p.photo_url AS user_photo
FROM task_comments tc
JOIN profiles p ON p.id = tc.user_id
WHERE tc.task_id = $1
ORDER BY tc.created_at ASC;

-- Add task comment
INSERT INTO task_comments (task_id, user_id, body)
VALUES ($1, $2, $3);

-- Get task statistics for a project
SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
    COUNT(*) FILTER (WHERE status = 'review') AS in_review,
    COUNT(*) FILTER (WHERE status = 'todo') AS todo,
    COUNT(*) FILTER (WHERE priority IN ('high', 'critical') AND status != 'completed') AS open_high_priority
FROM tasks
WHERE project_id = $1;

-- ============================================================
-- 13. RESEARCH WORKSPACE QUERIES
-- ============================================================

-- Create research note
INSERT INTO research_notes (project_id, title, content, category, tags, created_by)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- Get research notes for a project
SELECT rn.*, p.full_name AS author_name
FROM research_notes rn
JOIN profiles p ON p.id = rn.created_by
WHERE rn.project_id = $1
ORDER BY rn.created_at DESC;

-- Update research note
UPDATE research_notes SET title = $2, content = $3, category = $4, tags = $5
WHERE id = $1 AND created_by = auth.uid();

-- Delete research note
DELETE FROM research_notes WHERE id = $1;

-- Add reference
INSERT INTO reference_items (project_id, title, authors, year, venue, link, notes, tags, added_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- Get references for a project
SELECT ri.*, p.full_name AS added_by_name
FROM reference_items ri
JOIN profiles p ON p.id = ri.added_by
WHERE ri.project_id = $1
ORDER BY ri.year DESC, ri.created_at DESC;

-- Add experiment
INSERT INTO experiments (project_id, name, objective, method, results, conclusion, experiment_date, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- Get experiments for a project
SELECT e.*, p.full_name AS created_by_name
FROM experiments e
JOIN profiles p ON p.id = e.created_by
WHERE e.project_id = $1
ORDER BY e.experiment_date DESC;

-- Add meeting note
INSERT INTO meeting_notes (project_id, meeting_date, attendees, agenda, decisions, action_items, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- Get meeting notes for a project
SELECT mn.*, p.full_name AS created_by_name
FROM meeting_notes mn
JOIN profiles p ON p.id = mn.created_by
WHERE mn.project_id = $1
ORDER BY mn.meeting_date DESC;

-- Add dataset
INSERT INTO datasets (project_id, name, description, source, size, format, license, link, added_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- Get datasets for a project
SELECT d.*, p.full_name AS added_by_name
FROM datasets d
JOIN profiles p ON p.id = d.added_by
WHERE d.project_id = $1
ORDER BY d.created_at DESC;

-- ============================================================
-- 14. DOCUMENT METADATA QUERIES
-- ============================================================

-- Add document metadata (file stored in Supabase Storage)
INSERT INTO documents (project_id, uploader_id, file_name, storage_path, file_type, file_size, access, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- Get documents for a project
SELECT d.*, p.full_name AS uploader_name
FROM documents d
JOIN profiles p ON p.id = d.uploader_id
WHERE d.project_id = $1
ORDER BY d.created_at DESC;

-- Update document access level
UPDATE documents SET access = $2 WHERE id = $1;

-- Delete document metadata (also delete from Supabase Storage via Edge Function)
DELETE FROM documents WHERE id = $1 RETURNING storage_path;

-- ============================================================
-- 15. DISCUSSION QUERIES
-- ============================================================

-- Create discussion
INSERT INTO discussions (project_id, title, body, created_by)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- Get discussions for a project
SELECT
    d.*,
    p.full_name AS author_name,
    p.photo_url AS author_photo,
    (SELECT COUNT(*) FROM discussion_replies dr WHERE dr.discussion_id = d.id) AS reply_count
FROM discussions d
JOIN profiles p ON p.id = d.created_by
WHERE d.project_id = $1
ORDER BY d.created_at DESC;

-- Get discussion with replies
SELECT d.*, p.full_name AS author_name
FROM discussions d
JOIN profiles p ON p.id = d.created_by
WHERE d.id = $1;

SELECT dr.*, p.full_name AS user_name, p.photo_url AS user_photo
FROM discussion_replies dr
JOIN profiles p ON p.id = dr.user_id
WHERE dr.discussion_id = $1
ORDER BY dr.created_at ASC;

-- Add reply
INSERT INTO discussion_replies (discussion_id, user_id, body)
VALUES ($1, $2, $3)
RETURNING *;

-- Close/reopen discussion
UPDATE discussions SET status = $2 WHERE id = $1;

-- ============================================================
-- 16. GITHUB METADATA QUERIES
-- ============================================================

-- Save GitHub connection (safe metadata only)
INSERT INTO github_connections (profile_id, github_username, github_user_id, avatar_url, profile_url, public_repos, bio)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (profile_id) DO UPDATE SET
    github_username = EXCLUDED.github_username,
    github_user_id = EXCLUDED.github_user_id,
    avatar_url = EXCLUDED.avatar_url,
    profile_url = EXCLUDED.profile_url,
    public_repos = EXCLUDED.public_repos,
    bio = EXCLUDED.bio,
    last_synced_at = NOW();

-- Get user's GitHub connection
SELECT * FROM github_connections WHERE profile_id = $1;

-- Disconnect GitHub
DELETE FROM github_connections WHERE profile_id = $1;

-- Link repository to project
INSERT INTO github_repositories (project_id, github_repo_url, repo_name, repo_owner, description, languages)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- Get repositories for a project
SELECT * FROM github_repositories WHERE project_id = $1 ORDER BY created_at DESC;

-- Get recent GitHub activity for a project repository
SELECT ga.*
FROM github_activity ga
JOIN github_repositories gr ON gr.id = ga.repository_id
WHERE gr.project_id = $1
ORDER BY ga.activity_date DESC
LIMIT 20;

-- ============================================================
-- 17. AI ANALYSIS QUERIES
-- ============================================================

-- Store compatibility analysis result
INSERT INTO ai_analyses (type, project_id, user_id, input_context, output_result, model_used, confidence, expires_at)
VALUES ('compatibility', $1, $2, $3, $4, $5, $6, NOW() + INTERVAL '30 days')
RETURNING id;

-- Link AI analysis to join request
UPDATE join_requests SET ai_analysis_id = $2 WHERE id = $1;

-- Get AI analysis for a join request
SELECT aa.*
FROM ai_analyses aa
JOIN join_requests jr ON jr.ai_analysis_id = aa.id
WHERE jr.id = $1;

-- Store skill gap analysis
INSERT INTO ai_analyses (type, project_id, input_context, output_result, model_used, confidence)
VALUES ('skill_gap', $1, $2, $3, $4, $5)
RETURNING *;

-- Store project summary analysis
INSERT INTO ai_analyses (type, project_id, input_context, output_result, model_used, confidence)
VALUES ('project_summary', $1, $2, $3, $4, $5)
RETURNING *;

-- Get analyses for a project
SELECT * FROM ai_analyses
WHERE project_id = $1
ORDER BY created_at DESC;

-- Get analyses for a user
SELECT * FROM ai_analyses
WHERE user_id = $1
ORDER BY created_at DESC;

-- ============================================================
-- 18. TEAM RECOMMENDATION QUERIES
-- ============================================================

-- Store team recommendation
INSERT INTO team_recommendations (
    project_id, ai_analysis_id, recommended_team, role_coverage,
    skill_coverage, skill_duplication, gaps, alternatives, reasoning, confidence
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- Get latest team recommendation for a project
SELECT tr.*, aa.output_result AS full_analysis
FROM team_recommendations tr
LEFT JOIN ai_analyses aa ON aa.id = tr.ai_analysis_id
WHERE tr.project_id = $1
ORDER BY tr.created_at DESC
LIMIT 1;

-- Get all team recommendations for a project (history)
SELECT * FROM team_recommendations
WHERE project_id = $1
ORDER BY created_at DESC;

-- ============================================================
-- 19. NOTIFICATION QUERIES
-- ============================================================

-- Create notification
INSERT INTO notifications (user_id, type, title, message, link)
VALUES ($1, $2, $3, $4, $5);

-- Get user notifications
SELECT * FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 50;

-- Get unread notification count
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1 AND read = FALSE;

-- Mark notification as read
UPDATE notifications SET read = TRUE
WHERE id = $1 AND user_id = $2;

-- Mark all notifications as read
UPDATE notifications SET read = TRUE
WHERE user_id = $1 AND read = FALSE;

-- Delete old read notifications (cleanup)
DELETE FROM notifications
WHERE user_id = $1 AND read = TRUE
  AND created_at < NOW() - INTERVAL '90 days';

-- ============================================================
-- 20. ACTIVITY LOG QUERIES
-- ============================================================

-- Log activity
INSERT INTO activity_logs (project_id, user_id, action, metadata)
VALUES ($1, $2, $3, $4);

-- Get project activity timeline
SELECT
    al.*,
    p.full_name AS user_name
FROM activity_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE al.project_id = $1
ORDER BY al.created_at DESC
LIMIT 50;

-- Get recent platform-wide activity (admin)
SELECT al.*, p.full_name AS user_name, proj.title AS project_title
FROM activity_logs al
LEFT JOIN profiles p ON p.id = al.user_id
LEFT JOIN projects proj ON proj.id = al.project_id
ORDER BY al.created_at DESC
LIMIT 100;

-- ============================================================
-- 21. ADMIN QUERIES
-- ============================================================

-- Get all users with status (admin view)
SELECT
    p.*,
    au.email,
    au.email_confirmed_at IS NOT NULL AS email_verified,
    sp.degree_program,
    fp.designation
FROM profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN student_profiles sp ON sp.profile_id = p.id
LEFT JOIN faculty_profiles fp ON fp.profile_id = p.id
ORDER BY p.created_at DESC;

-- Suspend/restore user
UPDATE profiles SET status = $2 WHERE id = $1;

-- Soft delete user
UPDATE profiles SET status = 'deleted', deleted_at = NOW() WHERE id = $1;

-- Moderate project (flag, remove, restore)
UPDATE projects SET status = $2 WHERE id = $1;

-- Get all reports
SELECT
    r.*,
    reporter.full_name AS reporter_name,
    target_user.full_name AS reported_user_name,
    target_proj.title AS reported_project_title
FROM reports r
JOIN profiles reporter ON reporter.id = r.reporter_id
LEFT JOIN profiles target_user ON target_user.id = r.reported_user_id
LEFT JOIN projects target_proj ON target_proj.id = r.reported_project_id
ORDER BY r.created_at DESC;

-- Resolve report
UPDATE reports SET status = $2, action = $3, resolved_at = NOW()
WHERE id = $1;

-- File a report
INSERT INTO reports (reporter_id, reported_user_id, reported_project_id, type, description)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- Record admin action
INSERT INTO admin_actions (admin_id, action, target_type, target_id, metadata)
VALUES ($1, $2, $3, $4, $5);

-- Get admin audit log
SELECT aa.*, p.full_name AS admin_name
FROM admin_actions aa
JOIN profiles p ON p.id = aa.admin_id
ORDER BY aa.created_at DESC
LIMIT 100;

-- Get AI call logs (from ai_analyses)
SELECT type, COUNT(*) AS total_calls,
       COUNT(*) FILTER (WHERE confidence IS NOT NULL) AS successful
FROM ai_analyses
GROUP BY type
ORDER BY type;

-- ============================================================
-- 22. DASHBOARD QUERIES
-- ============================================================

-- ---- STUDENT DASHBOARD ----

-- Profile completeness (already on profiles table)
SELECT profile_completeness FROM profiles WHERE id = $1;

-- Active projects (member of)
SELECT p.*, pm.system_role, pm.role_id
FROM projects p
JOIN project_members pm ON pm.project_id = p.id
WHERE pm.user_id = $1 AND pm.status = 'active' AND p.deleted_at IS NULL
ORDER BY p.updated_at DESC;

-- Pending applications
SELECT jr.*, p.title AS project_title, pr.name AS role_name
FROM join_requests jr
JOIN projects p ON p.id = jr.project_id
LEFT JOIN project_roles pr ON pr.id = jr.selected_role_id
WHERE jr.applicant_id = $1 AND jr.status = 'pending'
ORDER BY jr.created_at DESC;

-- Recent notifications (top 5)
SELECT * FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 5;

-- Recommended projects placeholder structure
-- (Actual recommendation computed by Edge Function, results stored in ai_analyses)
SELECT aa.output_result AS recommendations
FROM ai_analyses aa
WHERE aa.type = 'project_summary' AND aa.user_id = $1
ORDER BY aa.created_at DESC
LIMIT 1;

-- ---- FACULTY DASHBOARD ----

-- Mentoring projects
SELECT p.*, pm.system_role
FROM projects p
JOIN project_members pm ON pm.project_id = p.id
WHERE pm.user_id = $1 AND pm.system_role = 'mentor' AND pm.status = 'active'
ORDER BY p.updated_at DESC;

-- Pending mentorship requests for faculty
SELECT mr.*, p.title AS project_title, owner.full_name AS owner_name
FROM mentorship_requests mr
JOIN projects p ON p.id = mr.project_id
JOIN profiles owner ON owner.id = p.owner_id
WHERE mr.faculty_id = $1 AND mr.status = 'pending'
ORDER BY mr.created_at DESC;

-- ---- OWNER DASHBOARD ----

-- Owned projects with stats
SELECT
    p.*,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id AND pm.status = 'active') AS member_count,
    (SELECT COUNT(*) FROM join_requests jr WHERE jr.project_id = p.id AND jr.status = 'pending') AS pending_applications,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS total_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') AS completed_tasks
FROM projects p
WHERE p.owner_id = $1 AND p.deleted_at IS NULL
ORDER BY p.updated_at DESC;

-- ---- ADMIN DASHBOARD ----

-- Platform stats
SELECT
    (SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL) AS total_users,
    (SELECT COUNT(*) FROM profiles WHERE status = 'active' AND last_active_at > NOW() - INTERVAL '7 days') AS active_users_7d,
    (SELECT COUNT(*) FROM profiles WHERE role = 'student') AS total_students,
    (SELECT COUNT(*) FROM profiles WHERE role = 'faculty') AS total_faculty,
    (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL) AS total_projects,
    (SELECT COUNT(*) FROM projects WHERE status = 'open') AS open_projects,
    (SELECT COUNT(*) FROM projects WHERE status = 'completed') AS completed_projects,
    (SELECT COUNT(*) FROM join_requests) AS total_join_requests,
    (SELECT COUNT(*) FROM join_requests WHERE status = 'pending') AS pending_requests,
    (SELECT COUNT(*) FROM ai_analyses) AS total_ai_analyses,
    (SELECT COUNT(*) FROM reports WHERE status = 'pending') AS pending_reports;

-- ============================================================
-- 23. ANALYTICS QUERIES
-- ============================================================

-- Projects by type
SELECT project_type, COUNT(*) AS count
FROM projects WHERE deleted_at IS NULL
GROUP BY project_type ORDER BY count DESC;

-- Projects by status
SELECT status, COUNT(*) AS count
FROM projects WHERE deleted_at IS NULL
GROUP BY status ORDER BY count DESC;

-- Projects by difficulty
SELECT difficulty, COUNT(*) AS count
FROM projects WHERE deleted_at IS NULL
GROUP BY difficulty ORDER BY count DESC;

-- Top skills on the platform
SELECT s.name AS skill, COUNT(us.id) AS user_count
FROM user_skills us
JOIN skills s ON s.id = us.skill_id
GROUP BY s.name ORDER BY user_count DESC LIMIT 20;

-- Top interests on the platform
SELECT ri.name AS interest, COUNT(ui.id) AS user_count
FROM user_interests ui
JOIN research_interests ri ON ri.id = ui.interest_id
GROUP BY ri.name ORDER BY user_count DESC LIMIT 20;

-- Registrations over time (last 30 days)
SELECT DATE(created_at) AS reg_date, COUNT(*) AS registrations
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY reg_date;

-- Project creation over time (last 30 days)
SELECT DATE(created_at) AS create_date, COUNT(*) AS projects_created
FROM projects
WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL
GROUP BY DATE(created_at)
ORDER BY create_date;

-- Application acceptance rate
SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
    COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
    COUNT(*) FILTER (WHERE status = 'withdrawn') AS withdrawn,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'accepted')::NUMERIC /
        NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected')), 0) * 100,
        1
    ) AS acceptance_rate
FROM join_requests;

-- Average team size
SELECT AVG(member_count)::NUMERIC(5,2) AS avg_team_size
FROM (
    SELECT project_id, COUNT(*) AS member_count
    FROM project_members WHERE status = 'active'
    GROUP BY project_id
) sub;


-- ============================================================
-- SEED DATA
-- ============================================================
-- Taxonomy and configuration seed data.
-- Does not create fake users (Supabase Auth manages user creation).

-- Skill categories
INSERT INTO skill_categories (name, description) VALUES
    ('Programming', 'Programming languages and paradigms'),
    ('Machine Learning', 'ML, DL, and AI techniques'),
    ('Data', 'Data processing, analysis, and science'),
    ('Systems', 'Systems engineering, DevOps, and infrastructure'),
    ('Research', 'Academic research skills'),
    ('Design', 'UI/UX and product design'),
    ('Domain', 'Domain-specific technical skills')
ON CONFLICT (name) DO NOTHING;

-- Skills (linked to categories)
INSERT INTO skills (name, category_id) VALUES
    -- Programming
    ('Python',      (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('Java',        (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('C++',         (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('JavaScript',  (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('TypeScript',  (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('Go',          (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('R',           (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('MATLAB',      (SELECT id FROM skill_categories WHERE name = 'Programming')),
    -- Machine Learning
    ('Machine Learning',            (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('Deep Learning',               (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('Computer Vision',             (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('Natural Language Processing', (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('Reinforcement Learning',      (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('MLOps',                       (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    -- Data
    ('Data Analysis',    (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('Data Science',     (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('Statistics',       (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('SQL',              (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('Pandas',           (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('Dataset Curation', (SELECT id FROM skill_categories WHERE name = 'Data')),
    -- Systems
    ('Backend',  (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('Frontend', (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('Cloud',    (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('DevOps',   (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('Git',      (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('Docker',   (SELECT id FROM skill_categories WHERE name = 'Systems')),
    -- Research
    ('Research Writing',    (SELECT id FROM skill_categories WHERE name = 'Research')),
    ('Literature Review',   (SELECT id FROM skill_categories WHERE name = 'Research')),
    ('Experiment Design',   (SELECT id FROM skill_categories WHERE name = 'Research')),
    ('Academic Publishing', (SELECT id FROM skill_categories WHERE name = 'Research')),
    ('Survey Design',       (SELECT id FROM skill_categories WHERE name = 'Research')),
    -- Design
    ('UI/UX',          (SELECT id FROM skill_categories WHERE name = 'Design')),
    ('Figma',          (SELECT id FROM skill_categories WHERE name = 'Design')),
    ('Product Design', (SELECT id FROM skill_categories WHERE name = 'Design')),
    -- Domain
    ('Healthcare AI',    (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('Agriculture Tech', (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('Cybersecurity',    (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('IoT',              (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('Robotics',         (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('HCI',              (SELECT id FROM skill_categories WHERE name = 'Domain'))
ON CONFLICT (name) DO NOTHING;

-- Interest categories
INSERT INTO interest_categories (name, description) VALUES
    ('Computing', 'Core computer science and AI research areas'),
    ('Science', 'Applied science and interdisciplinary research'),
    ('Society', 'Technology impact on education and society'),
    ('Engineering', 'Systems, hardware, and security research')
ON CONFLICT (name) DO NOTHING;

-- Research interests (linked to categories)
INSERT INTO research_interests (name, category_id) VALUES
    -- Computing
    ('Artificial Intelligence',     (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Machine Learning',            (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Computer Vision',             (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Natural Language Processing', (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Human-Computer Interaction',  (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Distributed Systems',         (SELECT id FROM interest_categories WHERE name = 'Computing')),
    -- Science
    ('Healthcare AI',          (SELECT id FROM interest_categories WHERE name = 'Science')),
    ('Computational Biology',  (SELECT id FROM interest_categories WHERE name = 'Science')),
    ('Climate Informatics',    (SELECT id FROM interest_categories WHERE name = 'Science')),
    ('Agriculture Tech',       (SELECT id FROM interest_categories WHERE name = 'Science')),
    -- Society
    ('Education Technology', (SELECT id FROM interest_categories WHERE name = 'Society')),
    ('Digital Humanities',   (SELECT id FROM interest_categories WHERE name = 'Society')),
    ('Responsible AI',       (SELECT id FROM interest_categories WHERE name = 'Society')),
    ('Accessibility',        (SELECT id FROM interest_categories WHERE name = 'Society')),
    -- Engineering
    ('Embedded Systems',      (SELECT id FROM interest_categories WHERE name = 'Engineering')),
    ('Robotics',              (SELECT id FROM interest_categories WHERE name = 'Engineering')),
    ('Cybersecurity',         (SELECT id FROM interest_categories WHERE name = 'Engineering')),
    ('Software Engineering',  (SELECT id FROM interest_categories WHERE name = 'Engineering'))
ON CONFLICT (name) DO NOTHING;

-- Project types
INSERT INTO project_types (name, description) VALUES
    ('Academic Project',      'Course-related academic projects and assignments'),
    ('Research Project',      'Original research investigations'),
    ('Final-Year Project',    'Capstone/thesis projects for graduating students'),
    ('Hackathon',             'Time-bounded competitive innovation events'),
    ('Innovation Project',    'Novel solution development and prototyping'),
    ('Open-Source',           'Open-source software contributions'),
    ('Publication-Oriented',  'Projects aimed at academic publication'),
    ('Faculty-Led Research',  'Research projects led by faculty members'),
    ('Interdisciplinary',     'Projects spanning multiple academic disciplines')
ON CONFLICT (name) DO NOTHING;

-- Platform configuration defaults
INSERT INTO platform_configuration (key, value, description) VALUES
    ('recommendation_weights', '{"skill": 0.28, "interest": 0.22, "role": 0.16, "experience": 0.14, "recency": 0.12, "availability": 0.08}', 'Weights for project recommendation scoring'),
    ('compatibility_weights', '{"skill": 0.35, "interest": 0.25, "role": 0.20, "experience": 0.20}', 'Weights for compatibility analysis scoring'),
    ('ai_disclaimer', '"This is an AI-estimated compatibility score, not an objective measurement of ability. AI recommends; humans decide."', 'Standard AI disclaimer text'),
    ('max_applications_per_user', '10', 'Maximum pending applications a user can have'),
    ('profile_completeness_threshold', '70', 'Minimum profile completeness for AI matching')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- END OF QUERIES AND SEED DATA
-- ============================================================
