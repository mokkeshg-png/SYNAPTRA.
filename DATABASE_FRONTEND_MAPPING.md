# SYNAPTRA — Database ↔ Frontend Operation Mapping

> This document maps every frontend feature and localStorage/store.ts operation to its
> corresponding Supabase table, operation type, and RLS requirement.
> It is the authoritative reference before any migration is performed.
>
> **Status: MAPPING COMPLETE — awaiting approval before migration begins.**

---

## Section 1 — Architecture Overview

### Current Architecture (localStorage)
```
Browser
  └─ AuthContext (useAuth)
       └─ store.ts (initStore / persist)
            └─ localStorage["synaptra-state-v1"]  ← single JSON blob
                 Contains: users, profiles, projects, members, joinRequests,
                           invitations, detailsRequests, mentorshipRequests,
                           tasks, taskComments, milestones, activity,
                           notifications, notes, references, experiments,
                           meetings, datasets, documents, discussions,
                           replies, reports, auditLogs, aiLogs, sessionUserId
```

### Target Architecture (Supabase)
```
Browser
  └─ AuthContext (Supabase Auth session)
       └─ supabase.ts (real createClient)
            └─ Supabase PostgreSQL (RLS-enforced)
                 └─ Supabase Storage (documents/avatars)
```

### What is NOT migrated to Supabase
| Item | Reason |
|---|---|
| `DEMO_CREDENTIALS` / seed personas | Dev-only; removed in production |
| `passwordHash` | Supabase Auth manages credentials |
| `verificationToken` / `resetToken` | Supabase Auth manages email verification and password reset |
| `resetStore()` / demo re-seed | Dev utility; kept local |
| AI scoring logic (`matching.ts`) | Runs client-side; results stored in `ai_analyses` |
| `completeness.ts` | Runs client-side; result stored in `profiles.profile_completeness` |
| Notification preferences (Settings toggles) | UI-only state; no DB table needed yet |

---

## Section 2 — Feature Operation Map

Each entry follows this structure:
- **Frontend feature**: Page / component / hook
- **Current store operation**: The `store.ts` function called
- **Store action**: What it does to localStorage
- **Supabase table**: Target table(s)
- **Supabase operation**: SELECT / INSERT / UPDATE / DELETE / UPSERT
- **RLS requirement**: Who is allowed to perform this operation

---

### 2.1 AUTHENTICATION

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Sign In (Login.tsx) | `login(email, password)` | Hash password, find user in `state.users`, set `sessionUserId` | `auth.users` (internal) | `supabase.auth.signInWithPassword()` | Public — no RLS (Auth layer) |
| Sign Out (Navbar) | `logout()` | Set `sessionUserId = null`, persist | `auth.sessions` (internal) | `supabase.auth.signOut()` | Authenticated user only |
| Register (Register.tsx) | `registerUser(input)` | Create `User` + `Profile` in state | `auth.users` + `profiles` | `supabase.auth.signUp()` → trigger creates profile row | Public — no RLS (Auth layer) |
| Password Reset Request (Login.tsx) | `requestPasswordReset(email)` | Store reset token in user object | `auth.users` (internal) | `supabase.auth.resetPasswordForEmail()` | Public — no RLS |
| Password Reset Confirm (Login.tsx) | `resetPassword(token, password)` | Update `passwordHash` in user object | `auth.users` (internal) | `supabase.auth.updateUser({ password })` | Authenticated user with valid reset token |
| Session Restore on page load | `initStore()` | Load entire state from localStorage | `auth.users` (internal) | `supabase.auth.getSession()` | Auth session cookie |
| Update last active | `touchUser(id)` | Set `lastActiveAt` on user object | `profiles` | UPDATE `last_active_at = NOW()` | `auth.uid() = id` |

**Migration notes:**
- `registerUser` must trigger a DB function or Supabase Auth webhook that auto-creates a `profiles` row (using `handle_new_user` trigger pattern).
- The demo "one-click persona" buttons in Login.tsx and Settings.tsx use `login()` + `DEMO_CREDENTIALS` — these will continue to work if demo users are seeded into Supabase Auth.

---

