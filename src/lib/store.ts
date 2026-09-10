<<<<<<< Updated upstream
/**
 * store.ts — Compatibility shim.
 * The localStorage AppState has been replaced by Supabase.
 * This file re-exports helpers still referenced by pages/components
 * so the codebase compiles without changing every import site at once.
 *
 * All data-mutation operations now live in supabase-db.ts.
 * All auth operations now live in AuthContext.tsx.
 */

export { uid, nowIso } from "@/lib/utils";

import type { ProjectRole } from "@/types";
import { uid } from "@/lib/utils";

/** Create a new ProjectRole object with a local ID (used in forms before saving) */
=======
import type {
  AppState,
  Discussion,
  DocumentAccess,
  DocumentItem,
  JoinRequest,
  MentorshipRequest,
  NotificationType,
  Profile,
  Project,
  ProjectRole,
  ReportType,
  ResearchNote,
  Task,
  TaskPriority,
  TaskStatus,
  User,
} from "@/types";
import { computeCompleteness } from "@/lib/completeness";
import { analyzeCompatibility } from "@/lib/matching";
import { createSeed } from "@/lib/seed";
import { hashPassword, nowIso, uid } from "@/lib/utils";

const KEY = "synaptra-state-v1";
let memory: AppState | null = null;
const listeners = new Set<() => void>();

function persist() {
  if (!memory) return;
  localStorage.setItem(KEY, JSON.stringify(memory));
  listeners.forEach((l) => l());
}

