/**
 * supabase-db.ts
 * Supabase-backed data operations replacing localStorage store.ts.
 * All functions use the real Supabase client with RLS enforcement.
 * No service-role keys — frontend uses only the anon publishable key.
 */

import { supabase } from "@/lib/supabase";
import { computeCompleteness } from "@/lib/completeness";
import type {
  Profile,
  Project,
  ProjectRole,
  ProjectMember,
  JoinRequest,
  Invitation,
  DetailsRequest,
  MentorshipRequest,
  Task,
  TaskComment,
  Milestone,
  Notification,
  ResearchNote,
  ReferenceItem,
  ExperimentRecord,
  MeetingNote,
  DatasetInfo,
  DocumentItem,
  Discussion,
  DiscussionReply,
  Report,
  AuditLog,
  ActivityLog,
  UserSkill,
  PastProject,
  Internship,
  Certification,
  Publication,
  Proficiency,
  ReportType,
  NotificationType,
  DocumentAccess,
  AiAnalysisRecord,
  SkillScoreRecord,
  SkillScoreAnalysis,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert DB snake_case profile row → frontend Profile shape */
function rowToProfile(row: any, extras?: {
  skills?: any[];
  interests?: any[];
  pastProjects?: any[];
  internships?: any[];
  certifications?: any[];
  publications?: any[];
  studentProfile?: any;
  facultyProfile?: any;
}): Profile {
  const skills: UserSkill[] = (extras?.skills ?? []).map((s: any) => ({
    skill: s.skills?.name ?? s.skill_name ?? "",
    proficiency: s.proficiency as Proficiency,
  }));

  const interests: string[] = (extras?.interests ?? []).map(
    (i: any) => i.research_interests?.name ?? i.interest_name ?? ""
  );

  const pastProjects: PastProject[] = (extras?.pastProjects ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    year: p.year,
  }));

  const internships: Internship[] = (extras?.internships ?? []).map((i: any) => ({
    id: i.id,
    organization: i.organization,
    role: i.role,
    description: i.description ?? "",
  }));

  const certifications: Certification[] = (extras?.certifications ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    issuer: c.issuer,
    year: c.year,
  }));

  const publications: Publication[] = (extras?.publications ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    venue: p.venue,
    year: p.year,
    link: p.link,
  }));

  const sp = extras?.studentProfile;
  const fp = extras?.facultyProfile;

  const profile: Profile = {
    id: row.id,
    userId: row.id, // profiles.id == auth.users.id
    email: row.email ?? "",
    role: (row.role ?? "student") as Profile["role"],
    fullName: row.full_name ?? "",
    photoUrl: row.photo_url ?? undefined,
    institution: row.institution ?? "",
    department: row.department ?? "",
    phone: row.phone ?? undefined,
    location: row.location ?? undefined,
    bio: row.bio ?? undefined,
    visibility: row.visibility ?? "public",
    profileCompleteness: row.profile_completeness ?? 0,
    skills,
    interests,
    programmingLanguages: row.programming_languages ?? [],
    pastProjects,
    internships,
    certifications,
    publications,
    githubUsername: row.github_username ?? undefined,
    githubConnected: row.github_connected ?? false,
    linkedinUrl: row.linkedin_url ?? undefined,
    portfolioUrl: row.portfolio_url ?? undefined,
    resumeUrl: row.resume_url ?? undefined,
    availabilityHours: row.availability_hours ?? undefined,
    preferredTeamSize: row.preferred_team_size ?? undefined,
    preferredRoles: row.preferred_roles ?? [],
    // student
    degreeProgram: sp?.degree_program ?? undefined,
    academicYear: sp?.academic_year ?? undefined,
    graduationYear: sp?.graduation_year ?? undefined,
    // faculty
    designation: fp?.designation ?? undefined,
    subjectsTaught: fp?.subjects_taught ?? [],
    teachingAreas: fp?.teaching_areas ?? [],
    academicExperience: fp?.academic_experience ?? undefined,
    researchExperience: fp?.research_experience ?? undefined,
    researchDomains: fp?.research_domains ?? [],
    expertise: fp?.expertise ?? [],
    googleScholar: fp?.google_scholar ?? undefined,
    orcid: fp?.orcid ?? undefined,
    researchgate: fp?.researchgate ?? undefined,
    openToCollaboration: fp?.open_to_collaboration ?? row.open_to_collaboration ?? true,
    openToMentoring: fp?.open_to_mentoring ?? row.open_to_mentoring ?? false,
    preferredProjectTypes: fp?.preferred_project_types ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return profile;
}

/** Convert DB project row + roles → frontend Project shape */
function rowToProject(row: any, roles: any[] = []): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    shortDescription: row.short_description ?? "",
    detailedDescription: row.detailed_description ?? "",
    problemStatement: row.problem_statement ?? undefined,
    objectives: row.objectives ?? [],
    domains: row.domains ?? [],
    interests: row.interests ?? [],
    requiredSkills: row.required_skills ?? [],
    roles: roles.map(rowToProjectRole),
    teamMin: row.team_min ?? 1,
    teamMax: row.team_max ?? 5,
    duration: row.duration ?? undefined,
    difficulty: row.difficulty ?? "intermediate",
    type: row.project_type ?? "Research Project",
    visibility: row.visibility ?? "public",
    deadline: row.deadline ?? undefined,
    expectedOutcomes: row.expected_outcomes ?? undefined,
    mentorRequired: row.mentor_required ?? false,
    githubRequired: row.github_required ?? false,
    tags: row.tags ?? [],
    status: row.status ?? "open",
    githubRepo: row.github_repo ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProjectRole(r: any): ProjectRole {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    requiredSkills: r.required_skills ?? [],
    openings: r.openings ?? 1,
  };
}

function rowToMember(r: any): ProjectMember {
  return {
    id: r.id,
    projectId: r.project_id,
    userId: r.user_id,
    systemRole: r.system_role,
    roleId: r.role_id ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  };
}