### 2.2 PROFILES

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View own profile (Profile.tsx) | `getState().profiles.find(...)` | Read from state | `profiles` + `student_profiles` or `faculty_profiles` + `user_skills` + `user_interests` + `user_past_projects` + `user_internships` + `user_certifications` + `user_publications` | SELECT with JOINs | `auth.uid() = profiles.id` OR `visibility != 'private'` |
| View other user's profile (Profile.tsx `/:id`) | `getState().profiles.find(...)` | Read from state | Same as above | SELECT | `visibility = 'public'` OR same institution (institution) OR member of shared project |
| Edit profile (Profile.tsx modal) | `saveProfile(userId, patch)` | Merge patch into profile object | `profiles` | UPDATE | `auth.uid() = id` |
| Onboarding save (Onboarding.tsx) | `saveProfile(userId, patch)` | Merge full profile patch | `profiles` + `student_profiles` or `faculty_profiles` | UPDATE / UPSERT | `auth.uid() = id` |
| Save skills (Onboarding, step 2) | `saveProfile(userId, { skills })` | Replace skills array on profile | `user_skills` (bulk: DELETE then INSERT) | DELETE old + INSERT new | `auth.uid() = profile_id` |
| Save interests (Onboarding, step 3) | `saveProfile(userId, { interests })` | Replace interests array on profile | `user_interests` (bulk: DELETE then INSERT) | DELETE old + INSERT new | `auth.uid() = profile_id` |
| Save past projects (Onboarding, step 4) | `saveProfile(userId, { pastProjects })` | Replace embedded array | `user_past_projects` (bulk: DELETE then INSERT) | DELETE old + INSERT new | `auth.uid() = profile_id` |
| Save internships (Onboarding, step 4) | `saveProfile(userId, { internships })` | Replace embedded array | `user_internships` (bulk: DELETE then INSERT) | DELETE old + INSERT new | `auth.uid() = profile_id` |
| Profile completeness recalc | `computeCompleteness(profile)` | Compute number, store on profile | `profiles` | UPDATE `profile_completeness` | `auth.uid() = id` |
| Browse collaborators (Collaborators.tsx) | `getState().profiles.filter(...)` | Read + filter all profiles | `profiles` + `student_profiles` / `faculty_profiles` | SELECT WHERE `status = 'active'` AND `visibility != 'private'` | Authenticated users; visibility-filtered by RLS |

---

### 2.3 SKILLS & INTERESTS (Taxonomy)

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Load skill list (Onboarding step 2, ProjectCreate) | `ALL_SKILLS` constant from `taxonomies.ts` | Static array — no store call | `skills` JOIN `skill_categories` | SELECT all (ordered by category) | Public read — no auth required |
| Load research domains (Onboarding step 3) | `RESEARCH_DOMAINS` constant from `taxonomies.ts` | Static array — no store call | `research_interests` JOIN `interest_categories` | SELECT all | Public read — no auth required |
| Add skill to user | `saveProfile(userId, { skills })` | Replaces skills array | `user_skills` | UPSERT (`ON CONFLICT DO UPDATE`) | `auth.uid() = profile_id` |
| Remove skill from user | `saveProfile(userId, { skills })` | Replaces skills array | `user_skills` | DELETE WHERE `profile_id = auth.uid()` | `auth.uid() = profile_id` |

**Migration note:** `ALL_SKILLS` and `RESEARCH_DOMAINS` in `taxonomies.ts` are currently hardcoded arrays. After migration they should be fetched from `skills` and `research_interests` tables. Taxonomy tables are seeded via `seed.sql`.

---