export function subscribeStore(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState(): AppState {
  if (!memory) throw new Error("Store not initialized");
  return memory;
}

export async function initStore() {
  if (memory) return;
  const raw = localStorage.getItem(KEY);
  if (raw) {
    memory = JSON.parse(raw) as AppState;
    return;
  }
  memory = await createSeed();
  const jr = memory.joinRequests.find((j) => j.id === "jr-health-rahul");
  const project = memory.projects.find((p) => p.id === "p-health");
  const profile = memory.profiles.find((p) => p.userId === "u-rahul");
  if (jr && project && profile) {
    const role = project.roles.find((r) => r.id === jr.selectedRoleId);
    jr.analysis = analyzeCompatibility(project, profile, role?.name);
    memory.aiLogs.push({
      id: uid("ai"),
      type: "compatibility",
      success: true,
      createdAt: nowIso(),
    });
  }
  persist();
}

export function resetStore() {
  localStorage.removeItem(KEY);
  memory = null;
}

function notify(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link: string
) {
  getState().notifications.unshift({
    id: uid("n"),
    userId,
    type,
    title,
    message,
    link,
    read: false,
    createdAt: nowIso(),
  });
}

function activity(projectId: string, userId: string, type: string, message: string) {
  getState().activity.unshift({
    id: uid("a"),
    projectId,
    userId,
    type,
    message,
    createdAt: nowIso(),
  });
}

function touchUser(id: string) {
  const u = getState().users.find((x) => x.id === id);
  if (u) {
    u.lastActiveAt = nowIso();
    u.updatedAt = nowIso();
  }
}

export function currentUser(): User | null {
  const id = getState().sessionUserId;
  if (!id) return null;
  return getState().users.find((u) => u.id === id) ?? null;
}

export function currentProfile(): Profile | null {
  const u = currentUser();
  if (!u) return null;
  return getState().profiles.find((p) => p.userId === u.id) ?? null;
}

export function profileByUser(userId: string) {
  return getState().profiles.find((p) => p.userId === userId);
}

export function publicProfileView(viewerId: string | null, profile: Profile) {
  if (profile.visibility === "public") return profile;
  if (!viewerId) return { ...profile, bio: undefined, availabilityHours: undefined, preferredTeamSize: undefined };
  if (profile.userId === viewerId) return profile;
  if (profile.visibility === "private") {
    return {
      ...profile,
      bio: undefined,
      availabilityHours: undefined,
      pastProjects: [],
      internships: [],
      certifications: [],
      publications: [],
    };
  }
  if (profile.visibility === "institution") {
    const viewer = profileByUser(viewerId);
    if (viewer?.institution !== profile.institution) {
      return { ...profile, availabilityHours: undefined };
    }
  }
  return profile;
}

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: "student" | "faculty";
  institution: string;
  department: string;
  academicYear?: number;
  designation?: string;
}) {
  const s = getState();
  if (s.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("An account with this email already exists.");
  }
  const token = uid("verify");
  const user: User = {
    id: uid("u"),
    email: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    role: input.role,
    emailVerified: false,
    verificationToken: token,
    status: "active",
    lastActiveAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const profile: Profile = {
    id: uid("prof"),
    userId: user.id,
    fullName: input.fullName,
    institution: input.institution,
    department: input.department,
    visibility: "public",
    profileCompleteness: 0,
    skills: [],
    interests: [],
    programmingLanguages: [],
    pastProjects: [],
    internships: [],
    certifications: [],
    publications: [],
    githubConnected: false,
    preferredRoles: [],
    academicYear: input.academicYear,
    designation: input.designation,
    subjectsTaught: [],
    teachingAreas: [],
    researchDomains: [],
    expertise: [],
    openToCollaboration: true,
    openToMentoring: input.role === "faculty",
    preferredProjectTypes: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  profile.profileCompleteness = computeCompleteness(profile);
  s.users.push(user);
  s.profiles.push(profile);
  persist();
  return { userId: user.id, verificationToken: token };
}

export async function verifyEmail(token: string) {
  const u = getState().users.find((x) => x.verificationToken === token);
  if (!u) throw new Error("This verification link is invalid or has already been used.");
  u.emailVerified = true;
  u.verificationToken = undefined;
  u.updatedAt = nowIso();
  persist();
  return u.id;
}

export async function login(email: string, password: string) {
  const s = getState();
  const hash = await hashPassword(password);
  const u = s.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u || u.passwordHash !== hash) throw new Error("Invalid email or password.");
  if (u.status === "suspended") throw new Error("This account has been suspended.");
  if (u.status === "deleted") throw new Error("This account is no longer available.");
  if (!u.emailVerified) throw new Error("UNVERIFIED");
  s.sessionUserId = u.id;
  touchUser(u.id);
  persist();
  return u;
}

export function loginAfterRegister(userId: string) {
  const s = getState();
  const u = s.users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found.");
  u.emailVerified = true;
  u.verificationToken = undefined;
  s.sessionUserId = u.id;
  touchUser(u.id);
  persist();
  return u;
}

export function logout() {
  getState().sessionUserId = null;
  persist();
}

export async function requestPasswordReset(email: string) {
  const u = getState().users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return { token: null as string | null };
  const token = uid("reset");
  u.resetToken = token;
  persist();
  return { token };
}

export async function resetPassword(token: string, password: string) {
  const u = getState().users.find((x) => x.resetToken === token);
  if (!u) throw new Error("This reset link is invalid.");
  u.passwordHash = await hashPassword(password);
  u.resetToken = undefined;
  persist();
}

export function saveProfile(userId: string, patch: Partial<Profile>) {
  const p = profileByUser(userId);
  if (!p) throw new Error("Profile not found.");
  Object.assign(p, patch, { updatedAt: nowIso() });
  p.profileCompleteness = computeCompleteness(p);
  persist();
  return p;
}

export function createProject(ownerId: string, data: Omit<Project, "id" | "ownerId" | "createdAt" | "updatedAt" | "status">) {
  const project: Project = {
    ...data,
    id: uid("p"),
    ownerId,
    status: "open",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const s = getState();
  s.projects.unshift(project);
  s.members.push({
    id: uid("m"),
    projectId: project.id,
    userId: ownerId,
    systemRole: "owner",
    status: "active",
    createdAt: nowIso(),
  });
  activity(project.id, ownerId, "project", "Project published.");
  persist();
  return project;
}

export function updateProject(ownerId: string, projectId: string, patch: Partial<Project>) {
  const p = getState().projects.find((x) => x.id === projectId);
  if (!p || p.ownerId !== ownerId) throw new Error("You can only edit projects you own.");
  Object.assign(p, patch, { updatedAt: nowIso() });
  activity(projectId, ownerId, "project", "Project details were updated.");
  getState()
    .members.filter((m) => m.projectId === projectId && m.status === "active")
    .forEach((m) =>
      notify(m.userId, "project_update", "Project updated", `${p.title} was updated.`, `/projects/${p.id}`)
    );
  persist();
  return p;
}

export function closeProject(ownerId: string, projectId: string) {
  return updateProject(ownerId, projectId, { status: "closed" });
}

export function completeProject(ownerId: string, projectId: string) {
  return updateProject(ownerId, projectId, { status: "completed" });
}

export function deleteProject(ownerId: string, projectId: string) {
  const s = getState();
  const p = s.projects.find((x) => x.id === projectId);
  if (!p || p.ownerId !== ownerId) throw new Error("You can only delete projects you own.");
  s.members
    .filter((m) => m.projectId === projectId)
    .forEach((m) =>
      notify(m.userId, "project_update", "Project deleted", `${p.title} was deleted by the owner.`, "/projects")
    );
  s.projects = s.projects.filter((x) => x.id !== projectId);
  persist();
}

export function applyToProject(input: {
  projectId: string;
  applicantId: string;
  selectedRoleId: string;
  motivation: string;
  relevantExperience: string;
  message?: string;
}) {
  const s = getState();
  const project = s.projects.find((p) => p.id === input.projectId);
  const applicant = profileByUser(input.applicantId);
  if (!project || !applicant) throw new Error("Project not found.");
  if (project.ownerId === input.applicantId) throw new Error("You cannot apply to your own project.");
  if (project.status !== "open") throw new Error("This project is not accepting applications.");
  if (project.deadline && new Date(project.deadline).getTime() < Date.now()) {
    throw new Error("The application deadline has passed.");
  }
  if (s.joinRequests.some((j) => j.projectId === project.id && j.applicantId === input.applicantId && j.status !== "withdrawn")) {
    throw new Error("You have already applied to this project.");
  }
  if (s.members.some((m) => m.projectId === project.id && m.userId === input.applicantId && m.status === "active")) {
    throw new Error("You are already a member of this project.");
  }
  const activeCount = s.members.filter((m) => m.projectId === project.id && m.status === "active").length;
  if (activeCount >= project.teamMax) throw new Error("This project team is full.");
  if (project.visibility === "private") {
    const invited = s.invitations.some(
      (i) => i.projectId === project.id && i.inviteeId === input.applicantId && i.status === "pending"
    );
    if (!invited) throw new Error("This project is invite only.");
  }
  const role = project.roles.find((r) => r.id === input.selectedRoleId);
  const analysis = analyzeCompatibility(project, applicant, role?.name);
  const jr: JoinRequest = {
    id: uid("jr"),
    ...input,
    status: "pending",
    analysis,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  s.joinRequests.unshift(jr);
  s.aiLogs.push({ id: uid("ai"), type: "compatibility", success: true, createdAt: nowIso() });
  notify(
    project.ownerId,
    "join_request",
    "Join request received",
    `${applicant.fullName} applied to ${project.title}.`,
    `/room/${project.id}?tab=applications`
  );
  persist();
  return jr;
}

export function withdrawApplication(applicantId: string, requestId: string) {
  const jr = getState().joinRequests.find((j) => j.id === requestId && j.applicantId === applicantId);
  if (!jr || jr.status !== "pending") throw new Error("Only pending applications can be withdrawn.");
  jr.status = "withdrawn";
  jr.updatedAt = nowIso();
  persist();
}

export function reviewApplication(
  ownerId: string,
  requestId: string,
  decision: "accepted" | "rejected",
  reason?: string
) {
  const s = getState();
  const jr = s.joinRequests.find((j) => j.id === requestId);
  if (!jr) throw new Error("Application not found.");
  const project = s.projects.find((p) => p.id === jr.projectId);
  if (!project || project.ownerId !== ownerId) throw new Error("Only the project owner can review applications.");
  if (jr.status !== "pending") throw new Error("This application is no longer pending.");
  jr.status = decision;
  jr.rejectReason = reason;
  jr.updatedAt = nowIso();
  const applicant = profileByUser(jr.applicantId);
  if (decision === "accepted") {
    s.members.push({
      id: uid("m"),
      projectId: project.id,
      userId: jr.applicantId,
      systemRole: "member",
      roleId: jr.selectedRoleId,
      status: "active",
      createdAt: nowIso(),
    });
    notify(
      jr.applicantId,
      "application_accepted",
      "Application accepted",
      `Your application to ${project.title} was accepted.`,
      `/room/${project.id}`
    );
    s.members
      .filter((m) => m.projectId === project.id && m.status === "active" && m.userId !== jr.applicantId)
      .forEach((m) =>
        notify(
          m.userId,
          "new_team_member",
          "New team member",
          `${applicant?.fullName ?? "A member"} joined ${project.title}.`,
          `/room/${project.id}`
        )
      );
    activity(project.id, ownerId, "member", `${applicant?.fullName ?? "Member"} was accepted.`);
  } else {
    notify(
      jr.applicantId,
      "application_rejected",
      "Application not accepted",
      `Your application to ${project.title} was not accepted.${reason ? ` ${reason}` : ""}`,
      `/projects/${project.id}`
    );
  }
  persist();
}

export function inviteUser(ownerId: string, projectId: string, inviteeId: string, roleId?: string, message?: string) {
  const s = getState();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project || project.ownerId !== ownerId) throw new Error("Only the owner can invite collaborators.");
  s.invitations.unshift({
    id: uid("inv"),
    projectId,
    inviterId: ownerId,
    inviteeId,
    roleId,
    message,
    status: "pending",
    createdAt: nowIso(),
  });
  notify(
    inviteeId,
    "project_invitation",
    "Project invitation",
    `You were invited to ${project.title}.`,
    `/projects/${project.id}`
  );
  persist();
}

export function respondInvitation(userId: string, invitationId: string, accept: boolean) {
  const s = getState();
  const inv = s.invitations.find((i) => i.id === invitationId && i.inviteeId === userId);
  if (!inv || inv.status !== "pending") throw new Error("Invitation is no longer valid.");
  inv.status = accept ? "accepted" : "declined";
  if (accept) {
    s.members.push({
      id: uid("m"),
      projectId: inv.projectId,
      userId,
      systemRole: "member",
      roleId: inv.roleId,
      status: "active",
      createdAt: nowIso(),
    });
    const project = s.projects.find((p) => p.id === inv.projectId);
    if (project) {
      notify(project.ownerId, "new_team_member", "Invitation accepted", `${profileByUser(userId)?.fullName} joined ${project.title}.`, `/room/${project.id}`);
      activity(project.id, userId, "member", `${profileByUser(userId)?.fullName} accepted an invitation.`);
    }
  }
  persist();
}

export function requestFullDetails(userId: string, projectId: string) {
  const s = getState();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found.");
  if (s.detailsRequests.some((d) => d.projectId === projectId && d.userId === userId && d.status === "pending")) {
    throw new Error("A request is already pending.");
  }
  s.detailsRequests.push({ id: uid("dr"), projectId, userId, status: "pending", createdAt: nowIso() });
  notify(project.ownerId, "details_request", "Full details requested", `${profileByUser(userId)?.fullName} requested full details for ${project.title}.`, `/room/${project.id}?tab=settings`);
  persist();
}

export function resolveDetailsRequest(ownerId: string, requestId: string, grant: boolean) {
  const s = getState();
  const dr = s.detailsRequests.find((d) => d.id === requestId);
  if (!dr) throw new Error("Request not found.");
  const project = s.projects.find((p) => p.id === dr.projectId);
  if (!project || project.ownerId !== ownerId) throw new Error("Not authorized.");
  dr.status = grant ? "granted" : "denied";
  persist();
}

export function requestMentorship(facultyId: string, projectId: string, message: string) {
  const s = getState();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found.");
  const req: MentorshipRequest = {
    id: uid("mr"),
    projectId,
    facultyId,
    message,
    status: "pending",
    createdAt: nowIso(),
  };
  s.mentorshipRequests.unshift(req);
  notify(project.ownerId, "mentorship_request", "Mentorship request", `${profileByUser(facultyId)?.fullName} requested to mentor ${project.title}.`, `/room/${project.id}?tab=team`);
  persist();
}

export function reviewMentorship(ownerId: string, requestId: string, accept: boolean) {
  const s = getState();
  const req = s.mentorshipRequests.find((m) => m.id === requestId);
  if (!req) throw new Error("Request not found.");
  const project = s.projects.find((p) => p.id === req.projectId);
  if (!project || project.ownerId !== ownerId) throw new Error("Not authorized.");
  req.status = accept ? "accepted" : "rejected";
  if (accept) {
    s.members.push({
      id: uid("m"),
      projectId: project.id,
      userId: req.facultyId,
      systemRole: "mentor",
      status: "active",
      createdAt: nowIso(),
    });
    activity(project.id, ownerId, "member", `${profileByUser(req.facultyId)?.fullName} joined as mentor.`);
    notify(req.facultyId, "application_accepted", "Mentorship accepted", `You are now mentoring ${project.title}.`, `/room/${project.id}`);
  }
  persist();
}

export function membership(userId: string, projectId: string) {
  return getState().members.find((m) => m.projectId === projectId && m.userId === userId && m.status === "active");
}

export function canAccessRoom(userId: string, projectId: string) {
  const u = getState().users.find((x) => x.id === userId);
  if (u?.role === "admin") return true;
  return Boolean(membership(userId, projectId));
}

export function canSeeFullProject(userId: string | null, project: Project) {
  if (project.visibility !== "restricted") return project.visibility === "public" || Boolean(userId && (project.ownerId === userId || canAccessRoom(userId, project.id) || getState().invitations.some((i) => i.projectId === project.id && i.inviteeId === userId)));
  if (!userId) return false;
  if (canAccessRoom(userId, project.id) || project.ownerId === userId) return true;
  return getState().detailsRequests.some((d) => d.projectId === project.id && d.userId === userId && d.status === "granted");
}

export function removeMember(ownerId: string, projectId: string, memberId: string) {
  const s = getState();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project || project.ownerId !== ownerId) throw new Error("Not authorized.");
  const m = s.members.find((x) => x.id === memberId && x.projectId === projectId);
  if (!m || m.systemRole === "owner") throw new Error("Cannot remove the owner.");
  m.status = "removed";
  notify(m.userId, "project_update", "Removed from project", `You were removed from ${project.title}.`, "/dashboard");
  persist();
}

export function leaveProject(userId: string, projectId: string) {
  const m = membership(userId, projectId);
  if (!m) throw new Error("You are not a member.");
  if (m.systemRole === "owner") throw new Error("Transfer ownership before leaving.");
  m.status = "left";
  persist();
}

export function assignRole(ownerId: string, projectId: string, memberUserId: string, roleId: string) {
  const project = getState().projects.find((p) => p.id === projectId);
  if (!project || project.ownerId !== ownerId) throw new Error("Not authorized.");
  const m = membership(memberUserId, projectId);
  if (!m) throw new Error("Member not found.");
  m.roleId = roleId;
  persist();
}

export function transferOwnership(ownerId: string, projectId: string, newOwnerId: string) {
  const s = getState();
  const project = s.projects.find((p) => p.id === projectId);
  if (!project || project.ownerId !== ownerId) throw new Error("Not authorized.");
  const next = membership(newOwnerId, projectId);
  if (!next) throw new Error("New owner must be an active member.");
  const current = membership(ownerId, projectId);
  if (current) current.systemRole = "member";
  next.systemRole = "owner";
  project.ownerId = newOwnerId;
  persist();
}

export function saveTask(userId: string, projectId: string, data: Partial<Task> & { title: string; priority: TaskPriority; status: TaskStatus }, existingId?: string) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  const s = getState();
  if (existingId) {
    const t = s.tasks.find((x) => x.id === existingId);
    if (!t) throw new Error("Task not found.");
    Object.assign(t, data, { updatedAt: nowIso() });
    if (data.assignedTo && data.assignedTo !== userId) {
      notify(data.assignedTo, "task_assigned", "Task assigned", `${data.title} was assigned to you.`, `/room/${projectId}?tab=tasks`);
    }
    persist();
    return t;
  }
  const task: Task = {
    id: uid("t"),
    projectId,
    title: data.title,
    description: data.description,
    assignedTo: data.assignedTo,
    roleId: data.roleId,
    priority: data.priority,
    deadline: data.deadline,
    status: data.status,
    createdBy: userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  s.tasks.push(task);
  activity(projectId, userId, "task", `Created task “${task.title}”.`);
  if (task.assignedTo) {
    notify(task.assignedTo, "task_assigned", "Task assigned", `${task.title} was assigned to you.`, `/room/${projectId}?tab=tasks`);
  }
  persist();
  return task;
}

export function commentOnTask(userId: string, taskId: string, body: string) {
  getState().taskComments.push({ id: uid("tc"), taskId, userId, body, createdAt: nowIso() });
  persist();
}

export function addMilestone(userId: string, projectId: string, title: string, dueDate?: string, description?: string) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  getState().milestones.push({
    id: uid("ms"),
    projectId,
    title,
    dueDate,
    description,
    completed: false,
    createdAt: nowIso(),
  });
  persist();
}