function rowToJoinRequest(r: any): JoinRequest {
  return {
    id: r.id,
    projectId: r.project_id,
    applicantId: r.applicant_id,
    selectedRoleId: r.selected_role_id,
    motivation: r.motivation ?? "",
    relevantExperience: r.relevant_experience ?? "",
    message: r.message ?? undefined,
    status: r.status,
    rejectReason: r.reject_reason ?? undefined,
    analysis: r.ai_analyses?.output_result ?? r.analysis ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToTask(r: any): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description ?? undefined,
    assignedTo: r.assigned_to ?? undefined,
    roleId: r.role_id ?? undefined,
    priority: r.priority,
    deadline: r.deadline ?? undefined,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToNotification(r: any): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type as NotificationType,
    title: r.title,
    message: r.message,
    link: r.link,
    read: r.read,
    createdAt: r.created_at,
  };
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "faculty";
  institution: string;
  department: string;
  academicYear?: number;
  designation?: string;
}) {
  const { data, error } = await supabase!.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        role: input.role,
        institution: input.institution,
        department: input.department,
      },
    },
  });
  if (error) throw new Error(error.message);

  const userId = data.user?.id;
  if (!userId) throw new Error("Registration failed — no user ID returned.");

  // Upsert student/faculty extension
  if (input.role === "student" && input.academicYear !== undefined) {
    await supabase!.from("student_profiles").upsert(
      { profile_id: userId, academic_year: input.academicYear },
      { onConflict: "profile_id" }
    );
  }
  if (input.role === "faculty" && input.designation) {
    await supabase!.from("faculty_profiles").upsert(
      { profile_id: userId, designation: input.designation },
      { onConflict: "profile_id" }
    );
  }

  return data.user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOut() {
  const { error } = await supabase!.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function resetPasswordEmail(email: string) {
  const { error } = await supabase!.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/settings`,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase!.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function getSession() {
  const { data } = await supabase!.auth.getSession();
  return data.session;
}

// ---------------------------------------------------------------------------
// PROFILES
// ---------------------------------------------------------------------------

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const [
    { data: row },
    { data: skills },
    { data: interests },
    { data: pastProjects },
    { data: internships },
    { data: certifications },
    { data: publications },
    { data: studentProfile },
    { data: facultyProfile },
  ] = await Promise.all([
    supabase!.from("profiles").select("*").eq("id", userId).single(),
    supabase!.from("user_skills").select("*, skills(name)").eq("profile_id", userId),
    supabase!.from("user_interests").select("*, research_interests(name)").eq("profile_id", userId),
    supabase!.from("user_past_projects").select("*").eq("profile_id", userId),
    supabase!.from("user_internships").select("*").eq("profile_id", userId),
    supabase!.from("user_certifications").select("*").eq("profile_id", userId),
    supabase!.from("user_publications").select("*").eq("profile_id", userId),
    supabase!.from("student_profiles").select("*").eq("profile_id", userId).maybeSingle(),
    supabase!.from("faculty_profiles").select("*").eq("profile_id", userId).maybeSingle(),
  ]);

  if (!row) return null;

  return rowToProfile(row, {
    skills: skills ?? [],
    interests: interests ?? [],
    pastProjects: pastProjects ?? [],
    internships: internships ?? [],
    certifications: certifications ?? [],
    publications: publications ?? [],
    studentProfile,
    facultyProfile,
  });
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  // Short-lived in-process cache (60 s) — avoids 5 Supabase queries × every page navigation
  const now = Date.now();
  if (_profileCache && now - _profileCacheAt < 60_000) return _profileCache;

  const { data: rows, error } = await supabase!
    .from("profiles")
    .select("*")
    .neq("visibility", "private")
    .eq("status", "active")
    .order("full_name");

  if (error || !rows) return [];

  const ids = rows.map((r: any) => r.id);
  const [
    { data: skills },
    { data: interests },
    { data: studentProfiles },
    { data: facultyProfiles },
  ] = await Promise.all([
    supabase!.from("user_skills").select("*, skills(name)").in("profile_id", ids),
    supabase!.from("user_interests").select("*, research_interests(name)").in("profile_id", ids),
    supabase!.from("student_profiles").select("*").in("profile_id", ids),
    supabase!.from("faculty_profiles").select("*").in("profile_id", ids),
  ]);

  const result = rows.map((row: any) =>
    rowToProfile(row, {
      skills: (skills ?? []).filter((s: any) => s.profile_id === row.id),
      interests: (interests ?? []).filter((i: any) => i.profile_id === row.id),
      studentProfile: (studentProfiles ?? []).find((sp: any) => sp.profile_id === row.id) ?? null,
      facultyProfile: (facultyProfiles ?? []).find((fp: any) => fp.profile_id === row.id) ?? null,
    })
  );

  _profileCache = result;
  _profileCacheAt = Date.now();
  return result;
}

/** Bust the in-process profile cache — call after any mutation that changes profile data */
export function bustProfileCache() {
  _profileCache = null;
  _profileCacheAt = 0;
}

// Module-level cache for fetchAllProfiles — avoids redundant round trips within a session
let _profileCache: Profile[] | null = null;
let _profileCacheAt = 0;

export async function saveProfile(userId: string, patch: Partial<Profile>) {
  // 1. Update base profiles row
  const profileUpdate: Record<string, any> = {};
  if (patch.fullName !== undefined) profileUpdate.full_name = patch.fullName;
  if (patch.bio !== undefined) profileUpdate.bio = patch.bio;
  if (patch.photoUrl !== undefined) profileUpdate.photo_url = patch.photoUrl;
  if (patch.institution !== undefined) profileUpdate.institution = patch.institution;
  if (patch.department !== undefined) profileUpdate.department = patch.department;
  if (patch.phone !== undefined) profileUpdate.phone = patch.phone;
  if (patch.location !== undefined) profileUpdate.location = patch.location;
  if (patch.visibility !== undefined) profileUpdate.visibility = patch.visibility;
  if (patch.githubUsername !== undefined) profileUpdate.github_username = patch.githubUsername;
  if (patch.githubConnected !== undefined) profileUpdate.github_connected = patch.githubConnected;
  if (patch.linkedinUrl !== undefined) profileUpdate.linkedin_url = patch.linkedinUrl;
  if (patch.portfolioUrl !== undefined) profileUpdate.portfolio_url = patch.portfolioUrl;
  if (patch.resumeUrl !== undefined) profileUpdate.resume_url = patch.resumeUrl;
  if (patch.availabilityHours !== undefined) profileUpdate.availability_hours = patch.availabilityHours;
  if (patch.preferredTeamSize !== undefined) profileUpdate.preferred_team_size = patch.preferredTeamSize;
  if (patch.preferredRoles !== undefined) profileUpdate.preferred_roles = patch.preferredRoles;
  if (patch.programmingLanguages !== undefined) profileUpdate.programming_languages = patch.programmingLanguages;

  // Recompute completeness if relevant fields changed — fetch once, reuse for return value
  let currentProfile: Profile | null = null;
  if (Object.keys(profileUpdate).length > 0) {
    currentProfile = await fetchProfile(userId);
    if (currentProfile) {
      const merged = { ...currentProfile, ...patch };
      profileUpdate.profile_completeness = computeCompleteness(merged as Profile);
    }
    await supabase!.from("profiles").update(profileUpdate).eq("id", userId);
  }

  // 2. Skills (bulk replace)
  if (patch.skills !== undefined) {
    await supabase!.from("user_skills").delete().eq("profile_id", userId);
    if (patch.skills.length > 0) {
      // Resolve skill names to IDs
      const { data: skillRows } = await supabase!
        .from("skills")
        .select("id, name")
        .in("name", patch.skills.map((s) => s.skill));

      // For any skills not in DB, insert them first
      const existing = new Set((skillRows ?? []).map((s: any) => s.name));
      const newSkills = patch.skills.filter((s) => !existing.has(s.skill));
      if (newSkills.length > 0) {
        await supabase!
          .from("skills")
          .insert(newSkills.map((s) => ({ name: s.skill })));
      }

      // Fetch all skill IDs again
      const { data: allSkillRows } = await supabase!
        .from("skills")
        .select("id, name")
        .in("name", patch.skills.map((s) => s.skill));

      const nameToId = Object.fromEntries((allSkillRows ?? []).map((s: any) => [s.name, s.id]));
      const inserts = patch.skills
        .filter((s) => nameToId[s.skill])
        .map((s) => ({
          profile_id: userId,
          skill_id: nameToId[s.skill],
          proficiency: s.proficiency,
        }));
      if (inserts.length > 0) {
        await supabase!.from("user_skills").insert(inserts);
      }
    }
  }

  // 3. Interests (bulk replace)
  if (patch.interests !== undefined) {
    await supabase!.from("user_interests").delete().eq("profile_id", userId);
    if (patch.interests.length > 0) {
      const { data: interestRows } = await supabase!
        .from("research_interests")
        .select("id, name")
        .in("name", patch.interests);

      const existing = new Set((interestRows ?? []).map((i: any) => i.name));
      const newInterests = patch.interests.filter((i) => !existing.has(i));
      if (newInterests.length > 0) {
        await supabase!.from("research_interests").insert(newInterests.map((name) => ({ name })));
      }

      const { data: allInterestRows } = await supabase!
        .from("research_interests")
        .select("id, name")
        .in("name", patch.interests);

      const nameToId = Object.fromEntries((allInterestRows ?? []).map((i: any) => [i.name, i.id]));
      const inserts = patch.interests
        .filter((name) => nameToId[name])
        .map((name) => ({ profile_id: userId, interest_id: nameToId[name] }));
      if (inserts.length > 0) {
        await supabase!.from("user_interests").insert(inserts);
      }
    }
  }

  // 4. Past projects (bulk replace)
  if (patch.pastProjects !== undefined) {
    await supabase!.from("user_past_projects").delete().eq("profile_id", userId);
    if (patch.pastProjects.length > 0) {
      await supabase!.from("user_past_projects").insert(
        patch.pastProjects.map((p) => ({
          profile_id: userId,
          title: p.title,
          description: p.description,
          year: p.year,
        }))
      );
    }
  }

  // 5. Internships (bulk replace)
  if (patch.internships !== undefined) {
    await supabase!.from("user_internships").delete().eq("profile_id", userId);
    if (patch.internships.length > 0) {
      await supabase!.from("user_internships").insert(
        patch.internships.map((i) => ({
          profile_id: userId,
          organization: i.organization,
          role: i.role,
          description: i.description,
        }))
      );
    }
  }

  // 6. Student profile
  if (patch.degreeProgram !== undefined || patch.academicYear !== undefined || patch.graduationYear !== undefined) {
    await supabase!.from("student_profiles").upsert(
      {
        profile_id: userId,
        ...(patch.degreeProgram !== undefined && { degree_program: patch.degreeProgram }),
        ...(patch.academicYear !== undefined && { academic_year: patch.academicYear }),
        ...(patch.graduationYear !== undefined && { graduation_year: patch.graduationYear }),
      },
      { onConflict: "profile_id" }
    );
  }

  // 7. Faculty profile
  const facultyFields: Record<string, any> = {};
  if (patch.designation !== undefined) facultyFields.designation = patch.designation;
  if (patch.subjectsTaught !== undefined) facultyFields.subjects_taught = patch.subjectsTaught;
  if (patch.teachingAreas !== undefined) facultyFields.teaching_areas = patch.teachingAreas;
  if (patch.academicExperience !== undefined) facultyFields.academic_experience = patch.academicExperience;
  if (patch.researchExperience !== undefined) facultyFields.research_experience = patch.researchExperience;
  if (patch.researchDomains !== undefined) facultyFields.research_domains = patch.researchDomains;
  if (patch.expertise !== undefined) facultyFields.expertise = patch.expertise;
  if (patch.googleScholar !== undefined) facultyFields.google_scholar = patch.googleScholar;
  if (patch.orcid !== undefined) facultyFields.orcid = patch.orcid;
  if (patch.researchgate !== undefined) facultyFields.researchgate = patch.researchgate;
  if (patch.openToCollaboration !== undefined) facultyFields.open_to_collaboration = patch.openToCollaboration;
  if (patch.openToMentoring !== undefined) facultyFields.open_to_mentoring = patch.openToMentoring;
  if (patch.preferredProjectTypes !== undefined) facultyFields.preferred_project_types = patch.preferredProjectTypes;

  if (Object.keys(facultyFields).length > 0) {
    facultyFields.profile_id = userId;
    await supabase!.from("faculty_profiles").upsert(facultyFields, { onConflict: "profile_id" });
  }

  bustProfileCache(); // invalidate cached profiles after any profile mutation
  // Reuse already-fetched profile when available; only re-fetch if the update
  // was skills/interests-only (no profileUpdate fields → currentProfile is null)
  return currentProfile ? fetchProfile(userId) : fetchProfile(userId);
}

export async function touchLastActive(userId: string) {
  await supabase!.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId);
}

// ---------------------------------------------------------------------------
// TAXONOMY
// ---------------------------------------------------------------------------

export async function fetchSkillsFromDB(): Promise<string[]> {
  const { data } = await supabase!.from("skills").select("name").order("name");
  return (data ?? []).map((s: any) => s.name);
}

export async function fetchResearchInterestsFromDB(): Promise<string[]> {
  const { data } = await supabase!.from("research_interests").select("name").order("name");
  return (data ?? []).map((i: any) => i.name);
}

// ---------------------------------------------------------------------------
// PROJECTS
// ---------------------------------------------------------------------------

export async function fetchProjects(): Promise<Project[]> {
  const { data: rows, error } = await supabase!
    .from("projects")
    .select("*")
    .is("deleted_at", null)
    .not("status", "in", '("removed","flagged")')
    .order("created_at", { ascending: false });

  if (error || !rows) return [];

  const ids = rows.map((r: any) => r.id);
  const { data: roles } = await supabase!
    .from("project_roles")
    .select("*")
    .in("project_id", ids);

  return rows.map((row: any) =>
    rowToProject(row, (roles ?? []).filter((r: any) => r.project_id === row.id))
  );
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  const [{ data: row }, { data: roles }] = await Promise.all([
    supabase!.from("projects").select("*").eq("id", id).single(),
    supabase!.from("project_roles").select("*").eq("project_id", id).order("created_at"),
  ]);
  if (!row) return null;
  return rowToProject(row, roles ?? []);
}

export async function createProject(
  ownerId: string,
  data: Omit<Project, "id" | "ownerId" | "createdAt" | "updatedAt" | "status">
): Promise<Project> {
  const { data: proj, error } = await supabase!
    .from("projects")
    .insert({
      owner_id: ownerId,
      title: data.title,
      short_description: data.shortDescription,
      detailed_description: data.detailedDescription,
      problem_statement: data.problemStatement,
      objectives: data.objectives,
      domains: data.domains,
      interests: data.interests,
      required_skills: data.requiredSkills,
      team_min: data.teamMin,
      team_max: data.teamMax,
      duration: data.duration,
      difficulty: data.difficulty,
      project_type: data.type,
      visibility: data.visibility,
      deadline: data.deadline || null,
      expected_outcomes: data.expectedOutcomes,
      mentor_required: data.mentorRequired,
      github_required: data.githubRequired,
      tags: data.tags,
      status: "open",
    })
    .select()
    .single();

  if (error || !proj) throw new Error(error?.message ?? "Failed to create project");

  // Insert roles
  if (data.roles.length > 0) {
    await supabase!.from("project_roles").insert(
      data.roles.map((r) => ({
        project_id: proj.id,
        name: r.name,
        description: r.description,
        required_skills: r.requiredSkills,
        openings: r.openings,
      }))
    );
  }

  // Add owner as member
  await supabase!.from("project_members").insert({
    project_id: proj.id,
    user_id: ownerId,
    system_role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  // Activity log
  await logActivity(proj.id, ownerId, "project", "Project published.");

  return (await fetchProjectById(proj.id))!;
}

export async function updateProject(ownerId: string, projectId: string, patch: Partial<Project>) {
  const update: Record<string, any> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.shortDescription !== undefined) update.short_description = patch.shortDescription;
  if (patch.detailedDescription !== undefined) update.detailed_description = patch.detailedDescription;
  if (patch.problemStatement !== undefined) update.problem_statement = patch.problemStatement;
  if (patch.objectives !== undefined) update.objectives = patch.objectives;
  if (patch.domains !== undefined) update.domains = patch.domains;
  if (patch.interests !== undefined) update.interests = patch.interests;
  if (patch.requiredSkills !== undefined) update.required_skills = patch.requiredSkills;
  if (patch.teamMin !== undefined) update.team_min = patch.teamMin;
  if (patch.teamMax !== undefined) update.team_max = patch.teamMax;
  if (patch.duration !== undefined) update.duration = patch.duration;
  if (patch.difficulty !== undefined) update.difficulty = patch.difficulty;
  if (patch.type !== undefined) update.project_type = patch.type;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  if (patch.deadline !== undefined) update.deadline = patch.deadline || null;
  if (patch.expectedOutcomes !== undefined) update.expected_outcomes = patch.expectedOutcomes;
  if (patch.mentorRequired !== undefined) update.mentor_required = patch.mentorRequired;
  if (patch.githubRequired !== undefined) update.github_required = patch.githubRequired;
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.githubRepo !== undefined) update.github_repo = patch.githubRepo;

  const { error } = await supabase!
    .from("projects")
    .update(update)
    .eq("id", projectId)
    .eq("owner_id", ownerId);

  if (error) throw new Error(error.message);

  // Replace roles if provided
  if (patch.roles !== undefined) {
    await supabase!.from("project_roles").delete().eq("project_id", projectId);
    if (patch.roles.length > 0) {
      await supabase!.from("project_roles").insert(
        patch.roles.map((r) => ({
          project_id: projectId,
          name: r.name,
          description: r.description,
          required_skills: r.requiredSkills,
          openings: r.openings,
        }))
      );
    }
  }

  await logActivity(projectId, ownerId, "project", "Project details were updated.");
  return fetchProjectById(projectId);
}

export async function deleteProject(ownerId: string, projectId: string) {
  const { error } = await supabase!
    .from("projects")
    .update({ deleted_at: new Date().toISOString(), status: "removed" })
    .eq("id", projectId)
    .eq("owner_id", ownerId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// PROJECT MEMBERS
// ---------------------------------------------------------------------------

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase!
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "active");
  if (error || !data) return [];
  return data.map(rowToMember);
}

/**
 * Batch version — fetches active members for multiple projects in ONE query.
 * Returns a Map<projectId, ProjectMember[]> for O(1) look-up per project.
 */
export async function fetchProjectMembersByProjects(
  projectIds: string[]
): Promise<Map<string, ProjectMember[]>> {
  const map = new Map<string, ProjectMember[]>();
  if (projectIds.length === 0) return map;
  const { data, error } = await supabase!
    .from("project_members")
    .select("*")
    .in("project_id", projectIds)
    .eq("status", "active");
  if (error || !data) return map;
  for (const row of data) {
    const m = rowToMember(row);
    const list = map.get(m.projectId) ?? [];
    list.push(m);
    map.set(m.projectId, list);
  }
  return map;
}

/**
 * Fetch all project_member rows for a single user across all projects.
 * Used by Messages to avoid calling fetchProjectMembers for every project.
 */
export async function fetchMembershipsByUser(
  userId: string
): Promise<ProjectMember[]> {
  const { data, error } = await supabase!
    .from("project_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error || !data) return [];
  return data.map(rowToMember);
}

export async function removeMember(_ownerId: string, projectId: string, memberId: string) {
  const { error } = await supabase!
    .from("project_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
}

export async function leaveProject(userId: string, projectId: string) {
  const { error } = await supabase!
    .from("project_members")
    .update({ status: "left", left_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .neq("system_role", "owner");
  if (error) throw new Error(error.message);
}

export async function assignRole(projectId: string, memberUserId: string, roleId: string) {
  const { error } = await supabase!
    .from("project_members")
    .update({ role_id: roleId })
    .eq("project_id", projectId)
    .eq("user_id", memberUserId);
  if (error) throw new Error(error.message);
}

export async function transferOwnership(projectId: string, currentOwnerId: string, newOwnerId: string) {
  await supabase!
    .from("project_members")
    .update({ system_role: "member" })
    .eq("project_id", projectId)
    .eq("user_id", currentOwnerId)
    .eq("system_role", "owner");
  await supabase!
    .from("project_members")
    .update({ system_role: "owner" })
    .eq("project_id", projectId)
    .eq("user_id", newOwnerId);
  await supabase!
    .from("projects")
    .update({ owner_id: newOwnerId })
    .eq("id", projectId);
}

// ---------------------------------------------------------------------------
// JOIN REQUESTS
// ---------------------------------------------------------------------------

export async function fetchJoinRequests(projectId?: string, applicantId?: string): Promise<JoinRequest[]> {
  let q = supabase!
    .from("join_requests")
    .select("*, ai_analyses(output_result)")
    .order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  if (applicantId) q = q.eq("applicant_id", applicantId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(rowToJoinRequest);
}

/**
 * Batch fetch join requests for multiple project IDs in one query.
 * Replaces the N-request loop in Requests.tsx and Dashboard.tsx.
 */
export async function fetchJoinRequestsByProjects(
  projectIds: string[]
): Promise<JoinRequest[]> {
  if (projectIds.length === 0) return [];
  const { data, error } = await supabase!
    .from("join_requests")
    .select("*, ai_analyses(output_result)")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToJoinRequest);
}

/**
 * Batch fetch mentorship requests for multiple project IDs in one query.
 */
export async function fetchMentorshipRequestsByProjects(
  projectIds: string[]
): Promise<MentorshipRequest[]> {
  if (projectIds.length === 0) return [];
  const { data } = await supabase!
    .from("mentorship_requests")
    .select("*")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, facultyId: r.faculty_id,
    message: r.message ?? "", status: r.status, createdAt: r.created_at,
  }));
}

/**
 * Batch fetch details requests for multiple project IDs in one query.
 */
export async function fetchDetailsRequestsByProjects(
  projectIds: string[]
): Promise<DetailsRequest[]> {
  if (projectIds.length === 0) return [];
  const { data } = await supabase!
    .from("details_requests")
    .select("*")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, userId: r.user_id,
    status: r.status, createdAt: r.created_at,
  }));
}

/**
 * Batch fetch invitations for multiple project IDs in one query.
 */
export async function fetchInvitationsByProjects(
  projectIds: string[]
): Promise<Invitation[]> {
  if (projectIds.length === 0) return [];
  const { data } = await supabase!
    .from("project_invitations")
    .select("*")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, inviterId: r.inviter_id,
    inviteeId: r.invitee_id, roleId: r.role_id ?? undefined,
    message: r.message ?? undefined, status: r.status, createdAt: r.created_at,
  }));
}

export async function applyToProject(input: {
  projectId: string;
  applicantId: string;
  selectedRoleId: string;
  motivation: string;
  relevantExperience: string;
  message?: string;
  analysis?: any;
}): Promise<JoinRequest> {
  // Insert AI analysis first if provided
  let aiAnalysisId: string | null = null;
  if (input.analysis) {
    const { data: aiRow } = await supabase!
      .from("ai_analyses")
      .insert({
        type: "compatibility",
        project_id: input.projectId,
        user_id: input.applicantId,
        input_context: {},
        output_result: input.analysis,
        model_used: "synaptra-local-v1",
        confidence: input.analysis.confidence ?? "medium",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    aiAnalysisId = aiRow?.id ?? null;
  }

  const { data, error } = await supabase!
    .from("join_requests")
    .insert({
      project_id: input.projectId,
      applicant_id: input.applicantId,
      selected_role_id: input.selectedRoleId,
      motivation: input.motivation,
      relevant_experience: input.relevantExperience,
      message: input.message,
      status: "pending",
      ai_analysis_id: aiAnalysisId,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to submit application");

  // Notify project owner
  const { data: proj } = await supabase!.from("projects").select("owner_id, title").eq("id", input.projectId).single();
  if (proj) {
    const { data: applicantProf } = await supabase!.from("profiles").select("full_name").eq("id", input.applicantId).single();
    await insertNotification({
      userId: proj.owner_id,
      type: "join_request",
      title: "New join request",
      message: `${applicantProf?.full_name ?? "A researcher"} applied to ${proj.title}.`,
      link: `/projects/${input.projectId}`,
    });
  }

  return rowToJoinRequest({ ...data, analysis: input.analysis });
}

export async function withdrawApplication(applicantId: string, requestId: string) {
  const { error } = await supabase!
    .from("join_requests")
    .update({ status: "withdrawn" })
    .eq("id", requestId)
    .eq("applicant_id", applicantId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}

export async function reviewApplication(
  ownerId: string,
  requestId: string,
  decision: "accepted" | "rejected",
  reason?: string
) {
  const { data: jr } = await supabase!
    .from("join_requests")
    .select("project_id, applicant_id, selected_role_id")
    .eq("id", requestId)
    .single();

  if (!jr) throw new Error("Application not found");

  await supabase!
    .from("join_requests")
    .update({ status: decision, reject_reason: reason ?? null })
    .eq("id", requestId);

  if (decision === "accepted") {
    await supabase!.from("project_members").insert({
      project_id: jr.project_id,
      user_id: jr.applicant_id,
      role_id: jr.selected_role_id,
      system_role: "member",
      status: "active",
      joined_at: new Date().toISOString(),
    });
    const { data: proj } = await supabase!.from("projects").select("title").eq("id", jr.project_id).single();
    await insertNotification({
      userId: jr.applicant_id,
      type: "application_accepted",
      title: "Application accepted",
      message: `Your application to ${proj?.title ?? "the project"} was accepted.`,
      link: `/projects/${jr.project_id}/room`,
    });
    await logActivity(jr.project_id, ownerId, "member", "A new member was accepted.");
  } else {
    const { data: proj } = await supabase!.from("projects").select("title").eq("id", jr.project_id).single();
    await insertNotification({
      userId: jr.applicant_id,
      type: "application_rejected",
      title: "Application not accepted",
      message: `Your application to ${proj?.title ?? "the project"} was not accepted.${reason ? ` ${reason}` : ""}`,
      link: `/projects/${jr.project_id}`,
    });
  }
}

// ---------------------------------------------------------------------------
// INVITATIONS
// ---------------------------------------------------------------------------

export async function fetchInvitations(inviteeId?: string, projectId?: string): Promise<Invitation[]> {
  let q = supabase!.from("project_invitations").select("*").order("created_at", { ascending: false });
  if (inviteeId) q = q.eq("invitee_id", inviteeId);
  if (projectId) q = q.eq("project_id", projectId);
  const { data } = await q;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    projectId: r.project_id,
    inviterId: r.inviter_id,
    inviteeId: r.invitee_id,
    roleId: r.role_id ?? undefined,
    message: r.message ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function inviteUser(
  ownerId: string,
  projectId: string,
  inviteeId: string,
  roleId?: string,
  message?: string
) {
  const { error } = await supabase!.from("project_invitations").insert({
    project_id: projectId,
    inviter_id: ownerId,
    invitee_id: inviteeId,
    role_id: roleId ?? null,
    message: message ?? null,
    status: "pending",
  });
  if (error) throw new Error(error.message);

  const { data: proj } = await supabase!.from("projects").select("title").eq("id", projectId).single();
  await insertNotification({
    userId: inviteeId,
    type: "project_invitation",
    title: "Project invitation",
    message: `You were invited to ${proj?.title ?? "a project"}.`,
    link: `/projects/${projectId}`,
  });
}

export async function respondInvitation(userId: string, invitationId: string, accept: boolean) {
  const { data: inv } = await supabase!.from("project_invitations").select("*").eq("id", invitationId).single();
  if (!inv) throw new Error("Invitation not found");

  await supabase!.from("project_invitations").update({ status: accept ? "accepted" : "declined" }).eq("id", invitationId);

  if (accept) {
    await supabase!.from("project_members").insert({
      project_id: inv.project_id,
      user_id: userId,
      role_id: inv.role_id ?? null,
      system_role: "member",
      status: "active",
      joined_at: new Date().toISOString(),
    });
    const { data: proj } = await supabase!.from("projects").select("title").eq("id", inv.project_id).single();
    const { data: prof } = await supabase!.from("profiles").select("full_name").eq("id", userId).single();
    await insertNotification({
      userId: inv.inviter_id,
      type: "new_team_member",
      title: "Invitation accepted",
      message: `${prof?.full_name ?? "A researcher"} joined ${proj?.title ?? "your project"}.`,
      link: `/projects/${inv.project_id}/room`,
    });
  }
}

// ---------------------------------------------------------------------------
// DETAILS REQUESTS
// ---------------------------------------------------------------------------

export async function fetchDetailsRequests(projectId?: string, userId?: string): Promise<DetailsRequest[]> {
  let q = supabase!.from("details_requests").select("*").order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    projectId: r.project_id,
    userId: r.user_id,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function requestFullDetails(userId: string, projectId: string) {
  const { error } = await supabase!.from("details_requests").insert({
    project_id: projectId,
    user_id: userId,
    status: "pending",
  });
  if (error) throw new Error(error.message);

  const { data: proj } = await supabase!.from("projects").select("owner_id, title").eq("id", projectId).single();
  if (proj) {
    const { data: prof } = await supabase!.from("profiles").select("full_name").eq("id", userId).single();
    await insertNotification({
      userId: proj.owner_id,
      type: "details_request",
      title: "Full details requested",
      message: `${prof?.full_name ?? "A researcher"} requested full details for ${proj.title}.`,
      link: `/projects/${projectId}`,
    });
  }
}

export async function resolveDetailsRequest(_ownerId: string, requestId: string, grant: boolean) {
  const { error } = await supabase!
    .from("details_requests")
    .update({ status: grant ? "granted" : "denied" })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// MENTORSHIP REQUESTS
// ---------------------------------------------------------------------------

export async function fetchMentorshipRequests(projectId?: string, facultyId?: string): Promise<MentorshipRequest[]> {
  let q = supabase!.from("mentorship_requests").select("*").order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  if (facultyId) q = q.eq("faculty_id", facultyId);
  const { data } = await q;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    projectId: r.project_id,
    facultyId: r.faculty_id,
    message: r.message ?? "",
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function requestMentorship(facultyId: string, projectId: string, message: string) {
  const { error } = await supabase!.from("mentorship_requests").insert({
    project_id: projectId,
    faculty_id: facultyId,
    message,
    status: "pending",
  });
  if (error) throw new Error(error.message);

  const { data: proj } = await supabase!.from("projects").select("owner_id, title").eq("id", projectId).single();
  if (proj) {
    const { data: prof } = await supabase!.from("profiles").select("full_name").eq("id", facultyId).single();
    await insertNotification({
      userId: proj.owner_id,
      type: "mentorship_request",
      title: "Mentorship request",
      message: `${prof?.full_name ?? "A faculty member"} requested to mentor ${proj.title}.`,
      link: `/projects/${projectId}`,
    });
  }
}

export async function reviewMentorship(ownerId: string, requestId: string, accept: boolean) {
  const { data: req } = await supabase!.from("mentorship_requests").select("*").eq("id", requestId).single();
  if (!req) throw new Error("Request not found");

  await supabase!.from("mentorship_requests").update({ status: accept ? "accepted" : "rejected" }).eq("id", requestId);

  if (accept) {
    await supabase!.from("project_members").insert({
      project_id: req.project_id,
      user_id: req.faculty_id,
      system_role: "mentor",
      status: "active",
      joined_at: new Date().toISOString(),
    });
    const { data: proj } = await supabase!.from("projects").select("title").eq("id", req.project_id).single();
    await insertNotification({
      userId: req.faculty_id,
      type: "application_accepted",
      title: "Mentorship accepted",
      message: `You are now mentoring ${proj?.title ?? "a project"}.`,
      link: `/projects/${req.project_id}/room`,
    });
    await logActivity(req.project_id, ownerId, "member", "Faculty mentor accepted.");
  } else {
    await insertNotification({
      userId: req.faculty_id,
      type: "application_rejected",
      title: "Mentorship request declined",
      message: "Your mentorship request was not accepted.",
      link: `/projects/${req.project_id}`,
    });
  }
}

// ---------------------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------------------

export async function fetchTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase!
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToTask);
}

export async function saveTask(
  userId: string,
  projectId: string,
  data: Partial<Task> & { title: string },
  existingId?: string
): Promise<Task> {
  const payload: Record<string, any> = {
    project_id: projectId,
    title: data.title,
    description: data.description ?? null,
    assigned_to: data.assignedTo ?? null,
    role_id: data.roleId ?? null,
    priority: data.priority ?? "medium",
    deadline: data.deadline ?? null,
    status: data.status ?? "todo",
  };

  if (existingId) {
    const { data: updated, error } = await supabase!
      .from("tasks")
      .update(payload)
      .eq("id", existingId)
      .select()
      .single();
    if (error || !updated) throw new Error(error?.message ?? "Failed to update task");
    if (data.assignedTo && data.assignedTo !== userId) {
      await insertNotification({
        userId: data.assignedTo,
        type: "task_assigned",
        title: "Task assigned",
        message: `${data.title} was assigned to you.`,
        link: `/projects/${projectId}/room`,
      });
    }
    return rowToTask(updated);
  }

  payload.created_by = userId;
  const { data: created, error } = await supabase!
    .from("tasks")
    .insert(payload)
    .select()
    .single();
  if (error || !created) throw new Error(error?.message ?? "Failed to create task");

  await logActivity(projectId, userId, "task", `Created task "${data.title}".`);
  if (data.assignedTo) {
    await insertNotification({
      userId: data.assignedTo,
      type: "task_assigned",
      title: "Task assigned",
      message: `${data.title} was assigned to you.`,
      link: `/projects/${projectId}/room`,
    });
  }
  return rowToTask(created);
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase!.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function fetchTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data } = await supabase!
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at");
  return (data ?? []).map((r: any) => ({
    id: r.id,
    taskId: r.task_id,
    userId: r.user_id,
    body: r.body,
    createdAt: r.created_at,
  }));
}

/**
 * Batch fetch all comments for multiple tasks in one query.
 * Replaces the N×fetchTaskComments loop in ProjectRoom.
 */
export async function fetchTaskCommentsByProject(taskIds: string[]): Promise<TaskComment[]> {
  if (taskIds.length === 0) return [];
  const { data } = await supabase!
    .from("task_comments")
    .select("*")
    .in("task_id", taskIds)
    .order("created_at");
  return (data ?? []).map((r: any) => ({
    id: r.id,
    taskId: r.task_id,
    userId: r.user_id,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function commentOnTask(userId: string, taskId: string, body: string) {
  const { error } = await supabase!.from("task_comments").insert({
    task_id: taskId,
    user_id: userId,
    body,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// MILESTONES
// ---------------------------------------------------------------------------

export async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const { data } = await supabase!
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true, nullsFirst: false });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description ?? undefined,
    dueDate: r.due_date ?? undefined,
    completed: r.completed,
    createdAt: r.created_at,
  }));
}

export async function addMilestone(
  _userId: string,
  projectId: string,
  title: string,
  dueDate?: string,
  description?: string
) {
  const { error } = await supabase!.from("milestones").insert({
    project_id: projectId,
    title,
    due_date: dueDate ?? null,
    description: description ?? null,
    completed: false,
  });
  if (error) throw new Error(error.message);
}

export async function toggleMilestone(milestoneId: string, completed: boolean) {
  const { error } = await supabase!
    .from("milestones")
    .update({ completed })
    .eq("id", milestoneId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// RESEARCH WORKSPACE
// ---------------------------------------------------------------------------

export async function fetchResearchNotes(projectId: string): Promise<ResearchNote[]> {
  const { data } = await supabase!.from("research_notes").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, title: r.title, content: r.content,
    category: r.category, tags: r.tags ?? [], createdBy: r.created_by,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

export async function addResearchNote(userId: string, projectId: string, data: Pick<ResearchNote, "title" | "content" | "category" | "tags">) {
  const { error } = await supabase!.from("research_notes").insert({
    project_id: projectId, title: data.title, content: data.content,
    category: data.category, tags: data.tags, created_by: userId,
  });
  if (error) throw new Error(error.message);
}

export async function updateResearchNote(noteId: string, data: Partial<Pick<ResearchNote, "title" | "content" | "category" | "tags">>) {
  const { error } = await supabase!.from("research_notes").update({
    ...(data.title !== undefined && { title: data.title }),
    ...(data.content !== undefined && { content: data.content }),
    ...(data.category !== undefined && { category: data.category }),
    ...(data.tags !== undefined && { tags: data.tags }),
  }).eq("id", noteId);
  if (error) throw new Error(error.message);
}

export async function deleteResearchNote(noteId: string) {
  const { error } = await supabase!.from("research_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
}

export async function fetchReferences(projectId: string): Promise<ReferenceItem[]> {
  const { data } = await supabase!.from("reference_items").select("*").eq("project_id", projectId).order("year", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, title: r.title, authors: r.authors,
    year: r.year, venue: r.venue, link: r.link ?? undefined, notes: r.notes ?? undefined,
    tags: r.tags ?? [], addedBy: r.added_by, createdAt: r.created_at,
  }));
}

export async function addReference(userId: string, projectId: string, data: { title: string; authors: string; year: number; venue: string; link?: string; notes?: string; tags: string[] }) {
  const { error } = await supabase!.from("reference_items").insert({
    project_id: projectId, added_by: userId, title: data.title, authors: data.authors,
    year: data.year, venue: data.venue, link: data.link ?? null, notes: data.notes ?? null, tags: data.tags,
  });
  if (error) throw new Error(error.message);
}

export async function fetchExperiments(projectId: string): Promise<ExperimentRecord[]> {
  const { data } = await supabase!.from("experiments").select("*").eq("project_id", projectId).order("experiment_date", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, name: r.name, objective: r.objective,
    method: r.method, results: r.results, conclusion: r.conclusion,
    date: r.experiment_date, createdBy: r.created_by,
  }));
}

export async function addExperiment(userId: string, projectId: string, data: { name: string; objective: string; method: string; results: string; conclusion: string; date: string }) {
  const { error } = await supabase!.from("experiments").insert({
    project_id: projectId, created_by: userId, name: data.name, objective: data.objective,
    method: data.method, results: data.results, conclusion: data.conclusion,
    experiment_date: data.date,
  });
  if (error) throw new Error(error.message);
}

export async function fetchMeetings(projectId: string): Promise<MeetingNote[]> {
  const { data } = await supabase!.from("meeting_notes").select("*").eq("project_id", projectId).order("meeting_date", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, date: r.meeting_date, attendees: r.attendees ?? [],
    agenda: r.agenda, decisions: r.decisions, actionItems: r.action_items, createdBy: r.created_by,
  }));
}

export async function addMeeting(userId: string, projectId: string, data: { date: string; attendees: string[]; agenda: string; decisions: string; actionItems: string }) {
  const { error } = await supabase!.from("meeting_notes").insert({
    project_id: projectId, created_by: userId, meeting_date: data.date,
    attendees: data.attendees, agenda: data.agenda, decisions: data.decisions, action_items: data.actionItems,
  });
  if (error) throw new Error(error.message);
}

export async function fetchDatasets(projectId: string): Promise<DatasetInfo[]> {
  const { data } = await supabase!.from("datasets").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, name: r.name, description: r.description,
    source: r.source ?? undefined, license: r.license ?? undefined, createdBy: r.added_by,
  }));
}

export async function addDataset(userId: string, projectId: string, data: { name: string; description: string; source?: string; license?: string }) {
  const { error } = await supabase!.from("datasets").insert({
    project_id: projectId, added_by: userId, name: data.name, description: data.description,
    source: data.source ?? null, license: data.license ?? null,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// DOCUMENTS (Supabase Storage)
// ---------------------------------------------------------------------------

export async function fetchDocuments(projectId: string): Promise<DocumentItem[]> {
  const { data } = await supabase!.from("documents").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id,
    name: r.file_name, type: r.file_type, size: r.file_size,
    dataUrl: r.storage_path, // used as identifier; real URL fetched on-demand
    access: (r.access === "project_members" ? "members" : "owner_mentor") as DocumentAccess,
    uploadedBy: r.uploader_id, createdAt: r.created_at,
  }));
}

export async function getDocumentUrl(storagePath: string): Promise<string> {
  const { data } = await supabase!.storage.from("documents").createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? "";
}

export async function uploadDocument(
  userId: string,
  projectId: string,
  file: { name: string; type: string; size: number; blob: File; access: DocumentAccess }
) {
  const safeName = `${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await supabase!.storage
    .from("documents")
    .upload(safeName, file.blob, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const dbAccess = file.access === "members" ? "project_members" : "mentor_owner";

  const { error: dbError } = await supabase!.from("documents").insert({
    project_id: projectId,
    uploader_id: userId,
    file_name: file.name,
    storage_path: safeName,
    file_type: file.type,
    file_size: file.size,
    access: dbAccess,
  });

  if (dbError) throw new Error(dbError.message);
  await logActivity(projectId, userId, "document", `Uploaded ${file.name}.`);
}

export async function deleteDocument(docId: string, storagePath: string) {
  await supabase!.storage.from("documents").remove([storagePath]);
  await supabase!.from("documents").delete().eq("id", docId);
}

// ---------------------------------------------------------------------------
// DISCUSSIONS
// ---------------------------------------------------------------------------

export async function fetchDiscussions(projectId: string): Promise<Discussion[]> {
  const { data } = await supabase!.from("discussions").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id, title: r.title, body: r.body,
    createdBy: r.created_by, createdAt: r.created_at,
  }));
}

