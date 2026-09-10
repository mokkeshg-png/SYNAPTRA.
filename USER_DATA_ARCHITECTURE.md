# SYNAPTRA — Centralized User Data Architecture

This document describes the unified user identity, profile structure, and registration flow for SYNAPTRA using Supabase Auth and PostgreSQL.

---

## Core Identity Flow: Supabase Auth

**`auth.users`** (Supabase Managed)
- Supabase automatically provisions and manages this table.
- Holds credentials (hashed passwords), OTPs, OAuth tokens, and email verification state.
- **NEVER** store plain-text passwords or auth tokens in application tables.

---

## Centralized Profile Structure

The application-level profile is heavily normalized to ensure relational integrity, splitting shared data from role-specific extensions.

### 1. Base Profile (`public.profiles`)
- **1:1 with `auth.users`**: `profiles.id` perfectly mirrors `auth.users.id`.
- Contains all universally shared user information (e.g., `email`, `full_name`, `role`, `institution`, `department`, `photo_url`, `phone`, `location`).
- Governs `visibility` and `status` across the entire application.

### 2. Role Extensions
Users are assigned one of two roles upon registration, which determines their specific profile extension table.

**`public.student_profiles`** (Student Extension)
- Contains fields strictly relevant to students: `degree_program`, `academic_year`, `graduation_year`.
- Foreign key `profile_id` references `profiles.id`.

**`public.faculty_profiles`** (Faculty Extension)
- Contains fields strictly relevant to faculty/mentors: `designation`, `research_domains`, `teaching_areas`, `open_to_mentoring`.
- Foreign key `profile_id` references `profiles.id`.

---

## Registration Flow

The registration architecture guarantees that the database always remains synchronized with Supabase Auth without the frontend needing elevated service-role privileges.

1. **Frontend Registration**:
   The user submits the registration form (`src/pages/Register.tsx`). The frontend calls `supabase.auth.signUp()`, passing the user's `email`, `password`, and custom metadata (`full_name`, `role`, `institution`, `department`) within the `data` option.

2. **Supabase Auth Hook**:
   Supabase inserts the user into `auth.users`.

3. **Database Trigger**:
   The `on_auth_user_created` trigger fires immediately *after* the insert on `auth.users`. It executes the `handle_new_user()` function (defined with `SECURITY DEFINER` privileges).
   - The trigger securely unpacks the `raw_user_meta_data`.
   - It inserts a new row directly into `public.profiles`.

4. **Frontend Extension Provisioning**:
   Upon receiving a successful `signUp` response, the frontend immediately executes an `upsert` on either `student_profiles` or `faculty_profiles` (depending on their role) to seed the initial role-specific state.

---

## Entity Relationships

The `public.profiles` table acts as the unified root for all user activity and metadata:

- **Skills/Interests**: Linked via many-to-many junction tables (`user_skills`, `user_interests`).
- **Projects**: Project ownership (`projects.owner_id`) and membership (`project_members.user_id`) tie back directly to the profile.
- **Collaboration**: Tasks, documents, and discussions utilize the profile ID.
- **GitHub**: `github_connections` links 1:1 with `profiles.id`.

---

## Row Level Security (RLS)

- **Tenant Isolation**: Users can only modify their own row in `profiles`, `student_profiles`, and `faculty_profiles`.
- **Public vs. Private Visibility**: Profile queries are dynamically filtered via RLS based on the user's `visibility` settings (e.g., a "private" profile is omitted from public discovery queries).
- **Service Keys**: At no point does the frontend require or possess service-role keys. Supabase automatically attaches the user's authentication context to all requests.
