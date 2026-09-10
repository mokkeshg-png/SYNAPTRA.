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