### 2.4 PROJECTS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Browse projects (Projects.tsx) | `getState().projects` | Read all from state | `projects` | SELECT WHERE `deleted_at IS NULL` AND `status NOT IN ('removed')` | Public: `visibility != 'private'`; members see their private projects |
| View project detail (ProjectDetail.tsx) | `getState().projects.find(id)` | Read from state | `projects` + `project_roles` | SELECT + JOIN | Public for public/restricted (full details gated); private: members/invited only |
| Create project (ProjectCreate.tsx) | `createProject(ownerId, data)` | Push project + member(owner) to state | `projects` + `project_roles` + `project_members` | INSERT project → INSERT roles → INSERT owner member | Authenticated users only; `owner_id = auth.uid()` |
| Update project (ProjectRoom settings) | `updateProject(ownerId, projectId, patch)` | Merge patch into project | `projects` | UPDATE WHERE `id = $1 AND owner_id = auth.uid()` | `owner_id = auth.uid()` |
| Close project | `closeProject(ownerId, projectId)` | Set `status = 'closed'` | `projects` | UPDATE `status = 'closed'` | `owner_id = auth.uid()` |
| Complete project | `completeProject(ownerId, projectId)` | Set `status = 'completed'` | `projects` | UPDATE `status = 'completed'` | `owner_id = auth.uid()` |
| Delete project | `deleteProject(ownerId, projectId)` | Remove from projects array | `projects` | UPDATE `deleted_at = NOW(), status = 'removed'` (soft delete) | `owner_id = auth.uid()` |
| Set GitHub repo on project | `setProjectGithub(ownerId, projectId, repo)` | Set `githubRepo` on project | `projects` | UPDATE `github_repo = $1` | `owner_id = auth.uid()` |

---

### 2.5 PROJECT ROLES

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Create roles during project creation (ProjectCreate.tsx) | `createProject(...)` (roles embedded) | Push roles within state project object | `project_roles` | INSERT (one per role) | `owner_id = auth.uid()` (via project ownership) |
| Edit roles in project room | `updateProject(...)` (roles embedded) | Replace roles on project | `project_roles` | DELETE existing + INSERT new | `project.owner_id = auth.uid()` |

---

### 2.6 PROJECT MEMBERS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Auto-add owner on project create | `createProject(...)` | Push member record with `systemRole: 'owner'` | `project_members` | INSERT | Internal (owner creating project) |
| View team (ProjectRoom team tab) | `getState().members.filter(projectId)` | Read members from state | `project_members` JOIN `profiles` | SELECT WHERE `project_id = $1 AND status = 'active'` | Active project members can see team |
| Remove member (ProjectRoom) | `removeMember(ownerId, projectId, memberId)` | Set member `status = 'removed'` | `project_members` | UPDATE `status = 'removed'` | `project.owner_id = auth.uid()` |
| Leave project (ProjectRoom) | `leaveProject(userId, projectId)` | Set member `status = 'left'` | `project_members` | UPDATE `status = 'left'` | `user_id = auth.uid()` AND `system_role != 'owner'` |
| Assign role to member | `assignRole(ownerId, projectId, memberUserId, roleId)` | Set `roleId` on member | `project_members` | UPDATE `role_id = $1` | `project.owner_id = auth.uid()` |
| Transfer ownership | `transferOwnership(ownerId, projectId, newOwnerId)` | Swap `systemRole` on two members + update project `ownerId` | `project_members` (x2) + `projects` | UPDATE (demote old owner) + UPDATE (promote new owner) + UPDATE project | `project.owner_id = auth.uid()` |

---

### 2.7 JOIN REQUESTS / APPLICATIONS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Submit application (ProjectDetail.tsx) | `applyToProject(input)` | Push join request to state; runs `analyzeCompatibility` | `join_requests` + `ai_analyses` | INSERT join_request → INSERT ai_analysis → UPDATE join_request.ai_analysis_id | `applicant_id = auth.uid()` |
| View own applications (Dashboard.tsx) | `getState().joinRequests.filter(applicantId)` | Filter state | `join_requests` JOIN `projects` JOIN `project_roles` | SELECT WHERE `applicant_id = auth.uid()` | `applicant_id = auth.uid()` |
| View received applications (Dashboard.tsx, ProjectRoom applications tab) | `getState().joinRequests.filter(projectId)` | Filter state | `join_requests` JOIN `profiles` JOIN `ai_analyses` | SELECT WHERE `project_id IN (owned projects)` | `project.owner_id = auth.uid()` |
| Withdraw application | `withdrawApplication(applicantId, requestId)` | Set `status = 'withdrawn'` | `join_requests` | UPDATE `status = 'withdrawn'` | `applicant_id = auth.uid()` AND `status = 'pending'` |
| Accept application (ProjectRoom) | `reviewApplication(ownerId, requestId, 'accepted')` | Set status, push new member | `join_requests` + `project_members` | UPDATE status + INSERT member | `project.owner_id = auth.uid()` |
| Reject application (ProjectRoom) | `reviewApplication(ownerId, requestId, 'rejected', reason)` | Set status + rejectReason | `join_requests` | UPDATE `status = 'rejected', reject_reason = $1` | `project.owner_id = auth.uid()` |