export function toggleMilestone(userId: string, id: string) {
  const m = getState().milestones.find((x) => x.id === id);
  if (!m || !canAccessRoom(userId, m.projectId)) throw new Error("Not authorized.");
  m.completed = !m.completed;
  persist();
}

export function addNote(userId: string, projectId: string, data: Pick<ResearchNote, "title" | "content" | "category" | "tags">) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  const note: ResearchNote = {
    id: uid("note"),
    projectId,
    ...data,
    createdBy: userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  getState().notes.unshift(note);
  persist();
  return note;
}

export function addReference(userId: string, projectId: string, data: { title: string; authors: string; year: number; venue: string; link?: string; notes?: string; tags: string[] }) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  getState().references.unshift({ id: uid("ref"), projectId, ...data, addedBy: userId, createdAt: nowIso() });
  persist();
}

export function addExperiment(userId: string, projectId: string, data: { name: string; objective: string; method: string; results: string; conclusion: string; date: string }) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  getState().experiments.unshift({ id: uid("ex"), projectId, ...data, createdBy: userId });
  persist();
}

export function addMeeting(userId: string, projectId: string, data: { date: string; attendees: string[]; agenda: string; decisions: string; actionItems: string }) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  getState().meetings.unshift({ id: uid("mt"), projectId, ...data, createdBy: userId });
  persist();
}