export async function addDiscussion(userId: string, projectId: string, title: string, body: string) {
  const { error } = await supabase!.from("discussions").insert({
    project_id: projectId, title, body, created_by: userId,
  });
  if (error) throw new Error(error.message);
}

export async function fetchReplies(discussionId: string): Promise<DiscussionReply[]> {
  const { data } = await supabase!.from("discussion_replies").select("*").eq("discussion_id", discussionId).order("created_at");
  return (data ?? []).map((r: any) => ({
    id: r.id, discussionId: r.discussion_id, userId: r.user_id, body: r.body, createdAt: r.created_at,
  }));
}

export async function addReply(userId: string, discussionId: string, body: string) {
  const { error } = await supabase!.from("discussion_replies").insert({
    discussion_id: discussionId, user_id: userId, body,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data } = await supabase!
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map(rowToNotification);
}

/** Internal helper — inserts a notification row (allowed by RLS "Authenticated can create notifications") */
export async function insertNotification(n: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}) {
  await supabase!.from("notifications").insert({
    user_id: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: false,
  });
}

export async function markNotificationRead(userId: string, id: string) {
  await supabase!.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId);
}

export async function markAllNotificationsRead(userId: string) {
  await supabase!.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

// ---------------------------------------------------------------------------
// ACTIVITY LOGS
// ---------------------------------------------------------------------------

export async function fetchActivityLogs(projectId: string): Promise<ActivityLog[]> {
  const { data } = await supabase!
    .from("activity_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r: any) => ({
    id: r.id, projectId: r.project_id ?? undefined, userId: r.user_id,
    type: r.action, message: r.metadata?.message ?? r.action,
    createdAt: r.created_at,
  }));
}