---

### 2.8 INVITATIONS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Invite user to project (Profile.tsx, ProjectRoom) | `inviteUser(ownerId, projectId, inviteeId, roleId, message)` | Push invitation to state; notify invitee | `project_invitations` + `notifications` | INSERT invitation + INSERT notification | `project.owner_id = auth.uid()` |
| Accept/decline invitation (Dashboard, notifications) | `respondInvitation(userId, invitationId, accept)` | Update invitation status; if accepted push member | `project_invitations` + `project_members` (if accepted) | UPDATE invitation status + INSERT member (conditional) | `invitee_id = auth.uid()` |

---

### 2.9 DETAILS REQUESTS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Request full project details (ProjectDetail.tsx) | `requestFullDetails(userId, projectId)` | Push details request to state; notify owner | `details_requests` + `notifications` | INSERT + INSERT | `user_id = auth.uid()` |
| Grant/deny details request (ProjectRoom settings) | `resolveDetailsRequest(ownerId, requestId, grant)` | Update `status = 'granted'/'denied'` | `details_requests` | UPDATE `status` | `project.owner_id = auth.uid()` |

---

### 2.10 MENTORSHIP REQUESTS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Faculty requests to mentor (ProjectDetail.tsx) | `requestMentorship(facultyId, projectId, message)` | Push mentorship request to state; notify owner | `mentorship_requests` + `notifications` | INSERT + INSERT | `faculty_id = auth.uid()` AND `role = 'faculty'` |
| Accept/reject mentorship (Dashboard.tsx) | `reviewMentorship(ownerId, requestId, accept)` | Update status; if accepted push mentor member | `mentorship_requests` + `project_members` (if accepted) | UPDATE + INSERT (conditional) | `project.owner_id = auth.uid()` |

---

### 2.11 TASKS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View tasks (ProjectRoom tasks tab) | `getState().tasks.filter(projectId)` | Read from state | `tasks` JOIN `profiles` (assignee/creator) JOIN `project_roles` | SELECT WHERE `project_id = $1` | Active project members only |
| Create task | `saveTask(userId, projectId, data)` | Push task to state; notify assignee | `tasks` + `notifications` | INSERT + INSERT (if assignee exists) | Active project member: `canAccessRoom` check |
| Update task | `saveTask(userId, projectId, data, existingId)` | Merge patch into task | `tasks` | UPDATE WHERE `id = $1` | Active project member |
| Update task status only | `saveTask(userId, projectId, { status }, id)` | Update status field | `tasks` | UPDATE `status = $1` | Active project member |
| Delete task | (direct — `getState().tasks.filter(...)`) | Remove from tasks array | `tasks` | DELETE WHERE `id = $1` | Task creator OR project owner |
| Add task comment | `commentOnTask(userId, taskId, body)` | Push comment to state | `task_comments` | INSERT | Active project member |
| View task comments | `getState().taskComments.filter(taskId)` | Read from state | `task_comments` JOIN `profiles` | SELECT WHERE `task_id = $1` | Active project member |

---

### 2.12 MILESTONES

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View milestones (ProjectRoom) | `getState().milestones.filter(projectId)` | Read from state | `milestones` | SELECT WHERE `project_id = $1` | Active project members |
| Add milestone | `addMilestone(userId, projectId, title, dueDate, description)` | Push milestone to state | `milestones` | INSERT | Active project member |
| Toggle milestone complete | `toggleMilestone(userId, id)` | Flip `completed` boolean | `milestones` | UPDATE `completed = NOT completed` | Active project member |

---