export function addDataset(userId: string, projectId: string, data: { name: string; description: string; source?: string; license?: string }) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  getState().datasets.unshift({ id: uid("ds"), projectId, ...data, createdBy: userId });
  persist();
}

export function addDocument(userId: string, projectId: string, file: { name: string; type: string; size: number; dataUrl: string; access: DocumentAccess }) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  const doc: DocumentItem = { id: uid("doc"), projectId, ...file, uploadedBy: userId, createdAt: nowIso() };
  getState().documents.unshift(doc);
  activity(projectId, userId, "document", `Uploaded ${file.name}.`);
  persist();
}

export function addDiscussion(userId: string, projectId: string, title: string, body: string) {
  if (!canAccessRoom(userId, projectId)) throw new Error("Not authorized.");
  const d: Discussion = { id: uid("d"), projectId, title, body, createdBy: userId, createdAt: nowIso() };
  getState().discussions.unshift(d);
  const mentions = body.match(/@[\w.-]+/g) ?? [];
  mentions.forEach((m) => {
    const name = m.slice(1).toLowerCase();
    const prof = getState().profiles.find((p) => p.fullName.toLowerCase().includes(name));
    if (prof) notify(prof.userId, "mention", "You were mentioned", `You were mentioned in ${title}.`, `/room/${projectId}?tab=discuss`);
  });
  persist();
}