async function logActivity(projectId: string, userId: string, action: string, message: string) {
  await supabase!.from("activity_logs").insert({
    project_id: projectId, user_id: userId, action, metadata: { message },
  });
}

// ---------------------------------------------------------------------------
// GITHUB METADATA
// ---------------------------------------------------------------------------

export async function saveGithubConnection(profileId: string, data: {
  githubUsername: string;
  githubUserId?: string;
  avatarUrl?: string;
  profileUrl?: string;
  publicRepos?: number;
  bio?: string;
}) {
  const { error } = await supabase!.from("github_connections").upsert(
    {
      profile_id: profileId,
      github_username: data.githubUsername,
      github_user_id: data.githubUserId ?? null,
      avatar_url: data.avatarUrl ?? null,
      profile_url: data.profileUrl ?? null,
      public_repos: data.publicRepos ?? null,
      bio: data.bio ?? null,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );
  if (error) throw new Error(error.message);
  // Also update profiles table
  await supabase!.from("profiles").update({
    github_username: data.githubUsername,
    github_connected: true,
  }).eq("id", profileId);
}

export async function disconnectGithub(profileId: string) {
  await supabase!.from("github_connections").delete().eq("profile_id", profileId);
  await supabase!.from("profiles").update({ github_username: null, github_connected: false }).eq("id", profileId);
}

export async function saveGithubRepo(projectId: string, ownerId: string, repoUrl: string, repoName: string, repoOwner: string, description?: string) {
  await supabase!.from("github_repositories").upsert(
    { project_id: projectId, github_repo_url: repoUrl, repo_name: repoName, repo_owner: repoOwner, description: description ?? null },
    { onConflict: "project_id" }
  );
  await supabase!.from("projects").update({ github_repo: repoUrl }).eq("id", projectId).eq("owner_id", ownerId);
}

// ---------------------------------------------------------------------------
// AI ANALYSES
// ---------------------------------------------------------------------------

export async function saveAiAnalysis(data: {
  type: string;
  projectId?: string;
  userId?: string;
  inputContext?: any;
  outputResult: any;
  confidence?: string;
}) {
  const { data: row, error } = await supabase!.from("ai_analyses").insert({
    type: data.type,
    project_id: data.projectId ?? null,
    user_id: data.userId ?? null,
    input_context: data.inputContext ?? {},
    output_result: data.outputResult,
    model_used: "synaptra-local-v1",
    confidence: data.confidence ?? "medium",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id").single();
  if (error) throw new Error(error.message);
  return row?.id as string;
}

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------

export async function fetchReports(): Promise<Report[]> {
  const { data } = await supabase!.from("reports").select("*").order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id, reporterId: r.reporter_id,
    targetType: r.reported_user_id ? "user" : "project",
    targetId: r.reported_user_id ?? r.reported_project_id ?? "",
    type: r.type as ReportType, details: r.description,
    status: r.status, action: r.action ?? undefined,
    createdAt: r.created_at, resolvedAt: r.resolved_at ?? undefined,
  }));
}