### 2.13 RESEARCH WORKSPACE

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View notes | `getState().notes.filter(projectId)` | Read from state | `research_notes` JOIN `profiles` | SELECT WHERE `project_id = $1` | Active project member |
| Add note | `addNote(userId, projectId, data)` | Push note to state | `research_notes` | INSERT | Active project member |
| Edit note | (not in store — missing) | — | `research_notes` | UPDATE WHERE `id = $1 AND created_by = auth.uid()` | `created_by = auth.uid()` |
| Delete note | (not in store — missing) | — | `research_notes` | DELETE WHERE `id = $1 AND created_by = auth.uid()` | `created_by = auth.uid()` |
| View references | `getState().references.filter(projectId)` | Read from state | `reference_items` JOIN `profiles` | SELECT WHERE `project_id = $1` | Active project member |
| Add reference | `addReference(userId, projectId, data)` | Push reference to state | `reference_items` | INSERT | Active project member |
| View experiments | `getState().experiments.filter(projectId)` | Read from state | `experiments` JOIN `profiles` | SELECT WHERE `project_id = $1` | Active project member |
| Add experiment | `addExperiment(userId, projectId, data)` | Push experiment to state | `experiments` | INSERT | Active project member |
| View meetings | `getState().meetings.filter(projectId)` | Read from state | `meeting_notes` JOIN `profiles` | SELECT WHERE `project_id = $1` | Active project member |
| Add meeting | `addMeeting(userId, projectId, data)` | Push meeting to state | `meeting_notes` | INSERT | Active project member |
| View datasets | `getState().datasets.filter(projectId)` | Read from state | `datasets` JOIN `profiles` | SELECT WHERE `project_id = $1` | Active project member |
| Add dataset | `addDataset(userId, projectId, data)` | Push dataset to state | `datasets` | INSERT | Active project member |

---

### 2.14 DOCUMENTS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View documents (ProjectRoom documents tab) | `getState().documents.filter(projectId)` | Read from state | `documents` JOIN `profiles` | SELECT WHERE `project_id = $1` AND access check | Active member (members); Owner/mentor only for restricted |
| Upload document | `addDocument(userId, projectId, file)` | Push document (with base64 dataUrl) to state | `documents` + Supabase Storage `documents/` bucket | Storage upload → INSERT metadata row | Active project member |

**Critical migration note:** The frontend stores documents as base64 `dataUrl` strings directly in the state blob. In Supabase, files go to Storage and only the `storage_path` is stored in `documents`. The upload flow must change to: `supabase.storage.from('documents').upload(path, file)` → insert metadata row with returned path. The frontend `DocumentItem.dataUrl` field maps to Supabase Storage signed URL on read.

---

### 2.15 DISCUSSIONS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View discussions (ProjectRoom) | `getState().discussions.filter(projectId)` | Read from state | `discussions` JOIN `profiles` | SELECT WHERE `project_id = $1` | Active project member |
| Create discussion | `addDiscussion(userId, projectId, title, body)` | Push discussion to state; notify @mentions | `discussions` + `notifications` (for mentions) | INSERT + INSERT (per mention) | Active project member |
| View replies | `getState().replies.filter(discussionId)` | Read from state | `discussion_replies` JOIN `profiles` | SELECT WHERE `discussion_id = $1` | Active project member |
| Add reply | `addReply(userId, discussionId, body)` | Push reply to state | `discussion_replies` | INSERT | Active project member |

---

### 2.16 GITHUB METADATA

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Connect GitHub (Settings.tsx / Profile.tsx) | `saveProfile(userId, { githubUsername, githubConnected: true })` | Update profile fields | `profiles` + `github_connections` | UPDATE profiles + UPSERT github_connections | `auth.uid() = profile_id` |
| Fetch GitHub public data | `fetchGithubPublic(username)` from `github.ts` | External HTTP call to api.github.com | `github_connections` (save result) | UPSERT (on_conflict update last_synced_at) | `auth.uid() = profile_id` |
| Link repo to project | `setProjectGithub(ownerId, projectId, repo)` | Set `githubRepo` on project | `github_repositories` | INSERT (new) or UPDATE | `project.owner_id = auth.uid()` |

---

