import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProjectById,
  fetchProjectMembers,
  fetchAllProfiles,
  fetchTasks,
  fetchTaskComments,
  fetchTaskCommentsByProject,
  fetchMilestones,
  fetchResearchNotes,
  fetchReferences,
  fetchExperiments,
  fetchMeetings,
  fetchDatasets,
  fetchDocuments,
  fetchDiscussions,
  fetchReplies,
  fetchActivityLogs,
  canAccessRoomSync,
  saveTask,
  commentOnTask,
  addMilestone,
  toggleMilestone,
  addResearchNote as addNote,
  addReference,
  addExperiment,
  addMeeting,
  addDataset,
  uploadDocument,
  addDiscussion,
  addReply,
  saveGithubRepo,
  assignRole,
  removeMember,
  leaveProject,
  updateProject,
  inviteUser,
  getDocumentUrl,
} from "@/lib/supabase-db";
import { analyzeSkillGap } from "@/lib/matching";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Progress, EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import type {
  TaskStatus,
  TaskPriority,
  NoteCategory,
  DocumentAccess,
} from "@/types";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Milestone,
  BookOpen,
  FolderArchive,
  MessageSquare,
  GitBranch,
  Bot,
  Settings as SettingsIcon,
  Plus,
  Calendar,
  Send,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Check,
  Shield,
  FileText,
  Loader2,
} from "lucide-react";

type RoomTab =
  | "overview"
  | "team"
  | "ai-team"
  | "tasks"
  | "milestones"
  | "research"
  | "documents"
  | "discussions"
  | "github"
  | "ai-assistant"
  | "settings";