export function addReply(userId: string, discussionId: string, body: string) {
  getState().replies.push({ id: uid("rp"), discussionId, userId, body, createdAt: nowIso() });
  persist();
}

export function setProjectGithub(ownerId: string, projectId: string, repo: string) {
  const p = getState().projects.find((x) => x.id === projectId);
  if (!p || p.ownerId !== ownerId) throw new Error("Not authorized.");
  p.githubRepo = repo;
  persist();
}

export function markNotificationRead(userId: string, id: string) {
  const n = getState().notifications.find((x) => x.id === id && x.userId === userId);
  if (n) n.read = true;
  persist();
}

export function markAllRead(userId: string) {
  getState().notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true));
  persist();
}

export function fileReport(reporterId: string, targetType: "user" | "project", targetId: string, type: ReportType, details: string) {
  getState().reports.unshift({
    id: uid("rep"),
    reporterId,
    targetType,
    targetId,
    type,
    details,
    status: "pending",
    createdAt: nowIso(),
  });
  persist();
}

export function adminAction(adminId: string, action: string, target: string, details: string) {
  getState().auditLogs.unshift({
    id: uid("aud"),
    adminId,
    action,
    target,
    details,
    createdAt: nowIso(),
  });
}

export function suspendUser(adminId: string, userId: string) {
  const u = getState().users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found.");
  u.status = u.status === "suspended" ? "active" : "suspended";
  adminAction(adminId, u.status === "suspended" ? "suspend_user" : "restore_user", userId, u.email);
  persist();
}