### 2.17 NOTIFICATIONS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View notifications (Navbar bell) | `getState().notifications.filter(userId)` | Read from state | `notifications` | SELECT WHERE `user_id = auth.uid()` ORDER BY `created_at DESC` LIMIT 50 | `user_id = auth.uid()` |
| Unread count | `getState().notifications.filter(n => !n.read)` | Count from state | `notifications` | SELECT COUNT(*) WHERE `user_id = auth.uid() AND read = FALSE` | `user_id = auth.uid()` |
| Mark one read | `markNotificationRead(userId, id)` | Set `read = true` on notification | `notifications` | UPDATE `read = TRUE` WHERE `id = $1 AND user_id = auth.uid()` | `user_id = auth.uid()` |
| Mark all read | `markAllRead(userId)` | Set all `read = true` | `notifications` | UPDATE `read = TRUE` WHERE `user_id = auth.uid() AND read = FALSE` | `user_id = auth.uid()` |
| Create notification (internal) | `notify(userId, ...)` | Push to state notifications | `notifications` | INSERT | Server-side via RLS `BYPASS` on trigger or service role Edge Function |

**RLS note:** Notifications are written server-side (triggered by other user actions). The INSERT policy for `notifications` should only allow the Supabase `service_role` or a DB trigger function. Clients only SELECT/UPDATE their own rows. The `send-notification` Edge Function in the repo is the intended write path.

---

### 2.18 ACTIVITY LOGS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View project activity (ProjectRoom overview) | `getState().activity.filter(projectId)` | Read from state | `activity_logs` JOIN `profiles` | SELECT WHERE `project_id = $1` ORDER BY `created_at DESC` LIMIT 50 | Active project member |
| Log activity (internal) | `activity(projectId, userId, type, message)` | Push to state | `activity_logs` | INSERT | Active project member OR DB trigger |

---

### 2.19 AI ANALYSIS

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| Compatibility analysis on application | `analyzeCompatibility(project, profile, roleName)` | Pure function → result embedded in JoinRequest | `ai_analyses` | INSERT `type='compatibility', output_result=JSON` → FK stored on join_request | `user_id = auth.uid()` OR via Edge Function |
| Skill gap analysis (ProjectRoom AI tab) | `analyzeSkillGap(project, members, candidates)` | Pure function → displayed in UI | `ai_analyses` | INSERT `type='skill_gap'` | Project member |
| Project assistant summary (ProjectRoom AI tab) | `projectAssistantSummary(input)` | Pure function → displayed in UI | `ai_analyses` | INSERT `type='project_summary'` | Project member |
| Recommend projects (Dashboard) | `recommendProjects(profile, projects, excludeIds)` | Pure function → displayed | *(No DB write for display)* | (Optional: INSERT `type='project_summary'` for caching) | Authenticated user |
| Recommend collaborators (Dashboard) | `recommendCollaborators(profile, others, sharedIds)` | Pure function → displayed | *(No DB write for display)* | N/A | Authenticated user |
| Team recommendation (ProjectRoom AI-team tab) | `recommendTeam(project, applicants)` | Pure function → displayed | `team_recommendations` | INSERT | `project.owner_id = auth.uid()` |
| Analyze profile skills (Profile.tsx) | `analyzeProfileSkills(profile)` | Pure function → displayed | *(No DB write)* | N/A | Own profile |

**Note:** All AI functions in `matching.ts` are pure TypeScript — they do not call any external API. They compute results locally from state data. After migration, they will compute from Supabase-fetched data. The results can optionally be stored in `ai_analyses` for history/caching.

---

### 2.20 ADMIN FEATURES

