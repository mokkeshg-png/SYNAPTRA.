import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProjects,
  fetchJoinRequests,
  fetchInvitations,
  fetchMentorshipRequests,
  fetchDetailsRequests,
  fetchAllProfiles,
  reviewApplication,
  withdrawApplication,
  respondInvitation,
  reviewMentorship,
  resolveDetailsRequest,
} from "@/lib/supabase-db";
import { Button } from "@/components/ui/Button";
import { Card, Badge, EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import type {
  Project,
  JoinRequest,
  Invitation,
  MentorshipRequest,
  DetailsRequest,
  Profile,
} from "@/types";
import {
  Inbox,
  Send,
  UserPlus,
  GraduationCap,
  Lock,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  Loader2,
  Check,
  X,
} from "lucide-react";

type RequestTab = "incoming" | "outgoing" | "invitations" | "mentorship" | "details";

function uniqueId(p?: Profile) {
  if (!p) return "";
  const prefix = p.designation ? "FAC" : "STU";
  return `${prefix}-${p.userId.substring(0, 6).toUpperCase()}`;
}

export function Requests() {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<RequestTab>("incoming");
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [incomingJrs, setIncomingJrs] = useState<JoinRequest[]>([]);
  const [outgoingJrs, setOutgoingJrs] = useState<JoinRequest[]>([]);
  const [invitationsReceived, setInvitationsReceived] = useState<Invitation[]>([]);
  const [invitationsSent, setInvitationsSent] = useState<Invitation[]>([]);
  const [mentorshipReqs, setMentorshipReqs] = useState<MentorshipRequest[]>([]);
  const [detailsReqs, setDetailsReqs] = useState<DetailsRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [projs, profiles, myJrs, myInvs, myMrs, myDrs] = await Promise.all([
        fetchProjects(),
        fetchAllProfiles(),
        fetchJoinRequests(undefined, user.id),
        fetchInvitations(user.id),
        fetchMentorshipRequests(undefined, user.id),
        fetchDetailsRequests(undefined, user.id),
      ]);

      const ownedProjectIds = new Set(projs.filter((p) => p.ownerId === user.id).map((p) => p.id));

      // Fetch incoming requests for owned projects
      const allIncomingJrs: JoinRequest[] = [];
      const allIncomingMrs: MentorshipRequest[] = [];
      const allIncomingDrs: DetailsRequest[] = [];
      const allSentInvs: Invitation[] = [];

      await Promise.all(
        [...ownedProjectIds].map(async (pid) => {
          const [jrs, mrs, drs, invs] = await Promise.all([
            fetchJoinRequests(pid),
            fetchMentorshipRequests(pid),
            fetchDetailsRequests(pid),
            fetchInvitations(undefined, pid),
          ]);
          allIncomingJrs.push(...jrs.filter((jr) => jr.applicantId !== user.id));
          allIncomingMrs.push(...mrs);
          allIncomingDrs.push(...drs.filter((dr) => dr.userId !== user.id));
          allSentInvs.push(...invs.filter((inv) => inv.inviterId === user.id));
        })
      );

      setProjects(projs);
      setAllProfiles(profiles);
      setIncomingJrs(allIncomingJrs);
      setOutgoingJrs(myJrs);
      setInvitationsReceived(myInvs);
      setInvitationsSent(allSentInvs);
      setMentorshipReqs([...myMrs, ...allIncomingMrs.filter((m) => !myMrs.some((x) => x.id === m.id))]);
      setDetailsReqs([...myDrs, ...allIncomingDrs.filter((d) => !myDrs.some((x) => x.id === d.id))]);
    } catch (err) {
      console.error("Requests load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-ink-500">You must be signed in to manage project requests and invitations.</p>
        <Link to="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  // Counts for pending items
  const pendingIncomingCount = incomingJrs.filter((r) => r.status === "pending").length;
  const pendingOutgoingCount = outgoingJrs.filter((r) => r.status === "pending").length;
  const pendingInvsCount = invitationsReceived.filter((r) => r.status === "pending").length;
  const pendingMentorshipCount = mentorshipReqs.filter((r) => r.status === "pending" && (profile?.role === "faculty" ? r.facultyId === user.id : true)).length;
  const pendingDetailsCount = detailsReqs.filter((r) => r.status === "pending").length;

  const handleReviewApp = async (requestId: string, decision: "accepted" | "rejected", reason?: string) => {
    await reviewApplication(user.id, requestId, decision, reason);
    await loadData();
  };

  const handleWithdraw = async (requestId: string) => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      await withdrawApplication(user.id, requestId);
      await loadData();
    }
  };

  const handleRespondInv = async (invId: string, accept: boolean) => {
    await respondInvitation(user.id, invId, accept);
    await loadData();
  };

  const handleReviewMentorship = async (reqId: string, accept: boolean) => {
    await reviewMentorship(user.id, reqId, accept);
    await loadData();
  };

  const handleResolveDetails = async (reqId: string, grant: boolean) => {
    await resolveDetailsRequest(user.id, reqId, grant);
    await loadData();
  };

  const tabs: { id: RequestTab; label: string; icon: any; count: number }[] = [
    { id: "incoming", label: "Incoming Applications", icon: Inbox, count: pendingIncomingCount },
    { id: "outgoing", label: "Outgoing Applications", icon: Send, count: pendingOutgoingCount },
    { id: "invitations", label: "Team Invitations", icon: UserPlus, count: pendingInvsCount },
    { id: "mentorship", label: "Faculty Mentorship", icon: GraduationCap, count: pendingMentorshipCount },
    { id: "details", label: "Restricted Access", icon: Lock, count: pendingDetailsCount },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-navy-800">
              <Inbox className="h-3 w-3" /> Collaboration Desk
            </span>
            <span className="text-xs text-ink-400">• Central Request Management</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">
            Project Requests & Invitations
          </h1>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Review applicant compatibility, manage outgoing applications, accept team invites, and handle faculty mentorship inquiries.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/projects/new">
            <Button size="sm" variant="outline">+ Create Project</Button>
          </Link>
          <Link to="/projects">
            <Button size="sm">Explore Directory</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-ink-100 pb-3 no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-navy text-white shadow-sm"
                  : "bg-white border border-ink-100 text-ink-600 hover:bg-paper-100 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {t.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
        </div>
      ) : (
        <>
          {/* TAB 1: INCOMING APPLICATIONS */}
          {activeTab === "incoming" && (
            <div className="space-y-4">
              {incomingJrs.length === 0 ? (
                <EmptyState
                  title="No Incoming Applications"
                  body="When researchers apply to join your projects, their applications and AI compatibility analyses will appear here for review."
                  action={
                    <Link to="/projects/new">
                      <Button>Create a Project Proposal</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {incomingJrs.map((req) => {
                    const project = projects.find((p) => p.id === req.projectId);
                    const applicant = allProfiles.find((p) => p.userId === req.applicantId);
                    const role = project?.roles.find((r) => r.id === req.selectedRoleId);
                    const isPending = req.status === "pending";

                    return (
                      <Card
                        key={req.id}
                        className={`p-6 space-y-4 border ${
                          isPending ? "border-navy-200 shadow-sm" : "opacity-80"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-white font-serif font-bold text-lg">
                              {applicant?.photoUrl ? (
                                <img
                                  src={applicant.photoUrl}
                                  alt={applicant.fullName}
                                  className="h-full w-full rounded-xl object-cover"
                                />
                              ) : (
                                applicant?.fullName.charAt(0) || "U"
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  to={`/profile/${applicant?.userId}`}
                                  className="font-serif text-lg font-bold text-ink hover:underline"
                                >
                                  {applicant?.fullName}
                                </Link>
                                <span className="font-mono text-xs text-ink-400">
                                  {uniqueId(applicant)}
                                </span>
                                <Badge
                                  tone={
                                    req.status === "accepted"
                                      ? "green"
                                      : req.status === "rejected"
                                      ? "red"
                                      : req.status === "withdrawn"
                                      ? "slate"
                                      : "amber"
                                  }
                                >
                                  {req.status.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-xs text-ink-500">
                                {applicant?.degreeProgram ? `${applicant.degreeProgram} • ` : ""}
                                {applicant?.department} • {applicant?.institution}
                              </p>
                              <p className="text-xs text-navy font-semibold pt-0.5">
                                Applying for: <strong className="text-ink">{role?.name || "Member"}</strong> on{" "}
                                <Link to={`/projects/${project?.id}`} className="hover:underline italic text-navy">
                                  {project?.title}
                                </Link>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                            {req.analysis && (
                              <Badge tone="navy" className="text-xs font-semibold">
                                <Sparkles className="h-3 w-3 mr-1" />
                                {req.analysis.compatibilityScore}% Match Score
                              </Badge>
                            )}
                            <span className="text-[11px] text-ink-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(req.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Applicant Skills & Details */}
                        {applicant?.skills && applicant.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {applicant.skills.map((s) => (
                              <span
                                key={s.skill}
                                className="rounded bg-paper-100 border border-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700"
                              >
                                {s.skill} ({s.proficiency})
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Application Statements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-paper-50/70 p-3.5 rounded-xl border border-ink-100">
                          <div>
                            <strong className="block text-ink-800 font-semibold mb-1">
                              Statement of Motivation:
                            </strong>
                            <p className="text-ink-600 leading-relaxed">{req.motivation}</p>
                          </div>
                          <div>
                            <strong className="block text-ink-800 font-semibold mb-1">
                              Relevant Experience:
                            </strong>
                            <p className="text-ink-600 leading-relaxed">{req.relevantExperience}</p>
                          </div>
                          {req.message && (
                            <div className="md:col-span-2 pt-1 border-t border-ink-100">
                              <strong className="block text-ink-800 font-semibold mb-0.5">
                                Note to Owner:
                              </strong>
                              <p className="text-ink-600 italic">"{req.message}"</p>
                            </div>
                          )}
                        </div>

                        {/* AI Match Analysis */}
                        {req.analysis && (
                          <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-3.5 text-xs space-y-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <div>Skill Compatibility: <strong>{req.analysis.skillMatch}%</strong></div>
                              <div>Domain Alignment: <strong>{req.analysis.interestMatch}%</strong></div>
                              <div>Role Fit: <strong>{req.analysis.roleMatch}%</strong></div>
                              <div>Experience: <strong>{req.analysis.experienceMatch}%</strong></div>
                            </div>
                            <p className="text-ink-700">
                              <strong>AI Assessment:</strong> {req.analysis.reason}
                            </p>
                          </div>
                        )}

                        {/* Resume & Profile Link */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-ink-100">
                          <div className="flex items-center gap-3">
                            <Link to={`/profile/${applicant?.userId}`}>
                              <Button size="sm" variant="ghost" className="text-xs">
                                Full Academic Profile →
                              </Button>
                            </Link>
                            {applicant?.resumeUrl && (
                              <a
                                href={applicant.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" /> View Resume
                              </a>
                            )}
                          </div>

                          {isPending && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectRequestId(req.id);
                                  setRejectModalOpen(true);
                                }}
                                className="text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-1" /> Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReviewApp(req.id, "accepted")}
                              >
                                <Check className="h-4 w-4 mr-1" /> Accept into Team
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OUTGOING APPLICATIONS */}
          {activeTab === "outgoing" && (
            <div className="space-y-4">
              {outgoingJrs.length === 0 ? (
                <EmptyState
                  title="No Outgoing Applications"
                  body="You have not submitted any project applications yet. Browse the campus directory to find initiatives matching your skills."
                  action={
                    <Link to="/projects">
                      <Button>Explore Projects</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {outgoingJrs.map((app) => {
                    const project = projects.find((p) => p.id === app.projectId);
                    const role = project?.roles.find((r) => r.id === app.selectedRoleId);
                    const owner = allProfiles.find((p) => p.userId === project?.ownerId);

                    return (
                      <Card key={app.id} className="p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/projects/${project?.id}`}
                                className="font-serif text-xl font-bold text-ink hover:underline"
                              >
                                {project?.title || "Research Project"}
                              </Link>
                              <Badge
                                tone={
                                  app.status === "accepted"
                                    ? "green"
                                    : app.status === "rejected"
                                    ? "red"
                                    : app.status === "withdrawn"
                                    ? "slate"
                                    : "amber"
                                }
                              >
                                {app.status === "pending" ? "UNDER REVIEW" : app.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-ink-500">
                              Lead Researcher: <strong>{owner?.fullName || "Project Lead"}</strong> •{" "}
                              Target Role: <strong className="text-navy">{role?.name || "Member"}</strong>
                            </p>
                          </div>

                          <div className="text-[11px] text-ink-400">
                            Applied on {new Date(app.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="text-xs bg-paper-50 p-3 rounded-lg border border-ink-100 text-ink-600">
                          <strong>Your Motivation:</strong> {app.motivation}
                        </div>

                        {app.rejectReason && (
                          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                            <strong>Feedback from Project Lead:</strong> {app.rejectReason}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-ink-100">
                          <Link to={`/projects/${project?.id}`} className="text-xs font-semibold text-navy hover:underline">
                            View Project Scope →
                          </Link>
                          <div className="flex items-center gap-2">
                            {app.status === "accepted" && (
                              <Link to={`/projects/${project?.id}/room`}>
                                <Button size="sm">
                                  Enter Project Room <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                              </Link>
                            )}
                            {app.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleWithdraw(app.id)}
                                className="text-red-700 hover:bg-red-50 text-xs"
                              >
                                Withdraw Application
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEAM INVITATIONS */}
          {activeTab === "invitations" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink mb-3">
                  Invitations Received ({invitationsReceived.length})
                </h3>
                {invitationsReceived.length === 0 ? (
                  <p className="text-xs text-ink-400 italic py-4">No invitations received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {invitationsReceived.map((inv) => {
                      const project = projects.find((p) => p.id === inv.projectId);
                      const inviter = allProfiles.find((p) => p.userId === inv.inviterId);
                      const isPending = inv.status === "pending";

                      return (
                        <Card key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif font-bold text-ink text-base">{project?.title}</h4>
                              <Badge tone={inv.status === "accepted" ? "green" : inv.status === "declined" ? "red" : "amber"}>
                                {inv.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-ink-500">
                              Invited by <strong>{inviter?.fullName}</strong> ({inviter?.department})
                            </p>
                            {inv.message && (
                              <p className="text-xs text-ink-600 italic bg-paper-50 p-2 rounded">
                                "{inv.message}"
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isPending ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleRespondInv(inv.id, false)}>
                                  Decline
                                </Button>
                                <Button size="sm" onClick={() => handleRespondInv(inv.id, true)}>
                                  Accept & Join Team
                                </Button>
                              </>
                            ) : inv.status === "accepted" ? (
                              <Link to={`/projects/${project?.id}/room`}>
                                <Button size="sm">Open Project Room →</Button>
                              </Link>
                            ) : null}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sent Invitations */}
              {invitationsSent.length > 0 && (
                <div className="pt-4 border-t border-ink-100">
                  <h3 className="font-serif text-lg font-bold text-ink mb-3">
                    Invitations You Sent ({invitationsSent.length})
                  </h3>
                  <div className="space-y-3">
                    {invitationsSent.map((inv) => {
                      const project = projects.find((p) => p.id === inv.projectId);
                      const invitee = allProfiles.find((p) => p.userId === inv.inviteeId);
                      return (
                        <Card key={inv.id} className="p-4 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-ink">
                              Invited <strong>{invitee?.fullName}</strong> to <em>{project?.title}</em>
                            </p>
                            <p className="text-ink-400">Status: {inv.status.toUpperCase()}</p>
                          </div>
                          <Badge tone={inv.status === "accepted" ? "green" : inv.status === "declined" ? "red" : "amber"}>
                            {inv.status}
                          </Badge>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FACULTY MENTORSHIP */}
          {activeTab === "mentorship" && (
            <div className="space-y-4">
              {mentorshipReqs.length === 0 ? (
                <EmptyState
                  title="No Mentorship Requests"
                  body="Faculty mentorship proposals for open research projects will appear here."
                />
              ) : (
                <div className="space-y-4">
                  {mentorshipReqs.map((mr) => {
                    const project = projects.find((p) => p.id === mr.projectId);
                    const faculty = allProfiles.find((p) => p.userId === mr.facultyId);
                    const owner = allProfiles.find((p) => p.userId === project?.ownerId);
                    const isFaculty = user.id === mr.facultyId;
                    const isOwner = user.id === project?.ownerId;
                    const isPending = mr.status === "pending";

                    return (
                      <Card key={mr.id} className="p-5 space-y-3 border-amber-200 bg-amber-50/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[11px] font-semibold text-brass-700 uppercase tracking-wider">
                              Faculty Mentorship Proposal
                            </span>
                            <h4 className="font-serif font-bold text-ink text-base">
                              <Link to={`/projects/${project?.id}`} className="hover:underline">
                                {project?.title}
                              </Link>
                            </h4>
                            <p className="text-xs text-ink-500">
                              Faculty: <strong>{faculty?.fullName}</strong> • Student Lead: <strong>{owner?.fullName}</strong>
                            </p>
                          </div>
                          <Badge tone={mr.status === "accepted" ? "green" : mr.status === "rejected" ? "red" : "amber"}>
                            {mr.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-ink-600 italic bg-white p-3 rounded-lg border border-ink-100">
                          "{mr.message}"
                        </p>
                        {isPending && (isFaculty || isOwner) && (
                          <div className="flex justify-end gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => handleReviewMentorship(mr.id, false)}>
                              Decline
                            </Button>
                            <Button size="sm" onClick={() => handleReviewMentorship(mr.id, true)}>
                              Accept Mentorship
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RESTRICTED DETAILS */}
          {activeTab === "details" && (
            <div className="space-y-4">
              {detailsReqs.length === 0 ? (
                <EmptyState
                  title="No Restricted Access Requests"
                  body="Requests for full details on restricted private research projects will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {detailsReqs.map((dr) => {
                    const project = projects.find((p) => p.id === dr.projectId);
                    const requester = allProfiles.find((p) => p.userId === dr.userId);
                    const isOwner = user.id === project?.ownerId;
                    const isPending = dr.status === "pending";

                    return (
                      <Card key={dr.id} className="p-4 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-ink">
                            {requester?.fullName} requested full details on <em>{project?.title}</em>
                          </p>
                          <p className="text-ink-400">Department: {requester?.department}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={dr.status === "granted" ? "green" : dr.status === "denied" ? "red" : "amber"}>
                            {dr.status.toUpperCase()}
                          </Badge>
                          {isPending && isOwner && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleResolveDetails(dr.id, false)}>
                                Deny
                              </Button>
                              <Button size="sm" onClick={() => handleResolveDetails(dr.id, true)}>
                                Grant Access
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Decline Candidate Application">
        <div className="space-y-4">
          <p className="text-xs text-ink-500">Provide optional constructive feedback to the applicant.</p>
          <Field label="Reason for Declining (Optional)">
            <Input
              placeholder="e.g. Role filled / looking for advanced PyTorch expertise"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (rejectRequestId) {
                  handleReviewApp(rejectRequestId, "rejected", rejectReason);
                  setRejectModalOpen(false);
                  setRejectRequestId(null);
                  setRejectReason("");
                }
              }}
            >
              Decline Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
