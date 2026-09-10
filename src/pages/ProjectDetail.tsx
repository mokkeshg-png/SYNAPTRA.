import { useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getState,
  applyToProject,
  withdrawApplication,
  reviewApplication,
  requestFullDetails,
  resolveDetailsRequest,
  requestMentorship,
  reviewMentorship,
  closeProject,
  completeProject,
  fileReport,
  canAccessRoom,
  canSeeFullProject,
} from "@/lib/store";
import { analyzeCompatibility } from "@/lib/matching";
import { CompatibilityPanel } from "@/components/ai/CompatibilityPanel";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { deadlineCountdown } from "@/lib/utils";
import type { ReportType } from "@/types";
import {
  Sparkles,
  Users,
  Calendar,
  Shield,
  Clock,
  CheckCircle2,
  Lock,
  Flag,
  ArrowRight,
  GraduationCap,
  Check,
  X,
} from "lucide-react";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const autoApply = searchParams.get("apply") === "1";

  const { user, profile, refresh } = useAuth();
  const navigate = useNavigate();
  const state = getState();

  const project = state.projects.find((p) => p.id === id);

  // Modals state
  const [applyOpen, setApplyOpen] = useState(autoApply);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [motivation, setMotivation] = useState("");
  const [relevantExperience, setRelevantExperience] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Mentorship Modal
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorMsg, setMentorMsg] = useState("I would be glad to guide this research project and review your milestones.");
  const [mentorLoading, setMentorLoading] = useState(false);

  // Report Modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("misleading_project");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  // Reject with reason modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-ink">Project Not Found</h2>
        <p className="text-sm text-ink-500">The requested research initiative does not exist or was removed.</p>
        <Link to="/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === project.ownerId;
  const isMember = user ? canAccessRoom(user.id, project.id) : false;
  const canSeeFull = canSeeFullProject(user?.id ?? null, project);
  const ownerProfile = state.profiles.find((p) => p.userId === project.ownerId);

  // Members list
  const activeMembers = state.members
    .filter((m) => m.projectId === project.id && m.status === "active")
    .map((m) => {
      const p = state.profiles.find((pr) => pr.userId === m.userId);
      const role = project.roles.find((r) => r.id === m.roleId);
      return { member: m, profile: p, roleName: role?.name };
    });

  // Current user's application (if any)
  const userApplication = user
    ? state.joinRequests.find((jr) => jr.projectId === project.id && jr.applicantId === user.id)
    : null;

  // Pending details request
  const detailsRequest = user
    ? state.detailsRequests.find((dr) => dr.projectId === project.id && dr.userId === user.id)
    : null;

  // Pending mentorship request
  const userMentorshipRequest = user
    ? state.mentorshipRequests.find((mr) => mr.projectId === project.id && mr.facultyId === user.id)
    : null;

  // Applications received (for owner)
  const pendingApplications = state.joinRequests.filter(
    (jr) => jr.projectId === project.id && jr.status === "pending"
  );
  const pendingDetailsRequests = state.detailsRequests.filter(
    (dr) => dr.projectId === project.id && dr.status === "pending"
  );
  const pendingMentorshipRequests = state.mentorshipRequests.filter(
    (mr) => mr.projectId === project.id && mr.status === "pending"
  );

  // Live viewer match analysis
  const matchAnalysis = profile ? analyzeCompatibility(project, profile) : null;

  // Actions
  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    setApplyError(null);
    if (!selectedRoleId && project.roles.length > 0) {
      setSelectedRoleId(project.roles[0].id);
    }
    setApplyLoading(true);
    try {
      applyToProject({
        projectId: project.id,
        applicantId: user.id,
        selectedRoleId: selectedRoleId || project.roles[0]?.id || "role-default",
        motivation: motivation.trim() || "Excited to contribute to this research project.",
        relevantExperience: relevantExperience.trim() || "Academic background in related coursework.",
        message: applyMessage.trim(),
      });
      refresh();
      setApplyOpen(false);
    } catch (err: any) {
      setApplyError(err?.message || "Failed to submit application");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleWithdraw = () => {
    if (!user || !userApplication) return;
    if (confirm("Are you sure you want to withdraw your application?")) {
      withdrawApplication(user.id, userApplication.id);
      refresh();
    }
  };

  const handleMentorshipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMentorLoading(true);
    try {
      requestMentorship(user.id, project.id, mentorMsg);
      refresh();
      setMentorOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to offer mentorship");
    } finally {
      setMentorLoading(false);
    }
  };

  const handleReviewApp = (requestId: string, decision: "accepted" | "rejected", reason?: string) => {
    if (!user) return;
    reviewApplication(user.id, requestId, decision, reason);
    refresh();
  };

  const handleResolveDetails = (requestId: string, grant: boolean) => {
    if (!user) return;
    resolveDetailsRequest(user.id, requestId, grant);
    refresh();
  };

  const handleResolveMentorship = (requestId: string, accept: boolean) => {
    if (!user) return;
    reviewMentorship(user.id, requestId, accept);
    refresh();
  };

  const handleFileReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    fileReport(user.id, "project", project.id, reportType, reportDetails);
    setReportSuccess(true);
    setTimeout(() => {
      setReportOpen(false);
      setReportSuccess(false);
      setReportDetails("");
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link to="/projects" className="font-semibold text-navy hover:underline">
          ← Back to Projects
        </Link>
        <div className="flex items-center gap-2">
          <Badge tone={project.status === "open" ? "green" : project.status === "completed" ? "navy" : "amber"}>
            STATUS: {project.status.toUpperCase()}
          </Badge>
          <Badge tone="slate">VISIBILITY: {project.visibility.toUpperCase()}</Badge>
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1 text-ink-400 hover:text-red-700 ml-2"
          >
            <Flag className="h-3 w-3" /> Report Project
          </button>
        </div>
      </div>

      {/* Main Project Header Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brass-50 px-3 py-1 text-xs font-semibold text-brass-800">
                {project.type}
              </span>
              <span className="text-xs text-ink-400">•</span>
              <span className="text-xs font-medium text-ink-600 uppercase tracking-wider">
                {project.domains.join(" / ")}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
              {project.title}
            </h1>

            <p className="text-sm text-ink-600 leading-relaxed max-w-3xl">
              {project.shortDescription}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-500 pt-2">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-ink-400" />
                Team Capacity: <strong>{activeMembers.length + 1} / {project.teamMax}</strong> (Min: {project.teamMin})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-ink-400" />
                Duration: <strong>{project.duration || "Semester"}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-ink-400" />
                Deadline: <strong>{deadlineCountdown(project.deadline)}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-ink-400" />
                Difficulty: <strong className="capitalize">{project.difficulty}</strong>
              </span>
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex flex-col gap-2 shrink-0 sm:min-w-[220px]">
            {isMember ? (
              <Link to={`/projects/${project.id}/room`} className="w-full">
                <Button size="lg" className="w-full shadow-md">
                  Enter Project Room <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : userApplication ? (
              <div className="rounded-xl border border-navy-200 bg-navy-50/70 p-4 text-center space-y-2">
                <p className="text-xs font-semibold text-navy-900">Application Submitted</p>
                <Badge
                  tone={
                    userApplication.status === "accepted"
                      ? "green"
                      : userApplication.status === "rejected"
                      ? "red"
                      : "amber"
                  }
                >
                  {userApplication.status.toUpperCase()}
                </Badge>
                {userApplication.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWithdraw}
                    className="w-full text-xs text-red-700 hover:bg-red-50"
                  >
                    Withdraw Application
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => {
                    if (!user) navigate(`/login?redirect=/projects/${project.id}`);
                    else setApplyOpen(true);
                  }}
                  className="w-full shadow-md"
                >
                  Apply to Join Team
                </Button>

                {user?.role === "faculty" && !userMentorshipRequest && (
                  <Button
                    variant="outline"
                    onClick={() => setMentorOpen(true)}
                    className="w-full text-xs"
                  >
                    <GraduationCap className="h-4 w-4" /> Offer Faculty Mentorship
                  </Button>
                )}
                {userMentorshipRequest && (
                  <p className="text-center text-xs text-brass-700 italic">
                    Mentorship proposal pending owner review
                  </p>
                )}
              </>
            )}

            {/* Owner Management Controls */}
            {isOwner && (
              <div className="mt-2 pt-2 border-t border-ink-100 flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-400 text-center">
                  Project Governance
                </span>
                {project.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Mark project complete?")) {
                        completeProject(user.id, project.id);
                        refresh();
                      }
                    }}
                  >
                    Mark as Completed
                  </Button>
                )}
                {project.status === "open" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Close project to new applicants?")) {
                        closeProject(user.id, project.id);
                        refresh();
                      }
                    }}
                  >
                    Close Applications
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Required Skills & Tags */}
        <div className="pt-4 border-t border-ink-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-400 block mb-2">
              Required Technical Skills:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {project.requiredSkills.map((s) => (
                <Badge key={s} tone="navy">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {project.tags?.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400 block mb-2">
                Tags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <Badge key={t} tone="slate">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Owner Review Management Hub (If user is Owner) */}
      {isOwner && (
        <Card className="p-6 space-y-6 border-navy-300 bg-navy-50/30">
          <div className="flex items-center justify-between border-b border-navy-100 pb-3">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">
                Owner Review Center
              </h2>
              <p className="text-xs text-ink-500">
                Review applicant compatibility scores and handle mentorship and details requests
              </p>
            </div>
            <Badge tone="navy">{pendingApplications.length} Pending Applications</Badge>
          </div>

          {/* Pending Applications with AI Match Score */}
          {pendingApplications.length === 0 ? (
            <p className="text-xs text-ink-500 italic py-2">
              No pending student applications at this time.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingApplications.map((req) => {
                const applicant = state.profiles.find((p) => p.userId === req.applicantId);
                const role = project.roles.find((r) => r.id === req.selectedRoleId);
                return (
                  <div key={req.id} className="rounded-xl border border-ink-200 bg-white p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-ink text-base">
                            <Link to={`/profile/${applicant?.userId}`} className="hover:underline">
                              {applicant?.fullName}
                            </Link>
                          </h3>
                          <span className="text-xs text-ink-400">• {applicant?.institution}</span>
                        </div>
                        <p className="text-xs text-ink-600 mt-0.5">
                          Applying for Role: <strong className="text-navy">{role?.name || "Collaborator"}</strong>
                        </p>
                      </div>

                      {req.analysis && (
                        <div className="text-right">
                          <Badge tone="navy">
                            {req.analysis.compatibilityScore}% Compatibility
                          </Badge>
                          <span className="block text-[10px] text-ink-400 uppercase tracking-wider mt-0.5">
                            {req.analysis.confidence} Confidence
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Applicant statements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-paper-50 p-3 rounded-lg">
                      <div>
                        <strong className="block text-ink-700 mb-0.5">Motivation:</strong>
                        <p className="text-ink-600">{req.motivation}</p>
                      </div>
                      <div>
                        <strong className="block text-ink-700 mb-0.5">Relevant Experience:</strong>
                        <p className="text-ink-600">{req.relevantExperience}</p>
                      </div>
                    </div>

                    {/* AI Score Breakdown & Reasoning */}
                    {req.analysis && (
                      <div className="rounded-lg border border-navy-100 bg-navy-50/50 p-3 text-xs space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>Skill Match: <strong>{req.analysis.skillMatch}%</strong></div>
                          <div>Domain Match: <strong>{req.analysis.interestMatch}%</strong></div>
                          <div>Role Match: <strong>{req.analysis.roleMatch}%</strong></div>
                          <div>Experience: <strong>{req.analysis.experienceMatch}%</strong></div>
                        </div>
                        <p className="text-ink-700"><strong>AI Assessment:</strong> {req.analysis.reason}</p>
                      </div>
                    )}

                    {/* Decision Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectRequestId(req.id);
                          setRejectModalOpen(true);
                        }}
                        className="text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReviewApp(req.id, "accepted")}
                      >
                        <Check className="h-4 w-4 mr-1" /> Accept into Team
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending Details Requests */}
          {pendingDetailsRequests.length > 0 && (
            <div className="pt-4 border-t border-navy-100 space-y-3">
              <h3 className="font-serif font-bold text-ink text-sm">
                Restricted Details Requests ({pendingDetailsRequests.length})
              </h3>
              {pendingDetailsRequests.map((dr) => {
                const requester = state.profiles.find((p) => p.userId === dr.userId);
                return (
                  <div key={dr.id} className="flex items-center justify-between rounded-lg border border-ink-100 bg-white p-3 text-xs">
                    <div>
                      <p className="font-semibold text-ink">{requester?.fullName || "Researcher"}</p>
                      <p className="text-ink-500">{requester?.institution}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleResolveDetails(dr.id, false)}>
                        Deny
                      </Button>
                      <Button size="sm" onClick={() => handleResolveDetails(dr.id, true)}>
                        Grant Access
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending Mentorship Requests */}
          {pendingMentorshipRequests.length > 0 && (
            <div className="pt-4 border-t border-navy-100 space-y-3">
              <h3 className="font-serif font-bold text-ink text-sm">
                Faculty Mentorship Inquiries ({pendingMentorshipRequests.length})
              </h3>
              {pendingMentorshipRequests.map((mr) => {
                const fac = state.profiles.find((p) => p.userId === mr.facultyId);
                return (
                  <div key={mr.id} className="flex items-center justify-between rounded-lg border border-ink-100 bg-white p-3 text-xs">
                    <div>
                      <p className="font-semibold text-ink">{fac?.fullName} ({fac?.department})</p>
                      <p className="text-ink-500 italic">"{mr.message}"</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleResolveMentorship(mr.id, false)}>
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => handleResolveMentorship(mr.id, true)}>
                        Accept Mentor
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Main Content Layout: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3): Project Scope or Restricted Teaser */}
        <div className="lg:col-span-2 space-y-6">
          {!canSeeFull ? (
            /* Restricted Project Teaser per PRD Section 20 */
            <Card className="p-6 text-center space-y-4 border-amber-200 bg-amber-50/40">
              <Lock className="h-10 w-10 text-amber-600 mx-auto" />
              <h3 className="font-serif text-2xl font-bold text-ink">
                Restricted Research Initiative
              </h3>
              <p className="text-sm text-ink-600 max-w-md mx-auto leading-relaxed">
                This project has restricted visibility. To protect proprietary methodologies and preliminary findings, the detailed research objectives and documentation are available upon owner approval.
              </p>

              {detailsRequest ? (
                <div className="rounded-lg bg-white p-3 text-xs text-ink-600 border border-amber-200">
                  Access request submitted with status: <strong>{detailsRequest.status.toUpperCase()}</strong>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    if (!user) navigate(`/login?redirect=/projects/${project.id}`);
                    else {
                      requestFullDetails(user.id, project.id);
                      refresh();
                    }
                  }}
                >
                  Request Full Details Access
                </Button>
              )}
            </Card>
          ) : (
            <>
              {/* Detailed Description */}
              <Card className="p-6 space-y-3">
                <h2 className="font-serif text-xl font-bold text-ink">Research Scope & Methodology</h2>
                <div className="prose prose-sm text-ink-700 leading-relaxed whitespace-pre-line">
                  {project.detailedDescription}
                </div>
              </Card>

              {/* Problem Statement & Objectives */}
              {(project.problemStatement || project.objectives?.length > 0) && (
                <Card className="p-6 space-y-4">
                  {project.problemStatement && (
                    <div>
                      <h3 className="font-serif text-lg font-bold text-ink mb-1">Problem Statement</h3>
                      <p className="text-sm text-ink-600 leading-relaxed">{project.problemStatement}</p>
                    </div>
                  )}

                  {project.objectives?.length > 0 && (
                    <div className="pt-2">
                      <h3 className="font-serif text-lg font-bold text-ink mb-2">Key Objectives</h3>
                      <ul className="space-y-2 text-sm text-ink-600">
                        {project.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-navy mt-0.5 shrink-0" />
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              {/* Open Roles */}
              <Card className="p-6 space-y-4">
                <h2 className="font-serif text-xl font-bold text-ink">
                  Open Project Roles ({project.roles.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.roles.map((r) => (
                    <div key={r.id} className="rounded-xl border border-ink-100 bg-paper-50/70 p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-ink text-sm">{r.name}</h4>
                        <Badge tone="slate">{r.openings} Openings</Badge>
                      </div>
                      <p className="text-xs text-ink-500">{r.description}</p>
                      {r.requiredSkills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {r.requiredSkills.map((sk) => (
                            <span key={sk} className="text-[10px] bg-white px-2 py-0.5 rounded border border-ink-100 text-ink-600">
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Right Column (1/3): AI Compatibility Panel & Team */}
        <div className="space-y-6">
          {/* Explainable AI Compatibility Panel */}
          {matchAnalysis && (
            <div>
              <CompatibilityPanel analysis={matchAnalysis} />
            </div>
          )}

          {/* Current Team Members */}
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-ink">Project Collaborators</h3>

            {/* Owner */}
            <div className="flex items-center justify-between rounded-lg border border-brass-200 bg-brass-50/40 p-3">
              <div>
                <Link to={`/profile/${ownerProfile?.userId}`} className="font-bold text-xs text-ink hover:underline">
                  {ownerProfile?.fullName}
                </Link>
                <p className="text-[11px] text-ink-400">{ownerProfile?.institution}</p>
              </div>
              <Badge tone="brass">Owner</Badge>
            </div>

            {/* Active Members */}
            {activeMembers.map(({ member, profile: p, roleName }) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border border-ink-100 bg-paper-50 p-3">
                <div>
                  <Link to={`/profile/${p?.userId}`} className="font-bold text-xs text-ink hover:underline">
                    {p?.fullName}
                  </Link>
                  <p className="text-[11px] text-ink-400">{roleName || member.systemRole}</p>
                </div>
                <Badge tone={member.systemRole === "mentor" ? "green" : "navy"}>
                  {member.systemRole.toUpperCase()}
                </Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Apply to Join Modal */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={`Apply to ${project.title}`}
      >
        <form onSubmit={handleApply} className="space-y-4">
          {applyError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {applyError}
            </div>
          )}

          <Field label="Select Target Role">
            <Select
              value={selectedRoleId || project.roles[0]?.id}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              {project.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.openings} open)
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Statement of Motivation" hint="Why do you want to join this research effort? (200-1000 chars)">
            <Textarea
              required
              placeholder="Detail your interest in the domain, your availability, and what you aim to achieve..."
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
            />
          </Field>

          <Field label="Relevant Technical Experience" hint="Highlight coursework, tools, or past repositories">
            <Textarea
              required
              placeholder="e.g. Completed CS771 Machine Learning, experience with PyTorch computer vision pipelines..."
              value={relevantExperience}
              onChange={(e) => setRelevantExperience(e.target.value)}
            />
          </Field>

          <Field label="Direct Message to Owner (Optional)">
            <Input
              placeholder="Any specific note or timeline constraint..."
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
            />
          </Field>

          <div className="rounded-lg bg-navy-50/70 p-3 text-xs text-navy-800 border border-navy-200">
            <Sparkles className="h-3.5 w-3.5 inline mr-1 text-navy-600" />
            Upon submitting, the <strong>Explainable AI Engine</strong> will assess your profile compatibility and provide an advisory score to the project owner.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={applyLoading}>
              Submit Application →
            </Button>
          </div>
        </form>
      </Modal>

      {/* Faculty Mentorship Modal */}
      <Modal
        open={mentorOpen}
        onClose={() => setMentorOpen(false)}
        title="Offer Faculty Mentorship"
      >
        <form onSubmit={handleMentorshipSubmit} className="space-y-4">
          <p className="text-xs text-ink-500">
            As faculty, your guidance provides academic oversight and milestone feedback for student research leads.
          </p>

          <Field label="Mentorship Note to Student Lead">
            <Textarea
              required
              value={mentorMsg}
              onChange={(e) => setMentorMsg(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setMentorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mentorLoading}>
              Send Mentorship Proposal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Application Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Decline Candidate Application"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-500">
            Optionally provide constructive feedback to the applicant regarding role requirements or future openings.
          </p>
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

      {/* Report Project Modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report Project to Academic Moderation"
      >
        <form onSubmit={handleFileReport} className="space-y-4">
          {reportSuccess ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 text-center">
              Report submitted to Platform Administrator desk for investigation.
            </div>
          ) : (
            <>
              <Field label="Report Category">
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                >
                  <option value="misleading_project">Misleading Project Information</option>
                  <option value="spam">Spam / Duplicate Posting</option>
                  <option value="inappropriate_content">Inappropriate Academic Content</option>
                  <option value="fake_profile">Suspicious / Fake Profile</option>
                  <option value="other">Other Violation</option>
                </Select>
              </Field>

              <Field label="Specific Details & Evidence">
                <Textarea
                  required
                  placeholder="Explain why this project violates campus collaboration guidelines..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setReportOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger">
                  Submit Report
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