| Feature | Store Function | Store Action | Supabase Table | Supabase Operation | RLS Requirement |
|---|---|---|---|---|---|
| View all users (Admin.tsx users tab) | `getState().users` + `getState().profiles` | Read from state | `profiles` JOIN `auth.users` (via admin API) | SELECT all | `role = 'admin'` — admin-only RLS policy |
| Suspend/restore user | `suspendUser(adminId, userId)` | Toggle `status` field on user | `profiles` | UPDATE `status = 'suspended'/'active'` | `role = 'admin'` |
| Delete user | `deleteUser(adminId, userId)` | Set `status = 'deleted'` | `profiles` | UPDATE `status = 'deleted', deleted_at = NOW()` | `role = 'admin'` |
| Moderate project | `moderateProject(adminId, projectId, status)` | Set project status | `projects` | UPDATE `status = 'flagged'/'removed'/'open'` | `role = 'admin'` |
| View reports | `getState().reports` | Read from state | `reports` JOIN `profiles` JOIN `projects` | SELECT all | `role = 'admin'` |
| Resolve report | `resolveReport(adminId, reportId, action)` | Set report status + trigger follow-up action | `reports` + `admin_actions` | UPDATE report + INSERT audit log | `role = 'admin'` |
| File report (Profile.tsx) | `fileReport(reporterId, targetType, targetId, type, details)` | Push report to state | `reports` | INSERT | Authenticated user |
| View audit log (Admin.tsx) | `getState().auditLogs` | Read from state | `admin_actions` JOIN `profiles` | SELECT all | `role = 'admin'` |
| Admin action log | `adminAction(adminId, action, target, details)` | Push to audit logs | `admin_actions` | INSERT | `role = 'admin'` |
| Re-seed demo data (Settings.tsx) | `resetStore()` + `initStore()` | Clear + re-create localStorage state | N/A | N/A | Dev-only — not migrated |

---

## Section 3 — RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Public (`visibility` filtered) | Auth trigger only (on signup) | `auth.uid() = id` | `auth.uid() = id` (soft delete via status) |
| `student_profiles` | Via profiles RLS | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `faculty_profiles` | Via profiles RLS | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `user_skills` | Via profiles RLS | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `user_interests` | Via profiles RLS | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `user_past_projects` | Via profiles RLS | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `user_internships` | Via profiles RLS | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `user_certifications` | Via profiles RLS | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `user_publications` | Via profiles RLS | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `skills` | Public | Admin only | Admin only | Admin only |
| `skill_categories` | Public | Admin only | Admin only | Admin only |
| `research_interests` | Public | Admin only | Admin only | Admin only |
| `interest_categories` | Public | Admin only | Admin only | Admin only |
| `project_types` | Public | Admin only | Admin only | Admin only |
| `projects` | Public (visibility filtered) | `auth.uid() = owner_id` | `auth.uid() = owner_id` | Owner (soft delete) |
| `project_roles` | Via project RLS | `project.owner_id = auth.uid()` | `project.owner_id = auth.uid()` | `project.owner_id = auth.uid()` |
| `project_members` | Active members of project | System/owner | Owner (for removals) | N/A (soft via status) |
| `join_requests` | Applicant sees own; owner sees project's | `auth.uid() = applicant_id` | Applicant (withdraw) or owner (accept/reject) | N/A |
| `project_invitations` | Invitee sees own; owner sees sent | `project.owner_id = auth.uid()` | `invitee_id = auth.uid()` | N/A |
| `details_requests` | Requester + project owner | `auth.uid() = user_id` | `project.owner_id = auth.uid()` | N/A |
| `mentorship_requests` | Faculty + project owner | `auth.uid() = faculty_id` | `project.owner_id = auth.uid()` | N/A |
| `tasks` | Active project members | Active project members | Active project members | Creator or owner |
| `task_comments` | Active project members | Active project members | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `milestones` | Active project members | Active project members | Active project members | Owner or creator |
| `research_notes` | Active project members | Active project members | `auth.uid() = created_by` | `auth.uid() = created_by` |
| `reference_items` | Active project members | Active project members | `auth.uid() = added_by` | `auth.uid() = added_by` |
| `experiments` | Active project members | Active project members | `auth.uid() = created_by` | `auth.uid() = created_by` |
| `meeting_notes` | Active project members | Active project members | `auth.uid() = created_by` | `auth.uid() = created_by` |
| `datasets` | Active project members | Active project members | `auth.uid() = added_by` | `auth.uid() = added_by` |
| `documents` | Active members (access-level filtered) | Active project members | Owner of document | Owner of document |
| `discussions` | Active project members | Active project members | `auth.uid() = created_by` | `auth.uid() = created_by` |
| `discussion_replies` | Active project members | Active project members | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `notifications` | `user_id = auth.uid()` | Service role / DB trigger only | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `activity_logs` | Active project members | Active members / DB trigger | N/A | N/A |
| `ai_analyses` | Project member (own) | Authenticated user (own) | N/A | N/A |
| `team_recommendations` | Project owner + members | Project owner | N/A | N/A |
| `github_connections` | Own record | `auth.uid() = profile_id` | `auth.uid() = profile_id` | `auth.uid() = profile_id` |
| `github_repositories` | Project members | Project owner | Project owner | Project owner |
| `reports` | Admin only | Authenticated user | Admin only | N/A |
| `admin_actions` | Admin only | Admin only | N/A | N/A |
| `platform_configuration` | Public (read) | Admin only | Admin only | N/A |