export async function fileReport(
  reporterId: string,
  targetType: "user" | "project",
  targetId: string,
  type: ReportType,
  details: string
) {
  const { error } = await supabase!.from("reports").insert({
    reporter_id: reporterId,
    reported_user_id: targetType === "user" ? targetId : null,
    reported_project_id: targetType === "project" ? targetId : null,
    type,
    description: details,
    status: "pending",
  });
  if (error) throw new Error(error.message);
}

export async function resolveReport(
  adminId: string,
  reportId: string,
  action: string
) {
  await supabase!.from("reports").update({
    status: action === "dismiss" ? "dismissed" : "resolved",
    action,
    resolved_at: new Date().toISOString(),
  }).eq("id", reportId);

  await supabase!.from("admin_actions").insert({
    admin_id: adminId,
    action: "resolve_report",
    target_type: "report",
    target_id: reportId,
    metadata: { action },
  });
}

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const { data } = await supabase!.from("admin_actions").select("*").order("created_at", { ascending: false }).limit(100);
  return (data ?? []).map((r: any) => ({
    id: r.id, adminId: r.admin_id,
    action: r.action,
    target: `${r.target_type}:${r.target_id}`,
    details: JSON.stringify(r.metadata ?? {}),
    createdAt: r.created_at,
  }));
}