export function ProjectRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // All async state — replaces getState()
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<any[]>([]);
  const [projectNotes, setProjectNotes] = useState<any[]>([]);
  const [projectReferences, setProjectReferences] = useState<any[]>([]);
  const [projectExperiments, setProjectExperiments] = useState<any[]>([]);
  const [projectMeetings, setProjectMeetings] = useState<any[]>([]);
  const [projectDatasets, setProjectDatasets] = useState<any[]>([]);
  const [projectDocs, setProjectDocs] = useState<any[]>([]);
  const [projectDiscussions, setProjectDiscussions] = useState<any[]>([]);
  const [discussionReplies, setDiscussionReplies] = useState<any[]>([]);
  const [projectActivity, setProjectActivity] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const [activeTab, setActiveTab] = useState<RoomTab>("overview");
  const [researchSubTab, setResearchSubTab] = useState<"notes"|"references"|"experiments"|"meetings"|"datasets">("notes");

  const loadAll = useCallback(async () => {
    if (!id || !user) return;
    const [proj, mems, profiles] = await Promise.all([
      fetchProjectById(id),
      fetchProjectMembers(id),
      fetchAllProfiles(),
    ]);
    if (!proj) { setDataLoading(false); return; }
    setProject(proj);
    setMembers(mems);
    setAllProfiles(profiles);

    // Check access
    const access = canAccessRoomSync(user.id, id, mems);
    setHasAccess(access);
    if (!access) { setDataLoading(false); return; }

    // Load all workspace data in parallel
    const [tasks, milestones, notes, refs, exps, meetings, datasets, docs, discussions, activity] = await Promise.all([
      fetchTasks(id),
      fetchMilestones(id),
      fetchResearchNotes(id),
      fetchReferences(id),
      fetchExperiments(id),
      fetchMeetings(id),
      fetchDatasets(id),
      fetchDocuments(id),
      fetchDiscussions(id),
      fetchActivityLogs(id),
    ]);
    setProjectTasks(tasks);
    setProjectMilestones(milestones);
    setProjectNotes(notes);
    setProjectReferences(refs);
    setProjectExperiments(exps);
    setProjectMeetings(meetings);
    setProjectDatasets(datasets);
    setProjectDocs(docs);
    setProjectDiscussions(discussions);
    setProjectActivity(activity);

    // Load comments for all tasks
    // Load all task comments in a single batch query — replaces N×fetchTaskComments
    const allComments = tasks.length > 0
      ? await fetchTaskCommentsByProject(tasks.map((t: any) => t.id))
      : [];
    setTaskComments(allComments);

    setDataLoading(false);
  }, [id, user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refresh = useCallback(async () => { await loadAll(); }, [loadAll]);

  // Task comments, discussions
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("todo");
  const [taskAssignee, setTaskAssignee] = useState<string>("");
  const [taskDeadline, setTaskDeadline] = useState("");

  // Task Comments Modal
  const [commentModalTaskId, setCommentModalTaskId] = useState<string | null>(null);
  const [newCommentBody, setNewCommentBody] = useState("");

  // Milestone Modal
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [msTitle, setMsTitle] = useState("");
  const [msDesc, setMsDesc] = useState("");
  const [msDueDate, setMsDueDate] = useState("");

  // Research Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<NoteCategory>("literature");
  const [noteTags, setNoteTags] = useState("theory, literature");

  const [refModalOpen, setRefModalOpen] = useState(false);
  const [refTitle, setRefTitle] = useState("");
  const [refAuthors, setRefAuthors] = useState("");
  const [refVenue, setRefVenue] = useState("");
  const [refYear, setRefYear] = useState(2024);
  const [refLink, setRefLink] = useState("");
  const [refNotes, setRefNotes] = useState("");

  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expName, setExpName] = useState("");
  const [expObj, setExpObj] = useState("");
  const [expMethod, setExpMethod] = useState("");
  const [expResults, setExpResults] = useState("");
  const [expConclusion, setExpConclusion] = useState("");

  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingDecisions, setMeetingDecisions] = useState("");
  const [meetingActions, setMeetingActions] = useState("");

  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [datasetDesc, setDatasetDesc] = useState("");
  const [datasetSource, setDatasetSource] = useState("");
  const [datasetLicense] = useState("MIT / Open Academic");

  // Document Upload Modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docAccess, setDocAccess] = useState<DocumentAccess>("members");

  // Discussion state
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [discModalOpen, setDiscModalOpen] = useState(false);
  const [discTitle, setDiscTitle] = useState("");
  const [discBody, setDiscBody] = useState("");

  // Invite member modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  // GitHub Modal
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [repoInput, setRepoInput] = useState("");

  // AI Assistant Chat state
  const [aiChatMessages, setAiChatMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; time: string }>
  >([
    {
      sender: "ai",
      text: "Hello! I am your SYNAPTRA AI Project Assistant. I have indexed all tasks, research notes, meeting records, and member assignments for this workspace. How can I assist your team today?",
      time: "Just now",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);

  // Settings state
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsVis, setSettingsVis] = useState("public");

  // Sync settings state from project once loaded
  useEffect(() => {
    if (project) {
      setSettingsTitle(project.title || "");
      setSettingsDesc(project.shortDescription || "");
      setSettingsVis(project.visibility || "public");
      setRepoInput(project.githubRepo || "");
    }
  }, [project]);

  if (dataLoading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy" /></div>;
  }

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-ink">Project Not Found</h2>
        <Link to="/projects"><Button variant="outline">Back to Projects</Button></Link>
      </div>
    );
  }

  // Check access authorization per PRD Section 28.1 & Permission Matrix
  if (!user || !hasAccess) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center p-6">
        <div className="rounded-full bg-red-100 p-3 text-red-700"><Shield className="h-8 w-8" /></div>
        <h2 className="font-serif text-2xl font-bold text-ink">Private Project Room</h2>
        <p className="text-sm text-ink-500 max-w-md">Access restricted to accepted team members, faculty mentors, and project owners.</p>
        <Link to={`/projects/${id}`}><Button>View Project Overview & Apply</Button></Link>
      </div>
    );
  }

  const isOwner = user.id === project.ownerId;
  const ownerProfile = allProfiles.find((p: any) => p.userId === project.ownerId);

  // Active Team members
  const teamMembers = members
    .filter((m: any) => m.status === "active")
    .map((m: any) => {
      const p = allProfiles.find((pr: any) => pr.userId === m.userId);
      const role = project.roles.find((r: any) => r.id === m.roleId);
      return { member: m, profile: p, roleName: role?.name };
    });

  const completedTasks = projectTasks.filter((t: any) => t.status === "completed");
  const taskProgress = projectTasks.length ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;

  // Active discussion
  const activeDiscussion = selectedDiscussionId
    ? projectDiscussions.find((d: any) => d.id === selectedDiscussionId)
    : projectDiscussions[0] || null;
  const activeDiscussionReplies = activeDiscussion
    ? discussionReplies.filter((r: any) => r.discussionId === activeDiscussion.id)
    : [];

  // AI gap analysis
  const memberProfiles = [ownerProfile, ...teamMembers.map((tm: any) => tm.profile)].filter(Boolean);
  const candidateProfiles = allProfiles.filter(
    (p: any) => p.userId !== user.id && !teamMembers.some((m: any) => m.member.userId === p.userId)
  );
  const skillGapAnalysis = analyzeSkillGap(project, memberProfiles, candidateProfiles);

  // Handlers — all async, call Supabase, then refresh
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await saveTask(user.id, project.id, {
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      priority: taskPriority,
      status: taskStatus,
      assignedTo: taskAssignee || undefined,
      deadline: taskDeadline || undefined,
    });
    await refresh();
    setTaskModalOpen(false);
    setTaskTitle(""); setTaskDesc("");
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const existing = projectTasks.find((t: any) => t.id === taskId);
    if (!existing) return;
    await saveTask(user.id, project.id, { ...existing, status: newStatus }, existing.id);
    await refresh();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentModalTaskId || !newCommentBody.trim()) return;
    await commentOnTask(user.id, commentModalTaskId, newCommentBody.trim());
    const updated = await fetchTaskComments(commentModalTaskId);
    setTaskComments((prev) => [...prev.filter((c: any) => c.taskId !== commentModalTaskId), ...updated]);
    setNewCommentBody("");
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;
    await addMilestone(user.id, project.id, msTitle.trim(), msDueDate || undefined, msDesc.trim());
    await refresh();
    setMilestoneModalOpen(false);
    setMsTitle(""); setMsDesc("");
  };

  const handleToggleMilestone = async (msId: string, completed: boolean) => {
    await toggleMilestone(msId, !completed);
    await refresh();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    const tags = noteTags.split(",").map((t: string) => t.trim()).filter(Boolean);
    await addNote(user.id, project.id, { title: noteTitle.trim(), content: noteContent.trim(), category: noteCategory, tags });
    await refresh();
    setNoteModalOpen(false);
    setNoteTitle(""); setNoteContent("");
  };

  const handleAddRef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refTitle.trim()) return;
    await addReference(user.id, project.id, {
      title: refTitle.trim(), authors: refAuthors.trim(), year: Number(refYear),
      venue: refVenue.trim(), link: refLink.trim() || undefined, notes: refNotes.trim() || undefined, tags: ["paper"],
    });
    await refresh();
    setRefModalOpen(false);
    setRefTitle(""); setRefAuthors(""); setRefNotes("");
  };

  const handleAddExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName.trim()) return;
    await addExperiment(user.id, project.id, {
      name: expName.trim(), objective: expObj.trim(), method: expMethod.trim(),
      results: expResults.trim(), conclusion: expConclusion.trim(),
      date: new Date().toISOString().slice(0, 10),
    });
    await refresh();
    setExpModalOpen(false);
    setExpName(""); setExpObj("");
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingAgenda.trim()) return;
    await addMeeting(user.id, project.id, {
      date: meetingDate,
      attendees: [user.id, ...teamMembers.map((t: any) => t.member.userId)],
      agenda: meetingAgenda.trim(), decisions: meetingDecisions.trim(), actionItems: meetingActions.trim(),
    });
    await refresh();
    setMeetingModalOpen(false);
    setMeetingAgenda(""); setMeetingDecisions("");
  };

  const handleAddDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetName.trim()) return;
    await addDataset(user.id, project.id, {
      name: datasetName.trim(), description: datasetDesc.trim(),
      source: datasetSource.trim() || undefined, license: datasetLicense,
    });
    await refresh();
    setDatasetModalOpen(false);
    setDatasetName(""); setDatasetDesc("");
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) { alert("Please select a file to upload."); return; }
    setDocUploading(true);
    try {
      await uploadDocument(user.id, project.id, {
        name: docFile.name, type: docFile.type, size: docFile.size,
        blob: docFile, access: docAccess,
      });
      await refresh();
      setDocModalOpen(false);
      setDocFile(null);
    } catch (err: any) {
      alert(err?.message || "Upload failed");
    } finally {
      setDocUploading(false);
    }
  };

  const handleAddDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discTitle.trim() || !discBody.trim()) return;
    await addDiscussion(user.id, project.id, discTitle.trim(), discBody.trim());
    await refresh();
    const updated = await fetchDiscussions(project.id);
    setProjectDiscussions(updated);
    if (updated[0]) setSelectedDiscussionId(updated[0].id);
    setDiscModalOpen(false);
    setDiscTitle(""); setDiscBody("");
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDiscussion || !replyBody.trim()) return;
    await addReply(user.id, activeDiscussion.id, replyBody.trim());
    const updated = await fetchReplies(activeDiscussion.id);
    setDiscussionReplies(updated);
    setReplyBody("");
  };

  const handleSetGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    const parts = repoInput.trim().split("/");
    const repoOwner = parts[0] || "unknown";
    const repoName = parts[1] || repoInput.trim();
    await saveGithubRepo(project.id, user.id, repoInput.trim(), repoName, repoOwner);
    await refresh();
    setGithubModalOpen(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    await updateProject(user.id, project.id, {
      title: settingsTitle.trim(),
      shortDescription: settingsDesc.trim(),
      visibility: settingsVis as any,
    });
    await refresh();
    alert("Project workspace settings updated.");
  };

  const handleAssignRole = async (memberUserId: string, roleId: string) => {
    await assignRole(project.id, memberUserId, roleId);
    await refresh();
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Remove ${memberName} from project?`)) {
      await removeMember(user.id, project.id, memberId);
      await refresh();
    }
  };

  // AI Assistant Chat handler
  const handleSendAiPrompt = (promptText: string) => {
    const qText = promptText.trim();
    if (!qText) return;

    setAiChatMessages((prev) => [
      ...prev,
      { sender: "user", text: qText, time: "Just now" },
    ]);
    setAiInput("");
    setAiThinking(true);

    setTimeout(() => {
      let response = "";
      const q = qText.toLowerCase();

      if (q.includes("status") || q.includes("progress")) {
        response = `📊 Project "${project.title}" Status Summary:\n• Overall Milestone Progress: ${taskProgress}%\n• Tasks: ${completedTasks.length}/${projectTasks.length} tasks completed\n• Team size: ${teamMembers.length + 1}/${project.teamMax} collaborators\n• Research Notes: ${projectNotes.length} notes recorded\n• Next target: ${projectMilestones[0]?.title || "Baseline execution"}`;
      } else if (q.includes("gap") || q.includes("bottleneck") || q.includes("skill")) {
        response = `⚠️ Team Skill-Gap Analysis:\n• Required Skills: ${project.requiredSkills.join(", ")}\n• Identified Gap: ${skillGapAnalysis.gaps.length > 0 ? skillGapAnalysis.gaps.map((g) => g.skill).join(", ") : "All core skills covered!"}\n• Recommendations available in the AI Team Formation tab.`;
      } else if (q.includes("next step") || q.includes("recommend") || q.includes("what to do")) {
        response = `🎯 Recommended Next Research Actions:\n1. Advance task "${projectTasks.find((t) => t.status === "in_progress")?.title || "Active experimentation"}"\n2. Consolidate literature review notes in the Research Workspace\n3. Schedule lab review with faculty mentor to align on paper submission venue.`;
      } else {
        response = `Synthesizing project context... Based on ${projectTasks.length} tasks and ${projectNotes.length} research records, the project is advancing steadily. Would you like me to draft a milestone update or analyze open tasks for bottlenecks?`;
      }

      setAiChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: response, time: "Just now" },
      ]);
      setAiThinking(false);
    }, 800);
  };

  // Nav Items configuration per PRD Section 28.2
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "team", label: "Team & Roles", icon: Users, badge: teamMembers.length + 1 },
    { id: "ai-team", label: "AI Team Formation", icon: Sparkles },
    { id: "tasks", label: "Tasks (Kanban)", icon: CheckSquare, badge: projectTasks.length },
    { id: "milestones", label: "Milestones", icon: Milestone, badge: projectMilestones.length },
    { id: "research", label: "Research Workspace", icon: BookOpen, badge: projectNotes.length + projectReferences.length },
    { id: "documents", label: "Documents", icon: FolderArchive, badge: projectDocs.length },
    { id: "discussions", label: "Discussions", icon: MessageSquare, badge: projectDiscussions.length },
    { id: "github", label: "GitHub Integration", icon: GitBranch },
    { id: "ai-assistant", label: "AI Assistant", icon: Bot },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Banner with Project Context */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-ink-100 bg-white p-4 sm:p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to={`/projects/${project.id}`} className="text-xs font-semibold text-navy hover:underline">
              ← Public Project Page
            </Link>
            <span className="text-xs text-ink-300">•</span>
            <Badge tone="green">PRIVATE COLLABORATION ROOM</Badge>
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink">{project.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-ink-600">Milestone Progress</div>
            <div className="text-xs text-navy font-bold">{taskProgress}% Completed</div>
          </div>
          <div className="w-24">
            <Progress value={taskProgress} />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout with Left Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-1">
          <nav className="rounded-xl border border-ink-100 bg-white p-2 shadow-sm space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as RoomTab)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "bg-navy text-white font-semibold shadow-sm"
                      : "text-ink-600 hover:bg-paper-100 hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-ink-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive ? "bg-navy-700 text-white" : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick AI status snippet */}
          <div className="rounded-xl border border-brass-200 bg-brass-50/50 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-brass-900">
              <Sparkles className="h-3.5 w-3.5 text-brass-700" />
              <span>AI Copilot Active</span>
            </div>
            <p className="text-[11px] text-brass-800 leading-tight">
              Ready to summarize discussions, analyze task bottlenecks, or suggest citations.
            </p>
          </div>
        </div>

        {/* Right Main Content Pane */}
        <div className="lg:col-span-3 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-400">Total Tasks</span>
                  <p className="font-serif text-2xl font-bold text-ink mt-1">{projectTasks.length}</p>
                  <span className="text-[11px] text-emerald-700 font-medium">{completedTasks.length} completed</span>
                </Card>
                <Card className="p-4 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-400">Team Size</span>
                  <p className="font-serif text-2xl font-bold text-ink mt-1">{teamMembers.length + 1}</p>
                  <span className="text-[11px] text-ink-500">Max {project.teamMax} members</span>
                </Card>
                <Card className="p-4 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-400">Research Notes</span>
                  <p className="font-serif text-2xl font-bold text-ink mt-1">{projectNotes.length}</p>
                  <span className="text-[11px] text-navy font-medium">{projectReferences.length} citations</span>
                </Card>
                <Card className="p-4 text-center">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-400">Next Milestone</span>
                  <p className="font-serif text-base font-bold text-ink mt-1 truncate">
                    {projectMilestones[0]?.title || "Draft Baseline"}
                  </p>
                  <span className="text-[11px] text-brass-700 font-medium">In Progress</span>
                </Card>
              </div>

              {/* Progress & Milestones summary */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink">Project Roadmap & Milestones</h3>
                    <p className="text-xs text-ink-500">Timeline of planned academic achievements</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("milestones")}>
                    Manage All Milestones →
                  </Button>
                </div>

                <div className="space-y-2">
                  {projectMilestones.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-ink-100 bg-paper-50 p-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${m.completed ? "bg-emerald-600" : "bg-brass"}`} />
                        <span className={`font-semibold ${m.completed ? "line-through text-ink-400" : "text-ink"}`}>
                          {m.title}
                        </span>
                      </div>
                      <span className="text-ink-400">{m.dueDate || "Planned"}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent Activity Timeline */}
              <Card className="p-6 space-y-4">
                <h3 className="font-serif text-lg font-bold text-ink">Recent Room Activity</h3>
                {projectActivity.length === 0 ? (
                  <p className="text-xs text-ink-400 italic">No recent activity logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {projectActivity.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 text-xs border-b border-ink-50 pb-2.5 last:border-0">
                        <span className="h-2 w-2 rounded-full bg-navy mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-ink-700">{act.message}</p>
                          <span className="text-[10px] text-ink-400">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 2: TEAM & ROLES */}
          {activeTab === "team" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink">Team Collaborators & Roles</h2>
                  <p className="text-xs text-ink-500">Manage member permissions, assignments, and invitations</p>
                </div>
                {isOwner && (
                  <Button size="sm" onClick={() => setInviteModalOpen(true)}>
                    <UserPlus className="h-4 w-4" /> Invite Member
                  </Button>
                )}
              </div>

              {/* Members List */}
              <div className="space-y-3">
                {/* Project Owner */}
                <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-brass-200 bg-brass-50/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white font-serif font-bold text-sm">
                      {ownerProfile?.fullName?.charAt(0) || "O"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/profile/${ownerProfile?.userId}`} className="font-bold text-sm text-ink hover:underline">
                          {ownerProfile?.fullName}
                        </Link>
                        <Badge tone="brass">Project Owner</Badge>
                      </div>
                      <p className="text-xs text-ink-500">{ownerProfile?.institution} • Lead Investigator</p>
                    </div>
                  </div>
                </Card>

                {/* Other Members */}
                {teamMembers.map(({ member, profile: p, roleName }) => (
                  <Card key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700 font-serif font-bold text-sm">
                        {p?.fullName?.charAt(0) || "M"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link to={`/profile/${p?.userId}`} className="font-bold text-sm text-ink hover:underline">
                            {p?.fullName}
                          </Link>
                          <Badge tone={member.systemRole === "mentor" ? "green" : "navy"}>
                            {member.systemRole.toUpperCase()}
                          </Badge>
                          {roleName && (
                            <span className="text-xs text-ink-500 bg-paper px-2 py-0.5 rounded">
                              {roleName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-400">{p?.department} • Joined {new Date(member.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Member actions (Owner only) */}
                    {isOwner && member.userId !== user.id && (
                      <div className="flex items-center gap-2">
                        <Select
                          className="h-8 text-xs w-36"
                          value={member.roleId || ""}
                          onChange={(e) => handleAssignRole(member.userId, e.target.value)}
                        >
                          <option value="">Assign Role...</option>
                          {project.roles.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMember(member.id, p?.fullName || "member")}
                          className="text-red-700 text-xs hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: AI TEAM FORMATION & GAP ANALYSIS */}
          {activeTab === "ai-team" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-bold text-ink">AI Team Balance & Formation</h2>
                  <Badge tone="navy">
                    <Sparkles className="h-3 w-3 mr-1" /> Automated Gap Analysis
                  </Badge>
                </div>
                <p className="text-xs text-ink-500">
                  Continuous evaluation of team competencies vs. project objectives according to PRD Section 26 & 27
                </p>
              </div>

              {/* Current Skill Gap Evaluation */}
              <Card className="p-6 space-y-4">
                <h3 className="font-serif text-lg font-bold text-ink">Project Competency Coverage</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Covered Skills */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      Covered by Current Team ({skillGapAnalysis.teamSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {skillGapAnalysis.teamSkills.map((s: string) => (
                        <Badge key={s} tone="green">{s}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Missing Gaps */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-700" />
                      Uncovered Skill Gaps ({skillGapAnalysis.gaps.length})
                    </h4>
                    {skillGapAnalysis.gaps.length === 0 ? (
                      <p className="text-xs text-emerald-800">All specified project requirements covered!</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skillGapAnalysis.gaps.map((g) => (
                          <Badge key={g.skill} tone="amber">{g.skill}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* AI Recommended Candidates from Campus Directory */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink">
                      Recommended Teammates to Balance Current Squad
                    </h3>
                    <p className="text-xs text-ink-500">
                      Top candidates from the university network possessing the exact complementary skills needed
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {skillGapAnalysis.gaps.flatMap((g: any) => g.recommendedCandidates).slice(0, 5).map((rec: any) => (
                    <div
                      key={rec.userId}
                      className="rounded-xl border border-ink-100 bg-paper-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link to={`/profile/${rec.userId}`} className="font-serif font-bold text-base text-ink hover:underline">
                            {rec.name}
                          </Link>
                          <Badge tone="navy">{rec.matchScore}% Match</Badge>
                        </div>
                        <p className="text-xs text-ink-600">{rec.reason}</p>
                      </div>

                      {isOwner && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setInviteUserId(rec.userId);
                            setInviteMsg(`Hi ${rec.name}, our AI team formation analyzer identified your profile as a great fit for our research initiative.`);
                            setInviteModalOpen(true);
                          }}
                          className="shrink-0 text-xs"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Invite Candidate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: TASKS (KANBAN BOARD) */}
          {activeTab === "tasks" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink">Task Kanban Board</h2>
                  <p className="text-xs text-ink-500">Coordinate and track research sprints and deliverables</p>
                </div>
                <Button size="sm" onClick={() => setTaskModalOpen(true)}>
                  <Plus className="h-4 w-4" /> New Task
                </Button>
              </div>

              {/* 4 Kanban Columns per PRD Section 31.2 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(
                  [
                    { id: "todo", title: "To Do" },
                    { id: "in_progress", title: "In Progress" },
                    { id: "review", title: "Review" },
                    { id: "completed", title: "Completed" },
                  ] as const
                ).map((col) => {
                  const tasksInCol = projectTasks.filter((t) => t.status === col.id);
                  return (
                    <div key={col.id} className="rounded-xl border border-ink-100 bg-paper-50 p-3 space-y-3">
                      <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                        <span className="font-serif font-bold text-xs uppercase tracking-wider text-ink">
                          {col.title}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink-600 shadow-xs">
                          {tasksInCol.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 min-h-[220px]">
                        {tasksInCol.map((task) => {
                          const assigneeProfile = allProfiles.find((p: any) => p.userId === task.assignedTo);
                          const taskCommentsForTask = taskComments.filter((tc: any) => tc.taskId === task.id);
                          return (
                            <div
                              key={task.id}
                              className="rounded-lg border border-ink-200 bg-white p-3 shadow-xs space-y-2 hover:border-navy transition"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                    task.priority === "critical"
                                      ? "bg-red-100 text-red-800"
                                      : task.priority === "high"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-paper text-ink-600"
                                  }`}
                                >
                                  {task.priority}
                                </span>

                                <select
                                  value={task.status}
                                  onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                                  className="text-[10px] border border-ink-100 rounded px-1 py-0.5 bg-paper-50"
                                >
                                  <option value="todo">To Do</option>
                                  <option value="in_progress">In Prog</option>
                                  <option value="review">Review</option>
                                  <option value="completed">Done</option>
                                </select>
                              </div>

                              <h4 className="text-xs font-semibold text-ink leading-snug">{task.title}</h4>

                              {task.description && (
                                <p className="text-[11px] text-ink-500 line-clamp-2">{task.description}</p>
                              )}

                              <div className="flex items-center justify-between pt-1 border-t border-ink-50 text-[10px] text-ink-400">
                                <span>{assigneeProfile?.fullName || "Unassigned"}</span>
                                <button
                                  type="button"
                                  onClick={() => setCommentModalTaskId(task.id)}
                                  className="text-navy hover:underline"
                                >
                                  💬 {taskCommentsForTask.length}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: MILESTONES */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink">Project Milestones</h2>
                  <p className="text-xs text-ink-500">Key targets and publication delivery phases</p>
                </div>
                <Button size="sm" onClick={() => setMilestoneModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Milestone
                </Button>
              </div>

              <div className="space-y-3">
                {projectMilestones.map((ms) => (
                  <Card key={ms.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleMilestone(ms.id, ms.completed)}
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border transition ${
                          ms.completed
                            ? "bg-navy text-white border-navy"
                            : "border-ink-300 hover:border-navy"
                        }`}
                      >
                        {ms.completed && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <div className="space-y-0.5">
                        <h4 className={`text-sm font-semibold ${ms.completed ? "line-through text-ink-400" : "text-ink"}`}>
                          {ms.title}
                        </h4>
                        {ms.description && <p className="text-xs text-ink-500">{ms.description}</p>}
                      </div>
                    </div>
                    {ms.dueDate && (
                      <span className="text-xs text-ink-400 shrink-0 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Due {ms.dueDate}
                      </span>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: RESEARCH WORKSPACE (Section 32) */}
          {activeTab === "research" && (
            <div className="space-y-6">
              {/* Research sub-tabs navigation */}
              <div className="flex flex-wrap gap-2 border-b border-ink-100 pb-3">
                {[
                  { id: "notes", label: `Notes (${projectNotes.length})` },
                  { id: "references", label: `References (${projectReferences.length})` },
                  { id: "experiments", label: `Experiments (${projectExperiments.length})` },
                  { id: "meetings", label: `Meeting Logs (${projectMeetings.length})` },
                  { id: "datasets", label: `Datasets (${projectDatasets.length})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setResearchSubTab(st.id as any)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      researchSubTab === st.id
                        ? "bg-navy text-white shadow-xs"
                        : "text-ink-600 hover:bg-paper-100"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Subtab 1: Notes */}
              {researchSubTab === "notes" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-lg font-bold text-ink">Literature & Research Notes</h3>
                    <Button size="sm" onClick={() => setNoteModalOpen(true)}>
                      <Plus className="h-4 w-4" /> Add Note
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectNotes.map((n) => (
                      <Card key={n.id} className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif font-bold text-ink text-sm">{n.title}</h4>
                          <Badge tone="brass">{n.category}</Badge>
                        </div>
                        <p className="text-xs text-ink-600 leading-relaxed whitespace-pre-line">{n.content}</p>
                        <div className="pt-2 flex flex-wrap gap-1">
                          {n.tags.map((t: string) => (
                            <span key={t} className="text-[10px] bg-paper px-1.5 py-0.5 rounded text-ink-500">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtab 2: References / Citations */}
              {researchSubTab === "references" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-lg font-bold text-ink">Academic Reference Manager</h3>
                    <Button size="sm" onClick={() => setRefModalOpen(true)}>
                      <Plus className="h-4 w-4" /> Add Citation
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {projectReferences.map((r) => (
                      <Card key={r.id} className="p-4 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif font-bold text-ink text-sm">{r.title}</h4>
                          <span className="text-xs text-ink-400">{r.year}</span>
                        </div>
                        <p className="text-xs text-ink-500 italic">{r.authors} • {r.venue}</p>
                        {r.notes && <p className="text-xs text-ink-600 pt-1">Notes: {r.notes}</p>}
                        {r.link && (
                          <a href={r.link} target="_blank" rel="noreferrer" className="text-xs text-navy hover:underline block pt-1">
                            DOI / External Paper Link →
                          </a>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtab 3: Experiments */}
              {researchSubTab === "experiments" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-lg font-bold text-ink">Lab Experiment Logs</h3>
                    <Button size="sm" onClick={() => setExpModalOpen(true)}>
                      <Plus className="h-4 w-4" /> Record Experiment
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {projectExperiments.map((e) => (
                      <Card key={e.id} className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif font-bold text-ink text-sm">{e.name}</h4>
                          <span className="text-xs text-ink-400">{e.date}</span>
                        </div>
                        <div className="text-xs space-y-1 text-ink-600">
                          <p><strong>Objective:</strong> {e.objective}</p>
                          <p><strong>Method:</strong> {e.method}</p>
                          <p><strong>Results:</strong> {e.results}</p>
                          <p className="text-emerald-800 font-medium"><strong>Conclusion:</strong> {e.conclusion}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtab 4: Meetings */}
              {researchSubTab === "meetings" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-lg font-bold text-ink">Meeting Logs & Decisions</h3>
                    <Button size="sm" onClick={() => setMeetingModalOpen(true)}>
                      <Plus className="h-4 w-4" /> Log Meeting
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {projectMeetings.map((m) => (
                      <Card key={m.id} className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif font-bold text-ink text-sm">Meeting on {m.date}</h4>
                          <span className="text-xs text-ink-400">{m.attendees?.length} attendees</span>
                        </div>
                        <div className="text-xs space-y-1 text-ink-600">
                          <p><strong>Agenda:</strong> {m.agenda}</p>
                          <p><strong>Decisions:</strong> {m.decisions}</p>
                          <p className="text-navy font-medium"><strong>Action Items:</strong> {m.actionItems}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtab 5: Datasets */}
              {researchSubTab === "datasets" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-lg font-bold text-ink">Project Datasets</h3>
                    <Button size="sm" onClick={() => setDatasetModalOpen(true)}>
                      <Plus className="h-4 w-4" /> Register Dataset
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {projectDatasets.map((d) => (
                      <Card key={d.id} className="p-4 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif font-bold text-ink text-sm">{d.name}</h4>
                          <Badge tone="slate">{d.license || "Open"}</Badge>
                        </div>
                        <p className="text-xs text-ink-600">{d.description}</p>
                        {d.source && <p className="text-xs text-ink-400">Source: {d.source}</p>}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: DOCUMENTS (Section 33) */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink">Document Repository</h2>
                  <p className="text-xs text-ink-500">Upload and share research papers, reports, and data files</p>
                </div>
                <Button size="sm" onClick={() => setDocModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Upload Document
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-ink-100 text-xs">
                  <thead className="bg-paper-50 text-ink-600 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Document Name</th>
                      <th className="px-4 py-3 text-left">Format</th>
                      <th className="px-4 py-3 text-left">Size</th>
                      <th className="px-4 py-3 text-left">Access Control</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50 text-ink-700">
                    {projectDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-paper-50/50">
                        <td className="px-4 py-3 font-semibold text-ink flex items-center gap-2">
                          <FileText className="h-4 w-4 text-navy" />
                          {doc.name}
                        </td>
                        <td className="px-4 py-3">{doc.type}</td>
                        <td className="px-4 py-3">{(doc.size / 1024).toFixed(1)} KB</td>
                        <td className="px-4 py-3">
                          <Badge tone={doc.access === "members" ? "navy" : "brass"}>
                            {doc.access}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={async () => {
                              const url = await getDocumentUrl(doc.dataUrl);
                              if (url) window.open(url, "_blank");
                              else alert("Unable to load document URL.");
                            }}
                            className="text-navy font-semibold hover:underline"
                          >
                            Preview / Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: DISCUSSIONS (Section 34) */}
          {activeTab === "discussions" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink">Threaded Discussions</h2>
                  <p className="text-xs text-ink-500">Collaborative dialogue, questions, and decisions</p>
                </div>
                <Button size="sm" onClick={() => setDiscModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Start Discussion
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Threads list */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-400 block mb-1">
                    Discussion Topics ({projectDiscussions.length})
                  </span>
                  {projectDiscussions.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDiscussionId(d.id)}
                      className={`rounded-xl border p-3 cursor-pointer transition ${
                        activeDiscussion?.id === d.id
                          ? "border-navy bg-navy-50/50 font-bold"
                          : "border-ink-100 bg-white hover:bg-paper-50"
                      }`}
                    >
                      <h4 className="text-xs font-semibold text-ink truncate">{d.title}</h4>
                      <p className="text-[11px] text-ink-400 mt-1">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Active Thread & Replies */}
                <div className="md:col-span-2 space-y-4">
                  {activeDiscussion ? (
                    <Card className="p-5 space-y-4">
                      <div className="border-b border-ink-100 pb-3">
                        <h3 className="font-serif text-lg font-bold text-ink">{activeDiscussion.title}</h3>
                        <p className="text-xs text-ink-600 mt-1 leading-relaxed">{activeDiscussion.body}</p>
                      </div>

                      {/* Replies */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                          Replies ({activeDiscussionReplies.length})
                        </h4>
                        {activeDiscussionReplies.map((r: any) => {
                          const replier = allProfiles.find((p: any) => p.userId === r.userId);
                          return (
                            <div key={r.id} className="rounded-lg bg-paper-50 p-3 text-xs space-y-1">
                              <div className="flex justify-between text-ink-500">
                                <strong className="text-ink">{replier?.fullName || "Member"}</strong>
                                <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-ink-700">{r.body}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Post Reply */}
                      <form onSubmit={handleAddReply} className="pt-2 flex gap-2">
                        <Input
                          placeholder="Type your reply or @mention collaborators..."
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                        />
                        <Button type="submit">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </Card>
                  ) : (
                    <EmptyState
                      title="No Discussions Yet"
                      body="Start a discussion thread to propose technical architectures or coordinate research tasks."
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: GITHUB INTEGRATION (Section 36) */}
          {activeTab === "github" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink">GitHub Repository Sync</h2>
                  <p className="text-xs text-ink-500">Integrated audit trails, commit feeds, and open pull requests</p>
                </div>
                {isOwner && (
                  <Button size="sm" variant="outline" onClick={() => setGithubModalOpen(true)}>
                    <GitBranch className="h-4 w-4" /> Configure Repo
                  </Button>
                )}
              </div>

              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                  <div className="flex items-center gap-3">
                    <GitBranch className="h-6 w-6 text-navy" />
                    <div>
                      <h3 className="font-serif text-base font-bold text-ink">
                        {project.githubRepo || "synaptra/plant-disease-detection"}
                      </h3>
                      <p className="text-xs text-ink-400">Branch: main • Sync Status: Active</p>
                    </div>
                  </div>
                  <Badge tone="green">Linked & Audited</Badge>
                </div>

                {/* Simulated Commits Feed per PRD Section 36.2 */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Recent Commits
                  </h4>
                  {[
                    { hash: "7f3e1a", msg: "feat: Add ResNet-18 baseline training loop", author: "Rahul Mehta", time: "2 hours ago" },
                    { hash: "3a9c2b", msg: "dataset: Add normalization transform for leaf images", author: "Arjun Nair", time: "Yesterday" },
                    { hash: "1d4b8e", msg: "docs: Draft project methodology and citation notes", author: "Divya Iyer", time: "3 days ago" },
                  ].map((c) => (
                    <div key={c.hash} className="flex items-center justify-between rounded-lg border border-ink-100 bg-paper-50 p-3 text-xs">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-navy mr-2">[{c.hash}]</span>
                        <span className="font-medium text-ink">{c.msg}</span>
                        <span className="text-ink-400 block text-[11px] mt-0.5">by {c.author}</span>
                      </div>
                      <span className="text-[11px] text-ink-400 shrink-0">{c.time}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 10: AI PROJECT ASSISTANT (Section 35) */}
          {activeTab === "ai-assistant" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-bold text-ink">AI Project Assistant</h2>
                  <Badge tone="navy">
                    <Bot className="h-3 w-3 mr-1" /> Workspace Context
                  </Badge>
                </div>
                <p className="text-xs text-ink-500">
                  Ask questions regarding current tasks, research notes, meeting decisions, and next steps
                </p>
              </div>

              {/* Pre-built quick action triggers */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSendAiPrompt("Summarize the current project status and milestone progress")}
                  className="rounded-lg border border-navy-200 bg-navy-50/70 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100"
                >
                  📊 Project Status Summary
                </button>
                <button
                  type="button"
                  onClick={() => handleSendAiPrompt("Identify team skill gaps and bottlenecks in our open tasks")}
                  className="rounded-lg border border-brass-200 bg-brass-50/70 px-3 py-1.5 text-xs font-semibold text-brass-800 hover:bg-brass-100"
                >
                  ⚠️ Analyze Team Skill Gaps
                </button>
                <button
                  type="button"
                  onClick={() => handleSendAiPrompt("Suggest next research steps for this week")}
                  className="rounded-lg border border-ink-200 bg-paper-50 px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-paper-100"
                >
                  🎯 Recommend Next Steps
                </button>
              </div>

              {/* Interactive Chat Pane */}
              <Card className="p-4 sm:p-6 space-y-4">
                <div className="max-h-96 min-h-[260px] overflow-y-auto space-y-3 pr-2">
                  {aiChatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`rounded-xl p-3.5 max-w-[85%] text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-navy text-white font-medium"
                            : "bg-paper-100 text-ink-800 border border-ink-100 whitespace-pre-line"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {aiThinking && (
                    <div className="flex justify-start">
                      <div className="rounded-xl bg-paper-100 p-3 text-xs text-ink-500 italic animate-pulse">
                        AI is reviewing project tasks and research notes...
                      </div>
                    </div>
                  )}
                </div>

                {/* Prompt input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiPrompt(aiInput);
                  }}
                  className="flex gap-2 pt-2 border-t border-ink-100"
                >
                  <Input
                    placeholder="Ask about project tasks, literature notes, or next milestones..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                  />
                  <Button type="submit" disabled={aiThinking}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* TAB 11: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-ink">Project Settings</h2>
                <p className="text-xs text-ink-500">Configure room privacy and administrative options</p>
              </div>

              <Card className="p-6 space-y-4">
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <Field label="Project Title">
                    <Input
                      disabled={!isOwner}
                      value={settingsTitle}
                      onChange={(e) => setSettingsTitle(e.target.value)}
                    />
                  </Field>

                  <Field label="Short Description">
                    <Textarea
                      disabled={!isOwner}
                      value={settingsDesc}
                      onChange={(e) => setSettingsDesc(e.target.value)}
                    />
                  </Field>

                  <Field label="Privacy / Visibility Mode">
                    <Select
                      disabled={!isOwner}
                      value={settingsVis}
                      onChange={(e) => setSettingsVis(e.target.value as any)}
                    >
                      <option value="public">Public (Open for campus applications)</option>
                      <option value="restricted">Restricted (Teaser visible, approval needed)</option>
                      <option value="private">Private (Invite only)</option>
                    </Select>
                  </Field>

                  {isOwner ? (
                    <Button type="submit">Save Settings</Button>
                  ) : (
                    <p className="text-xs text-ink-400 italic">
                      Only the project owner can modify settings.
                    </p>
                  )}
                </form>

                {/* Member Leave project action */}
                {!isOwner && (
                  <div className="pt-4 border-t border-ink-100">
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm("Are you sure you want to leave this project team?")) {
                          leaveProject(user.id, project.id);
                          refresh();
                          navigate("/dashboard");
                        }
                      }}
                    >
                      Leave Project Team
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Task Creation Modal */}
      <Modal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Create New Sprint Task"
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <Field label="Task Title">
            <Input
              required
              placeholder="e.g. Implement ResNet-18 baseline"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </Field>

          <Field label="Detailed Task Description">
            <Textarea
              placeholder="Scope, dataset inputs, and expected accuracy metric..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <Select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </Field>

            <Field label="Initial Column">
              <Select
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Assign To Member">
              <Select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                <option value={project.ownerId}>{ownerProfile?.fullName} (Owner)</option>
                {teamMembers.map((tm) => (
                  <option key={tm.member.userId} value={tm.member.userId}>
                    {tm.profile?.fullName || "Member"}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Due Date">
              <Input
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>

      {/* Task Comments Modal */}
      <Modal
        open={!!commentModalTaskId}
        onClose={() => setCommentModalTaskId(null)}
        title="Task Discussion Thread"
      >
        <div className="space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {taskComments
              .filter((tc: any) => tc.taskId === commentModalTaskId)
              .map((tc: any) => {
                const author = allProfiles.find((p: any) => p.userId === tc.userId);
                return (
                  <div key={tc.id} className="rounded-lg bg-paper-50 p-2.5 text-xs space-y-0.5">
                    <div className="flex justify-between text-ink-500">
                      <strong>{author?.fullName || "Collaborator"}</strong>
                      <span className="text-[10px]">{new Date(tc.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-ink-700">{tc.body}</p>
                  </div>
                );
              })}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <Input
              placeholder="Write a comment or progress update..."
              value={newCommentBody}
              onChange={(e) => setNewCommentBody(e.target.value)}
            />
            <Button type="submit">Post</Button>
          </form>
        </div>
      </Modal>

      {/* Milestone Modal */}
      <Modal
        open={milestoneModalOpen}
        onClose={() => setMilestoneModalOpen(false)}
        title="Create Project Milestone"
      >
        <form onSubmit={handleAddMilestone} className="space-y-4">
          <Field label="Milestone Title">
            <Input
              required
              placeholder="e.g. Dataset Freeze & Validation Split"
              value={msTitle}
              onChange={(e) => setMsTitle(e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Input
              placeholder="Scope of this milestone..."
              value={msDesc}
              onChange={(e) => setMsDesc(e.target.value)}
            />
          </Field>
          <Field label="Target Due Date">
            <Input
              type="date"
              value={msDueDate}
              onChange={(e) => setMsDueDate(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setMilestoneModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Milestone</Button>
          </div>
        </form>
      </Modal>

      {/* Research Note Modal */}
      <Modal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Add Literature / Research Note"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <Field label="Note Title">
            <Input
              required
              placeholder="e.g. Analysis of PlantVillage Dataset Class Imbalance"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <Select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value as NoteCategory)}
            >
              <option value="literature">Literature Review</option>
              <option value="experiment">Experiment Observation</option>
              <option value="meeting">Meeting Note</option>
              <option value="idea">Hypothesis / Idea</option>
            </Select>
          </Field>
          <Field label="Content">
            <Textarea
              required
              placeholder="Detailed findings, quotes, mathematical formulation..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
          </Field>
          <Field label="Tags (Comma separated)">
            <Input
              value={noteTags}
              onChange={(e) => setNoteTags(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Note</Button>
          </div>
        </form>
      </Modal>

      {/* Reference Modal */}
      <Modal
        open={refModalOpen}
        onClose={() => setRefModalOpen(false)}
        title="Add Academic Citation"
      >
        <form onSubmit={handleAddRef} className="space-y-4">
          <Field label="Paper Title">
            <Input
              required
              placeholder="e.g. Deep Residual Learning for Image Recognition"
              value={refTitle}
              onChange={(e) => setRefTitle(e.target.value)}
            />
          </Field>
          <Field label="Authors">
            <Input
              placeholder="He, K., Zhang, X., Ren, S., & Sun, J."
              value={refAuthors}
              onChange={(e) => setRefAuthors(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Venue / Journal">
              <Input
                placeholder="CVPR"
                value={refVenue}
                onChange={(e) => setRefVenue(e.target.value)}
              />
            </Field>
            <Field label="Year">
              <Input
                type="number"
                value={refYear}
                onChange={(e) => setRefYear(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="DOI or URL">
            <Input
              placeholder="https://doi.org/10.1109/CVPR.2016.90"
              value={refLink}
              onChange={(e) => setRefLink(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setRefModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Reference</Button>
          </div>
        </form>
      </Modal>

      {/* Experiment Modal */}
      <Modal
        open={expModalOpen}
        onClose={() => setExpModalOpen(false)}
        title="Log Lab Experiment"
      >
        <form onSubmit={handleAddExp} className="space-y-4">
          <Field label="Experiment Name">
            <Input
              required
              placeholder="e.g. ResNet-18 vs MobileNetV2 Accuracy Benchmark"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
            />
          </Field>
          <Field label="Objective">
            <Input
              placeholder="What was tested..."
              value={expObj}
              onChange={(e) => setExpObj(e.target.value)}
            />
          </Field>
          <Field label="Methodology">
            <Input
              placeholder="Batch size, learning rate schedule, augmentations..."
              value={expMethod}
              onChange={(e) => setExpMethod(e.target.value)}
            />
          </Field>
          <Field label="Results">
            <Input
              placeholder="Validation accuracy, F1-score..."
              value={expResults}
              onChange={(e) => setExpResults(e.target.value)}
            />
          </Field>
          <Field label="Conclusion">
            <Input
              placeholder="Key takeaway for next iteration..."
              value={expConclusion}
              onChange={(e) => setExpConclusion(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setExpModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Experiment</Button>
          </div>
        </form>
      </Modal>

      {/* Meeting Modal */}
      <Modal
        open={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        title="Record Meeting Minutes"
      >
        <form onSubmit={handleAddMeeting} className="space-y-4">
          <Field label="Meeting Date">
            <Input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </Field>
          <Field label="Agenda">
            <Input
              required
              placeholder="Topics reviewed..."
              value={meetingAgenda}
              onChange={(e) => setMeetingAgenda(e.target.value)}
            />
          </Field>
          <Field label="Decisions Made">
            <Textarea
              placeholder="Core architectural and timeline decisions agreed..."
              value={meetingDecisions}
              onChange={(e) => setMeetingDecisions(e.target.value)}
            />
          </Field>
          <Field label="Action Items">
            <Input
              placeholder="Who is doing what by when..."
              value={meetingActions}
              onChange={(e) => setMeetingActions(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setMeetingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Minutes</Button>
          </div>
        </form>
      </Modal>

      {/* Dataset Modal */}
      <Modal
        open={datasetModalOpen}
        onClose={() => setDatasetModalOpen(false)}
        title="Register Project Dataset"
      >
        <form onSubmit={handleAddDataset} className="space-y-4">
          <Field label="Dataset Name">
            <Input
              required
              placeholder="e.g. PlantVillage Leaf Dataset"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Input
              placeholder="Class breakdown, sample counts..."
              value={datasetDesc}
              onChange={(e) => setDatasetDesc(e.target.value)}
            />
          </Field>
          <Field label="Source / DOI">
            <Input
              placeholder="Kaggle / Harvard Dataverse"
              value={datasetSource}
              onChange={(e) => setDatasetSource(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setDatasetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Dataset</Button>
          </div>
        </form>
      </Modal>

      {/* Document Modal */}
      <Modal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Upload Project Document"
      >
        <form onSubmit={handleAddDoc} className="space-y-4">
          <Field label="Select File to Upload">
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-ink-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-navy-50 file:text-navy file:font-medium hover:file:bg-navy-100"
            />
            {docFile && <p className="text-xs text-ink-500 mt-1">{docFile.name} ({(docFile.size/1024).toFixed(1)} KB)</p>}
          </Field>
          <Field label="Access Level">
            <Select
              value={docAccess}
              onChange={(e) => setDocAccess(e.target.value as DocumentAccess)}
            >
              <option value="members">All Project Members</option>
              <option value="owner_mentor">Owner & Mentor Only</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setDocModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={docUploading}>{docUploading ? "Uploading…" : "Upload Document"}</Button>
          </div>
        </form>
      </Modal>

      {/* Start Discussion Modal */}
      <Modal
        open={discModalOpen}
        onClose={() => setDiscModalOpen(false)}
        title="Start Threaded Discussion"
      >
        <form onSubmit={handleAddDiscussion} className="space-y-4">
          <Field label="Discussion Subject">
            <Input
              required
              placeholder="e.g. Model architecture decision: ResNet vs Vision Transformer"
              value={discTitle}
              onChange={(e) => setDiscTitle(e.target.value)}
            />
          </Field>
          <Field label="Opening Topic / Description">
            <Textarea
              required
              placeholder="Detail your question, trade-offs, and points for team consensus..."
              value={discBody}
              onChange={(e) => setDiscBody(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setDiscModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Post Discussion Topic</Button>
          </div>
        </form>
      </Modal>

      {/* Configure GitHub Modal */}
      <Modal
        open={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        title="Configure Project GitHub Repository"
      >
        <form onSubmit={handleSetGithub} className="space-y-4">
          <Field label="GitHub Repository (owner/repo)">
            <Input
              required
              placeholder="e.g. synaptra/plant-disease-vision"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setGithubModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Link Repository</Button>
          </div>
        </form>
      </Modal>

      {/* Invite Member to Project Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Collaborator to Project"
      >
        <div className="space-y-4">
          <Field label="Select Researcher">
            <Select
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
            >
              <option value="">Select Candidate...</option>
              {allProfiles
                .filter((p: any) => p.userId !== user.id && !teamMembers.some((m) => m.member.userId === p.userId))
                .map((p: any) => (
                  <option key={p.userId} value={p.userId}>
                    {p.fullName} ({p.institution})
                  </option>
                ))}
            </Select>
          </Field>

          <Field label="Invitation Message">
            <Textarea
              value={inviteMsg}
              onChange={(e) => setInviteMsg(e.target.value)}
              placeholder="Personalized message describing the project role..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!inviteUserId}
              onClick={() => {
                inviteUser(user.id, project.id, inviteUserId, undefined, inviteMsg);
                refresh();
                setInviteModalOpen(false);
                alert("Invitation dispatched to researcher!");
              }}
            >
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