---

## Section 4 — Migration Complexity Rating

| Feature Area | Complexity | Notes |
|---|---|---|
| Auth (login/register/reset) | 🟡 Medium | Replace custom hash with Supabase Auth; add `handle_new_user` trigger |
| Profiles (base fields) | 🟢 Low | Flat table, straightforward UPDATE |
| Skills / Interests (taxonomy) | 🟢 Low | Replace hardcoded arrays with DB fetch; junction table inserts |
| Profile child tables (past projects, internships, etc.) | 🟡 Medium | Bulk delete + insert pattern on save |
| Projects + Roles | 🟡 Medium | Roles in separate table; create/update needs transaction |
| Project Members | 🟢 Low | Simple insert/update patterns |
| Join Requests | 🟡 Medium | AI analysis stored separately in `ai_analyses` table with FK |
| Invitations / Details Requests / Mentorship | 🟢 Low | Simple CRUD patterns |
| Tasks + Comments + Milestones | 🟢 Low | Straightforward CRUD |
| Research Workspace (notes, refs, experiments, etc.) | 🟢 Low | Straightforward CRUD |
| Documents | 🔴 High | Requires Storage integration; base64→upload flow change |
| Discussions + Replies | 🟢 Low | Straightforward CRUD |
| Notifications | 🟡 Medium | Write path moves to DB trigger / Edge Function; client reads only |
| Activity Logs | 🟡 Medium | Write via DB trigger or Edge Function |
| AI Analysis storage | 🟢 Low | Store JSON output in `ai_analyses.output_result` JSONB |
| Admin features | 🟡 Medium | Requires admin role check in RLS; some queries need `service_role` |
| GitHub metadata | 🟢 Low | Upsert `github_connections`; store repo link on project |
| Settings / Demo Switcher | 🔴 N/A | Not migrated; dev-only feature |

---

## Section 5 — Migration Execution Plan (Proposed Order)

1. **Auth** — Replace `login`, `logout`, `registerUser`, `requestPasswordReset`, `resetPassword` with Supabase Auth calls. Add `handle_new_user` DB trigger.
2. **Profiles** — Replace `initStore` profile load, `saveProfile`, `currentProfile` with `supabase.from('profiles')` queries.
3. **Taxonomy** — Fetch `skills` and `research_interests` from DB instead of hardcoded arrays in `taxonomies.ts`.
4. **Projects** — Replace `createProject`, `updateProject`, `deleteProject` etc. with Supabase operations.
5. **Project Members + Roles** — Replace member/role reads and writes.
6. **Join Requests + Invitations** — Replace application flow.
7. **Tasks + Milestones** — Replace task CRUD.
8. **Research Workspace** — Replace notes, references, experiments, meetings, datasets.
9. **Documents** — Migrate to Supabase Storage; update upload/read flow.
10. **Discussions** — Replace discussion/reply CRUD.
11. **Notifications** — Replace client writes with DB trigger; client reads from Supabase.
12. **Activity Logs** — Replace with DB insert (or trigger).
13. **AI Analysis** — Store results in `ai_analyses` table.
14. **Admin** — Replace admin reads/writes with RLS-protected Supabase queries.
15. **GitHub Metadata** — Replace `github_connections` and `github_repositories`.

---

*Document generated: September 10, 2026*
*Status: COMPLETE — awaiting user approval before migration begins*