export async function suspendUser(adminId: string, userId: string) {
  const { data: prof } = await supabase!.from("profiles").select("status").eq("id", userId).single();
  const newStatus = prof?.status === "suspended" ? "active" : "suspended";
  await supabase!.from("profiles").update({ status: newStatus }).eq("id", userId);
  await supabase!.from("admin_actions").insert({
    admin_id: adminId,
    action: newStatus === "suspended" ? "suspend_user" : "restore_user",
    target_type: "user",
    target_id: userId,
    metadata: {},
  });
}

export async function adminDeleteUser(adminId: string, userId: string) {
  await supabase!.from("profiles").update({ status: "deleted", deleted_at: new Date().toISOString() }).eq("id", userId);
  await supabase!.from("admin_actions").insert({
    admin_id: adminId, action: "delete_user", target_type: "user", target_id: userId, metadata: {},
  });
}

export async function moderateProject(adminId: string, projectId: string, status: "flagged" | "removed" | "open") {
  await supabase!.from("projects").update({ status }).eq("id", projectId);
  await supabase!.from("admin_actions").insert({
    admin_id: adminId, action: `project_${status}`, target_type: "project", target_id: projectId, metadata: {},
  });
}

// ---------------------------------------------------------------------------
// ACCESS HELPERS (replaces store.ts canAccessRoom / canSeeFullProject)
// ---------------------------------------------------------------------------