export function deleteUser(adminId: string, userId: string) {
  const u = getState().users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found.");
  u.status = "deleted";
  adminAction(adminId, "delete_user", userId, u.email);
  persist();
}

export function moderateProject(adminId: string, projectId: string, status: "flagged" | "removed" | "open") {
  const p = getState().projects.find((x) => x.id === projectId);
  if (!p) throw new Error("Project not found.");
  p.status = status;
  adminAction(adminId, `project_${status}`, projectId, p.title);
  persist();
}

export function resolveReport(adminId: string, reportId: string, action: "warn" | "suspend" | "remove_content" | "escalate" | "dismiss") {
  const r = getState().reports.find((x) => x.id === reportId);
  if (!r) throw new Error("Report not found.");
  r.status = action === "dismiss" ? "dismissed" : "resolved";
  r.action = action;
  r.resolvedAt = nowIso();
  if (action === "suspend" && r.targetType === "user") suspendUser(adminId, r.targetId);
  if (action === "remove_content" && r.targetType === "project") moderateProject(adminId, r.targetId, "removed");
  adminAction(adminId, "resolve_report", reportId, action);
  persist();
}

export function searchUsers(query: string, filters: { skill?: string; interest?: string; institution?: string; role?: string }) {
  const q = query.trim().toLowerCase();
  return getState()
    .profiles.filter((p) => {
      const u = getState().users.find((x) => x.id === p.userId);
      if (!u || u.role === "admin" || u.status !== "active") return false;
      if (p.visibility === "private") return false;
      const blob = `${p.fullName} ${p.institution} ${p.department} ${p.skills.map((s) => s.skill).join(" ")} ${p.interests.join(" ")}`.toLowerCase();
      if (q && !blob.includes(q)) return false;
      if (filters.skill && !p.skills.some((s) => s.skill.toLowerCase() === filters.skill!.toLowerCase())) return false;
      if (filters.interest && !p.interests.some((s) => s.toLowerCase() === filters.interest!.toLowerCase())) return false;
      if (filters.institution && !p.institution.toLowerCase().includes(filters.institution.toLowerCase())) return false;
      if (filters.role && !p.preferredRoles.some((r) => r.toLowerCase().includes(filters.role!.toLowerCase()))) return false;
      return true;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function searchProjects(query: string, filters: { domain?: string; skill?: string; difficulty?: string; type?: string; sort?: string }) {
  const q = query.trim().toLowerCase();
  let list = getState().projects.filter((p) => p.status === "open" || p.status === "closed" || p.status === "completed");
  list = list.filter((p) => p.visibility !== "private");
  list = list.filter((p) => {
    const blob = `${p.title} ${p.shortDescription} ${p.domains.join(" ")} ${p.requiredSkills.join(" ")} ${p.tags.join(" ")}`.toLowerCase();
    if (q && !blob.includes(q)) return false;
    if (filters.domain && !p.domains.some((d) => d.toLowerCase() === filters.domain!.toLowerCase())) return false;
    if (filters.skill && !p.requiredSkills.some((s) => s.toLowerCase() === filters.skill!.toLowerCase())) return false;
    if (filters.difficulty && p.difficulty !== filters.difficulty) return false;
    if (filters.type && p.type !== filters.type) return false;
    return true;
  });
  if (filters.sort === "deadline") {
    list.sort((a, b) => (a.deadline ?? "9").localeCompare(b.deadline ?? "9"));
  } else {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return list;
}

>>>>>>> Stashed changes
export function newRole(partial?: Partial<ProjectRole>): ProjectRole {
  return {
    id: uid("r"),
    name: partial?.name ?? "",
    description: partial?.description ?? "",
    requiredSkills: partial?.requiredSkills ?? [],
    openings: partial?.openings ?? 1,
  };
}

// Re-export everything from supabase-db so pages can gradually switch imports
export {
  signIn as login,
  signOut as logout,
  signUp as registerUser,
  resetPasswordEmail as requestPasswordReset,
  updatePassword as resetPassword,
  fetchProfile as currentProfileAsync,
  saveProfile,
  touchLastActive,
  fetchProjects,
  fetchProjectById,
  createProject,
  updateProject,
  deleteProject,
  fetchProjectMembers,
  removeMember,
  leaveProject,
  assignRole,
  transferOwnership,
  fetchJoinRequests,
  applyToProject,
  withdrawApplication,
  reviewApplication,
  fetchInvitations,
  inviteUser,
  respondInvitation,
  fetchDetailsRequests,
  requestFullDetails,
  resolveDetailsRequest,
  fetchMentorshipRequests,
  requestMentorship,
  reviewMentorship,
  canAccessRoom,
  canAccessRoomSync,
  getUserMembership,
  fetchTasks,
  saveTask,
  deleteTask,
  fetchTaskComments,
  commentOnTask,
  fetchMilestones,
  addMilestone,
  toggleMilestone,
  fetchResearchNotes,
  addResearchNote,
  updateResearchNote,
  deleteResearchNote,
  fetchReferences,
  addReference,
  fetchExperiments,
  addExperiment,
  fetchMeetings,
  addMeeting,
  fetchDatasets,
  addDataset,
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
  fetchDiscussions,
  addDiscussion,
  fetchReplies,
  addReply,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead as markAllRead,
  fetchActivityLogs,
  saveGithubConnection,
  disconnectGithub,
  saveGithubRepo,
  saveAiAnalysis,
  fetchReports,
  fileReport,
  resolveReport,
  fetchAuditLogs,
  suspendUser,
  adminDeleteUser as deleteUser,
  moderateProject,
} from "@/lib/supabase-db";