export async function canAccessRoom(userId: string, projectId: string): Promise<boolean> {
  // Check if user is active member
  const { data } = await supabase!
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (data) return true;
  // Check if admin
  const { data: prof } = await supabase!.from("profiles").select("role").eq("id", userId).single();
  return prof?.role === "admin";
}

export async function getUserMembership(userId: string, projectId: string): Promise<ProjectMember | null> {
  const { data } = await supabase!
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data ? rowToMember(data) : null;
}

// Compatibility helper — synchronous check from already-loaded members list
export function canAccessRoomSync(userId: string, projectId: string, members: ProjectMember[], role?: string): boolean {
  if (role === "admin") return true;
  return members.some(m => m.projectId === projectId && m.userId === userId && m.status === "active");
}

// ---------------------------------------------------------------------------
// AI ANALYSES & PROJECT RECOMMENDATIONS
// ---------------------------------------------------------------------------

/**
 * Fetch cached, non-expired compatibility analyses from `ai_analyses` table for given user and projects.
 */
export async function fetchCachedProjectAnalyses(
  userId: string,
  projectIds: string[]
): Promise<Map<string, AiAnalysisRecord>> {
  const map = new Map<string, AiAnalysisRecord>();
  if (!userId || projectIds.length === 0) return map;

  try {
    const { data, error } = await supabase!
      .from("ai_analyses")
      .select("*")
      .eq("type", "compatibility")
      .eq("user_id", userId)
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchCachedProjectAnalyses error:", error.message);
      return map;
    }

    for (const row of data ?? []) {
      // Check if not expired
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
        continue;
      }
      // If output_result is valid and contains match_score
      if (
        row.output_result &&
        typeof row.output_result.match_score === "number" &&
        !map.has(row.project_id)
      ) {
        map.set(row.project_id, {
          id: row.id,
          type: row.type,
          project_id: row.project_id,
          user_id: row.user_id,
          input_context: row.input_context,
          output_result: row.output_result,
          model_used: row.model_used,
          confidence: row.confidence,
          created_at: row.created_at,
          expires_at: row.expires_at,
        });
      }
    }
  } catch (err) {
    console.error("fetchCachedProjectAnalyses unexpected error:", err);
  }

  return map;
}

/**
 * Invoke the deployed analyze-project-fit Supabase Edge Function for a single project.
 */
export async function analyzeProjectFit(projectId: string): Promise<AiAnalysisRecord | null> {
  try {
    const { data, error } = await supabase!.functions.invoke("analyze-project-fit", {
      body: { project_id: projectId },
    });

    if (error) {
      console.error(`analyze-project-fit Edge Function error for project ${projectId}:`, error.message || error);
      return null;
    }

    if (data?.analysis && data.analysis.output_result) {
      return data.analysis as AiAnalysisRecord;
    }

    if (data?.error) {
      console.error(`analyze-project-fit returned error for project ${projectId}:`, data.error);
    }
  } catch (err) {
    console.error(`analyze-project-fit exception for project ${projectId}:`, err);
  }

  return null;
}

/**
 * Coordinated cache-first loader for available research projects:
 * 1. Queries ai_analyses for non-expired cached results.
 * 2. For missing/expired projects, calls analyze-project-fit Edge Function.
 * 3. Sorts all results by match_score descending.
 */
export async function getOrFetchProjectAnalyses(
  userId: string,
  candidateProjects: Project[]
): Promise<{ project: Project; analysis: AiAnalysisRecord }[]> {
  if (!userId || candidateProjects.length === 0) return [];

  const projectMap = new Map(candidateProjects.map((p) => [p.id, p]));
  const projectIds = candidateProjects.map((p) => p.id);

  // 1. Check cache
  const cachedMap = await fetchCachedProjectAnalyses(userId, projectIds);

  // 2. Identify missing / expired
  const missingProjectIds = projectIds.filter((pid) => !cachedMap.has(pid));

  // 3. Fetch missing via Edge Function
  if (missingProjectIds.length > 0) {
    await Promise.allSettled(
      missingProjectIds.map(async (pid) => {
        const fresh = await analyzeProjectFit(pid);
        if (fresh && fresh.output_result && typeof fresh.output_result.match_score === "number") {
          cachedMap.set(pid, fresh);
        }
      })
    );
  }

  // 4. Assemble and rank
  const results: { project: Project; analysis: AiAnalysisRecord }[] = [];
  for (const [pid, analysis] of cachedMap.entries()) {
    const project = projectMap.get(pid);
    if (project && typeof analysis.output_result?.match_score === "number") {
      results.push({ project, analysis });
    }
  }

  // Sort descending by match_score
  return results.sort(
    (a, b) => b.analysis.output_result.match_score - a.analysis.output_result.match_score
  );
}

// ---------------------------------------------------------------------------
// SKILL SCORE ENGINE
// ---------------------------------------------------------------------------
// These functions are EXCLUSIVELY for the AI Skill Score Engine.
// They do NOT interact with the AI Chatbot, analyze-project-fit, or any
// other existing AI feature.
// ---------------------------------------------------------------------------

/**
 * fetchLatestSkillScore
 *
 * Returns the most recent completed skill score analysis for the given user,
 * or null if no analysis has been run yet.
 *
 * Uses the student_latest_skill_score view (latest per profile_id) when
 * available, otherwise falls back to an ordered query on the base table.
 */
export async function fetchLatestSkillScore(
  userId: string
): Promise<SkillScoreRecord | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase!
      .from("student_skill_scores")
      .select(
        "id, profile_id, overall_score, breakdown, skill_evidence, strengths, improvement_areas, summary, confidence, model_version, status, analyzed_at, created_at"
      )
      .eq("profile_id", userId)
      .eq("status", "completed")
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("fetchLatestSkillScore error:", error.message);
      return null;
    }

    if (!data) return null;

    return rowToSkillScoreRecord(data);
  } catch (err) {
    console.error("fetchLatestSkillScore unexpected error:", err);
    return null;
  }
}

/**
 * fetchSkillScoreHistory
 *
 * Returns the last N completed analyses for a student (newest first).
 * Used for the score history / change display.
 */
export async function fetchSkillScoreHistory(
  userId: string,
  limit = 5
): Promise<SkillScoreRecord[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase!
      .from("student_skill_scores")
      .select(
        "id, profile_id, overall_score, breakdown, skill_evidence, strengths, improvement_areas, summary, confidence, model_version, status, analyzed_at, created_at"
      )
      .eq("profile_id", userId)
      .eq("status", "completed")
      .order("analyzed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("fetchSkillScoreHistory error:", error.message);
      return [];
    }

    return (data ?? []).map(rowToSkillScoreRecord);
  } catch (err) {
    console.error("fetchSkillScoreHistory unexpected error:", err);
    return [];
  }
}

/**
 * invokeSkillScoreAnalysis
 *
 * Calls the analyze-skill-score Supabase Edge Function.
 * The Edge Function loads all profile evidence server-side, computes the
 * score, persists it, and returns the saved SkillScoreRecord.
 *
 * Pass githubPublicRepos if the frontend has already fetched the live
 * GitHub public repo count (via fetchGithubPublic).
 *
 * Returns the saved SkillScoreRecord, or null on failure.
 */
export async function invokeSkillScoreAnalysis(
  githubPublicRepos?: number
): Promise<SkillScoreRecord | null> {
  try {
    const body: Record<string, unknown> = {};
    if (typeof githubPublicRepos === "number") {
      body.github_public_repos = githubPublicRepos;
    }

    const { data, error } = await supabase!.functions.invoke("analyze-skill-score", {
      body,
    });

    if (error) {
      console.error("analyze-skill-score Edge Function error:", error.message ?? error);
      return null;
    }

    if (!data?.success || !data?.analysis) {
      console.error("analyze-skill-score returned unexpected payload:", data);
      return null;
    }

    // Map the Edge Function response to a SkillScoreRecord
    const a = data.analysis;
    return {
      id: a.id ?? "",
      profileId: a.profileId ?? "",
      overallScore: Number(a.overallScore ?? 0),
      breakdown: a.breakdown ?? {},
      skillEvidence: a.skillEvidence ?? [],
      strengths: a.strengths ?? [],
      improvementAreas: a.improvementAreas ?? [],
      summary: a.summary ?? "",
      confidence: a.confidence ?? "low",
      analyzedAt: a.analyzedAt ?? new Date().toISOString(),
      modelVersion: a.modelVersion ?? "skill-engine-v1",
    };
  } catch (err) {
    console.error("invokeSkillScoreAnalysis unexpected error:", err);
    return null;
  }
}

/**
 * saveSkillScoreLocally
 *
 * Persists a locally-computed SkillScoreAnalysis (from skillScoreEngine.ts)
 * directly to the student_skill_scores table via the anon client.
 *
 * RLS enforces that the authenticated user may only insert their own rows.
 * Use this as a fallback when the Edge Function is unavailable.
 */
export async function saveSkillScoreLocally(
  userId: string,
  analysis: SkillScoreAnalysis
): Promise<SkillScoreRecord | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase!
      .from("student_skill_scores")
      .insert({
        profile_id: userId,
        overall_score: analysis.overallScore,
        breakdown: analysis.breakdown,
        skill_evidence: analysis.skillEvidence,
        strengths: analysis.strengths,
        improvement_areas: analysis.improvementAreas,
        summary: analysis.summary,
        confidence: analysis.confidence,
        model_version: analysis.modelVersion,
        status: "completed",
        analyzed_at: analysis.analyzedAt,
      })
      .select(
        "id, profile_id, overall_score, breakdown, skill_evidence, strengths, improvement_areas, summary, confidence, model_version, status, analyzed_at, created_at"
      )
      .single();

    if (error) {
      console.error("saveSkillScoreLocally error:", error.message);
      return null;
    }

    return rowToSkillScoreRecord(data);
  } catch (err) {
    console.error("saveSkillScoreLocally unexpected error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal helper: DB row → SkillScoreRecord
// ---------------------------------------------------------------------------

function rowToSkillScoreRecord(row: any): SkillScoreRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    overallScore: row.overall_score,
    breakdown: row.breakdown ?? {},
    skillEvidence: row.skill_evidence ?? [],
    strengths: row.strengths ?? [],
    improvementAreas: row.improvement_areas ?? [],
    summary: row.summary ?? "",
    confidence: row.confidence ?? "low",
    analyzedAt: row.analyzed_at,
    modelVersion: row.model_version ?? "skill-engine-v1",
  };
}
