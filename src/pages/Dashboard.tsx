
import { saveProfile } from "@/lib/supabase-db";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProjects,
  fetchProjectMembersByProjects,
  fetchJoinRequests,
  fetchJoinRequestsByProjects,
  fetchMentorshipRequests,
  reviewMentorship,
  reviewApplication,
  withdrawApplication,
  fetchAllProfiles,
  getOrFetchProjectAnalyses,
} from "@/lib/supabase-db";
import { recommendCollaborators } from "@/lib/matching";
import { ProjectCard, PersonCard } from "@/components/projects/ProjectCard";
import { AiProjectExplanation } from "@/components/projects/AiProjectExplanation";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Progress } from "@/components/ui/Card";
import type { Project, ProjectMember, JoinRequest, MentorshipRequest, Profile, Proficiency, AiAnalysisRecord } from "@/types";
import {
  Sparkles,
  Layers,
  FolderPlus,
  Users,
  GraduationCap,
  Building2,
  ArrowUpRight,
  Loader2,
  Inbox,
  MessageSquare,
  Compass,
  Wrench,
  Check,
  X,
} from "lucide-react";

export function Dashboard() {
  const { user, profile, refresh } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // AI-powered Project Recommendations state
  const [aiProjectRecommendations, setAiProjectRecommendations] = useState<{ project: Project; analysis: AiAnalysisRecord }[]>([]);
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false);

  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState<Proficiency>("intermediate");

  const [addInterestOpen, setAddInterestOpen] = useState(false);
  const [newInterestName, setNewInterestName] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [projs, jrs, mrs, profiles] = await Promise.all([
          fetchProjects(),
          fetchJoinRequests(undefined, user!.id),
          fetchMentorshipRequests(undefined, user!.id),
          fetchAllProfiles(),
        ]);
        if (cancelled) return;

        // Fetch members for all projects user is connected to (owned + member)
        // First find all join requests to determine project membership
        const ownedProjectIds = new Set(projs.filter((p) => p.ownerId === user!.id).map((p) => p.id));
        const appliedProjectIds = new Set(jrs.filter((jr) => jr.status === "accepted").map((jr) => jr.projectId));
        const connectedProjectIds = new Set([...ownedProjectIds, ...appliedProjectIds]);
        const connectedIds = [...connectedProjectIds];

        // Single batch query — replaces N×fetchProjectMembers
        const membersMap = await fetchProjectMembersByProjects(connectedIds);
        const allMembers: ProjectMember[] = [];
        for (const members of membersMap.values()) allMembers.push(...members);

        // Fetch incoming join requests for owned projects in one batch query
        const allReceivedJrs = connectedIds.length > 0
          ? await fetchJoinRequestsByProjects([...ownedProjectIds]).then((rows) =>
              rows.filter((jr) => jr.applicantId !== user!.id)
            )
          : [];

        if (cancelled) return;
        setProjects(projs);
        setMembers(allMembers);
        setJoinRequests([...jrs, ...allReceivedJrs]);
        setMentorshipRequests(mrs);
        setAllProfiles(profiles);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  // Derived state
  const userMemberships = members.filter((m) => m.userId === user?.id && m.status === "active");
  const activeProjectIds = new Set([
    ...userMemberships.map((m) => m.projectId),
    ...projects.filter((p) => p.ownerId === user?.id).map((p) => p.id),
  ]);
  const activeProjects = projects.filter((p) => activeProjectIds.has(p.id));

  // Load AI project recommendations using Supabase cache + Edge Function
  const activeProjectIdsKey = Array.from(activeProjectIds).sort().join(",");
  const candidateProjectsLength = projects.length;

  useEffect(() => {
    if (!user || !profile || loading) return;
    let cancelled = false;

    const candidateProjects = projects.filter(
      (p) => p.status === "open" && p.visibility !== "private" && !activeProjectIds.has(p.id)
    );

    if (candidateProjects.length === 0) {
      setAiProjectRecommendations([]);
      return;
    }

    async function loadAiRecs() {
      setAiMatchingLoading(true);
      try {
        const ranked = await getOrFetchProjectAnalyses(user!.id, candidateProjects);
        if (!cancelled) {
          setAiProjectRecommendations(ranked);
        }
      } catch (err) {
        console.error("Failed to load AI project recommendations:", err);
      } finally {
        if (!cancelled) {
          setAiMatchingLoading(false);
        }
      }
    }

    loadAiRecs();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile, loading, candidateProjectsLength, activeProjectIdsKey]);

  if (!user || !profile) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-ink-500">You must be signed in to access the Academic Dashboard.</p>
        <Link to="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  const submittedApplications = joinRequests.filter(
    (jr) => jr.applicantId === user.id
  );
  const ownedProjectIds = new Set(projects.filter((p) => p.ownerId === user.id).map((p) => p.id));
  const receivedApplications = joinRequests.filter(
    (jr) => ownedProjectIds.has(jr.projectId) && jr.status === "pending" && jr.applicantId !== user.id
  );
  const facultyMentorshipRequests = mentorshipRequests.filter(
    (mr) => mr.facultyId === user.id && mr.status === "pending"
  );

  // Collaborator recommendations
  const sharedIds = new Set<string>(
    members.filter((m) => activeProjectIds.has(m.projectId)).map((m) => m.userId)
  );
  const recommendedCollaborators = useMemo(
    () => recommendCollaborators(
      profile,
      allProfiles.filter((p) => p.userId !== user.id),
      sharedIds
    ).slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allProfiles, members, profile]
  );

  // Pre-compute member counts per project — avoids repeated .filter() inside render
  const memberCountByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) {
      if (m.status === "active") map.set(m.projectId, (map.get(m.projectId) ?? 0) + 1);
    }
    return map;
  }, [members]);

  function getProjectStats(projectId: string) {
    return { membersCount: (memberCountByProject.get(projectId) ?? 0) + 1 };
  }

  const handleWithdraw = async (reqId: string) => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      await withdrawApplication(user.id, reqId);
      setJoinRequests((prev) => prev.map((jr) => jr.id === reqId ? { ...jr, status: "withdrawn" } : jr));
    }
  };

  const handleMentorshipResponse = async (reqId: string, accept: boolean) => {
    await reviewMentorship(user.id, reqId, accept);
    setMentorshipRequests((prev) => prev.map((mr) => mr.id === reqId ? { ...mr, status: accept ? "accepted" : "rejected" } : mr));
    refresh();
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const exists = profile.skills.some((s) => s.skill.toLowerCase() === newSkillName.trim().toLowerCase());
    if (exists) {
      alert("Skill already added to your profile.");
      return;
    }
    const updated = [...profile.skills, { skill: newSkillName.trim(), proficiency: newSkillProf }];
    await saveProfile(user.id, {
      ...profile,
      skills: updated,
    });
    setNewSkillName("");
    refresh();
  };

  const handleRemoveSkill = async (skillName: string) => {
    const updated = profile.skills.filter((s) => s.skill !== skillName);
    await saveProfile(user.id, {
      ...profile,
      skills: updated,
    });
    refresh();
  };

  const handleUpdateSkillProf = async (skillName: string, prof: Proficiency) => {
    const updated = profile.skills.map((s) => s.skill === skillName ? { ...s, proficiency: prof } : s);
    await saveProfile(user.id, {
      ...profile,
      skills: updated,
    });
    refresh();
  };

  const handleAddInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterestName.trim()) return;
    const exists = profile.interests.some((i) => i.toLowerCase() === newInterestName.trim().toLowerCase());
    if (exists) {
      alert("Interest already added to your profile.");
      return;
    }
    const updated = [...profile.interests, newInterestName.trim()];
    await saveProfile(user.id, {
      ...profile,
      interests: updated,
    });
    setNewInterestName("");
    refresh();
  };

  const handleRemoveInterest = async (interest: string) => {
    const updated = profile.interests.filter((i) => i !== interest);
    await saveProfile(user.id, {
      ...profile,
      interests: updated,
    });
    refresh();
  };

  const handleReviewJoinApp = async (reqId: string, decision: "accepted" | "rejected") => {
    await reviewApplication(user.id, reqId, decision);
    setJoinRequests((prev) => prev.map((jr) => jr.id === reqId ? { ...jr, status: decision } : jr));
    refresh();
  };

  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-ink-600">
              {user.email?.includes("faculty") || profile.designation
                ? <Building2 className="h-3 w-3" />
                : <GraduationCap className="h-3 w-3" />}
              {profile.designation ? "Faculty Workspace" : "Researcher Workspace"}
            </span>
            <span className="text-xs text-ink-400">• {profile.institution}</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
            Welcome back, {profile.fullName}
          </h1>
          <p className="text-sm text-ink-500 max-w-2xl">
            {profile.designation
              ? "Guide student initiatives, review research mentorship requests, and track active laboratory collaborations."
              : "Discover research projects matching your skills, coordinate with team members, and track your applications."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/projects/new">
            <Button className="shadow-sm"><FolderPlus className="h-4 w-4" /> Create Project</Button>
          </Link>
          <Link to="/projects">
            <Button variant="outline"><Sparkles className="h-4 w-4" /> Browse Directory</Button>
          </Link>
        </div>
      </div>

      {/* Quick Action Navigation Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setAddSkillOpen(true)}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-ink-100 bg-white hover:border-navy hover:bg-navy-50/30 transition-all text-center group shadow-2xs"
        >
          <div className="h-8 w-8 rounded-lg bg-navy-50 text-navy flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
            <Wrench className="h-4 w-4" />
          </div>
          <span className="font-semibold text-xs text-ink">My Skills</span>
          <span className="text-[10px] text-ink-400">{profile.skills.length} mapped</span>
        </button>

        <button
          onClick={() => setAddInterestOpen(true)}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-ink-100 bg-white hover:border-brass hover:bg-brass-50/30 transition-all text-center group shadow-2xs"
        >
          <div className="h-8 w-8 rounded-lg bg-brass-50 text-brass-800 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-semibold text-xs text-ink">My Interests</span>
          <span className="text-[10px] text-ink-400">{profile.interests.length} domains</span>
        </button>

        <Link
          to="/projects/new"
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-ink-100 bg-white hover:border-navy hover:bg-navy-50/30 transition-all text-center group shadow-2xs"
        >
          <div className="h-8 w-8 rounded-lg bg-brass-50 text-brass-800 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
            <FolderPlus className="h-4 w-4" />
          </div>
          <span className="font-semibold text-xs text-ink">Create Project</span>
          <span className="text-[10px] text-ink-400">Assemble team</span>
        </Link>

        <Link
          to="/projects"
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-ink-100 bg-white hover:border-navy hover:bg-navy-50/30 transition-all text-center group shadow-2xs"
        >
          <div className="h-8 w-8 rounded-lg bg-paper-100 text-ink flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
            <Compass className="h-4 w-4 text-ink-600" />
          </div>
          <span className="font-semibold text-xs text-ink">Find Projects</span>
          <span className="text-[10px] text-ink-400">Match skills</span>
        </Link>

        <Link
          to="/collaborators"
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-ink-100 bg-white hover:border-navy hover:bg-navy-50/30 transition-all text-center group shadow-2xs"
        >
          <div className="h-8 w-8 rounded-lg bg-paper-100 text-ink flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
            <Users className="h-4 w-4 text-ink-600" />
          </div>
          <span className="font-semibold text-xs text-ink">Find People</span>
          <span className="text-[10px] text-ink-400">Students & Faculty</span>
        </Link>

        <Link
          to="/requests"
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-ink-100 bg-white hover:border-navy hover:bg-navy-50/30 transition-all text-center group shadow-2xs relative"
        >
          <div className="h-8 w-8 rounded-lg bg-navy-50 text-navy flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
            <Inbox className="h-4 w-4" />
          </div>
          <span className="font-semibold text-xs text-ink">Requests Hub</span>
          <span className="text-[10px] text-ink-400">
            {receivedApplications.length > 0 ? `${receivedApplications.length} pending review` : "Manage status"}
          </span>
          {receivedApplications.length > 0 && (
            <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
          )}
        </Link>

        <Link
          to="/messages"
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-ink-100 bg-white hover:border-navy hover:bg-navy-50/30 transition-all text-center group shadow-2xs"
        >
          <div className="h-8 w-8 rounded-lg bg-paper-100 text-ink flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
            <MessageSquare className="h-4 w-4 text-ink-600" />
          </div>
          <span className="font-semibold text-xs text-ink">Team Messages</span>
          <span className="text-[10px] text-ink-400">Active rooms</span>
        </Link>
      </div>

      {/* Profile Completeness Alert */}
      {/* Profile Completeness Alert */}
      {profile.profileCompleteness < 100 && (
        <div className="rounded-xl border border-brass-200 bg-brass-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brass-700" />
              <h3 className="text-sm font-semibold text-brass-900">
                Enhance your AI Matching Precision (Profile Completeness: {profile.profileCompleteness}%)
              </h3>
            </div>
            <p className="text-xs text-brass-800">
              Adding your GitHub profile, past projects, or academic certifications boosts your compatibility scores.
            </p>
            <div className="w-full sm:w-64 pt-1">
              <Progress value={profile.profileCompleteness} />
            </div>
          </div>
          <Link to="/onboarding">
            <Button variant="secondary" size="sm" className="whitespace-nowrap">Complete Setup →</Button>
          </Link>
        </div>
      )}

      {/* Faculty Mentorship Requests */}
      {facultyMentorshipRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-ink">
              Pending Mentorship Requests ({facultyMentorshipRequests.length})
            </h2>
            <Badge tone="amber">Action Needed</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facultyMentorshipRequests.map((req) => {
              const project = projects.find((p) => p.id === req.projectId);
              const owner = allProfiles.find((pr) => pr.userId === project?.ownerId);
              return (
                <Card key={req.id} className="p-4 space-y-3 border-amber-200 bg-amber-50/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-brass-700 uppercase tracking-wider">
                        {project?.domains[0] || "Research"}
                      </p>
                      <h4 className="font-serif font-bold text-ink text-base">{project?.title}</h4>
                      <p className="text-xs text-ink-500">Lead: {owner?.fullName || "Student Lead"}</p>
                    </div>
                    <Badge tone="slate">Direct Request</Badge>
                  </div>
                  <p className="text-xs text-ink-600 italic bg-white p-2.5 rounded border border-ink-100">
                    "{req.message}"
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleMentorshipResponse(req.id, false)}>
                      Decline
                    </Button>
                    <Button size="sm" onClick={() => handleMentorshipResponse(req.id, true)}>
                      Accept Mentorship
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Received Join Applications */}
      {receivedApplications.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold text-ink">
                Incoming Join Applications ({receivedApplications.length})
              </h2>
              <Badge tone="navy">Action Required</Badge>
            </div>
            <Link to="/requests" className="text-xs font-semibold text-navy hover:underline">
              View in Requests Hub →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receivedApplications.map((req) => {
              const project = projects.find((p) => p.id === req.projectId);
              const applicant = allProfiles.find((pr) => pr.userId === req.applicantId);
              const role = project?.roles.find((r) => r.id === req.selectedRoleId);
              return (
                <Card key={req.id} className="p-4 space-y-3 border-navy-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/profile/${applicant?.userId}`} className="font-serif font-bold text-ink text-base hover:underline">
                        {applicant?.fullName}
                      </Link>
                      <p className="text-xs text-ink-500">
                        Applying for: <strong>{role?.name || "Member"}</strong> on <em>{project?.title}</em>
                      </p>
                    </div>
                    {req.analysis && (
                      <Badge tone="navy">{req.analysis.compatibilityScore}% AI Match</Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-600 line-clamp-2 bg-paper-50 p-2.5 rounded border border-ink-100">
                    <strong>Motivation:</strong> {req.motivation}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-ink-100">
                    <Link to={`/profile/${applicant?.userId}`} className="text-xs text-ink-500 hover:underline">
                      View Profile
                    </Link>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleReviewJoinApp(req.id, "rejected")} className="text-red-700 hover:bg-red-50 text-xs">
                        <X className="h-3.5 w-3.5 mr-1" /> Decline
                      </Button>
                      <Button size="sm" onClick={() => handleReviewJoinApp(req.id, "accepted")} className="text-xs">
                        <Check className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Active Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">Active Project Workspaces</h2>
            <p className="text-xs text-ink-500">Projects where you are currently collaborating as an owner, member, or mentor</p>
          </div>
          <Link to="/projects/new">
            <Button size="sm" variant="outline"><FolderPlus className="h-4 w-4" /> Start New</Button>
          </Link>
        </div>

        {activeProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-paper-50 p-8 text-center space-y-3">
            <Layers className="h-8 w-8 text-ink-400 mx-auto" />
            <h3 className="font-serif font-bold text-ink">No Active Projects Yet</h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              Explore open academic research projects to join, or initiate your own project proposal.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/projects"><Button size="sm">Explore Directory</Button></Link>
              <Link to="/projects/new"><Button size="sm" variant="outline">Create Project</Button></Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((proj) => {
              const isOwner = proj.ownerId === user.id;
              const isMentor = members.some(
                (m) => m.projectId === proj.id && m.userId === user.id && m.systemRole === "mentor"
              );
              const { membersCount } = getProjectStats(proj.id);

              return (
                <Card key={proj.id} className="flex flex-col justify-between hover:border-navy transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge tone={isOwner ? "brass" : isMentor ? "green" : "navy"}>
                        {isOwner ? "Project Owner" : isMentor ? "Faculty Mentor" : "Team Member"}
                      </Badge>
                      <span className="text-[11px] text-ink-400 uppercase tracking-wider font-semibold">
                        {proj.status}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-ink hover:text-navy">
                      <Link to={`/projects/${proj.id}`}>{proj.title}</Link>
                    </h3>
                    <p className="text-xs text-ink-500 line-clamp-2">{proj.shortDescription}</p>
                    <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-50">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {membersCount} collaborators
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-ink-100 flex gap-2">
                    <Link to={`/projects/${proj.id}/room`} className="flex-1">
                      <Button className="w-full text-xs" size="sm">Enter Project Room →</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Submitted Applications */}
      {submittedApplications.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-ink">
            Your Submitted Applications ({submittedApplications.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
            <div className="divide-y divide-ink-100">
              {submittedApplications.map((app) => {
                const project = projects.find((p) => p.id === app.projectId);
                const role = project?.roles.find((r) => r.id === app.selectedRoleId);
                return (
                  <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/projects/${project?.id}`} className="font-semibold text-sm text-ink hover:underline">
                          {project?.title || "Research Project"}
                        </Link>
                        <Badge tone={app.status === "accepted" ? "green" : app.status === "rejected" ? "red" : "amber"}>
                          {app.status === "pending" ? "Under Review" : app.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-500">
                        Target Role: <strong>{role?.name || "Collaborator"}</strong> • Applied on {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.status === "accepted" && (
                        <Link to={`/projects/${project?.id}/room`}>
                          <Button size="sm">Open Project Room</Button>
                        </Link>
                      )}
                      {app.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleWithdraw(app.id)}
                          className="text-red-700 hover:bg-red-50 text-xs"
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* AI Recommended Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold text-ink">AI Recommended Projects</h2>
              <Badge tone="navy"><Sparkles className="h-3 w-3 mr-1" /> Explainable Matching</Badge>
            </div>
            <p className="text-xs text-ink-500">
              Ranked based on your verified skills, research domains, role compatibility, and availability
            </p>
          </div>
          <Link to="/projects" className="text-xs font-semibold text-navy hover:underline flex items-center gap-1">
            View all projects <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {aiMatchingLoading && aiProjectRecommendations.length === 0 ? (
          <div className="rounded-2xl border border-navy-100 bg-navy-50/20 p-8 text-center space-y-3">
            <Loader2 className="h-7 w-7 animate-spin text-navy mx-auto" />
            <h4 className="font-serif font-bold text-ink text-base">AI is analyzing your project matches...</h4>
            <p className="text-xs text-ink-500 max-w-md mx-auto">
              Evaluating your technical skills, research interests, past projects, and experience against active campus initiatives.
            </p>
          </div>
        ) : aiProjectRecommendations.length === 0 ? (
          <p className="text-xs text-ink-400 col-span-3 text-center py-6">
            No recommendations yet — complete your profile or add more skills to improve matching.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {aiProjectRecommendations.slice(0, 3).map(({ project, analysis }) => (
              <div key={project.id} className="flex flex-col justify-between">
                <ProjectCard
                  project={project}
                  match={analysis.output_result.match_score}
                  viewer={profile}
                />
                <AiProjectExplanation analysis={analysis.output_result} defaultExpanded={false} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Recommended Collaborators */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold text-ink">Recommended Collaborators</h2>
              <Badge tone="brass">Network Discovery</Badge>
            </div>
            <p className="text-xs text-ink-500">
              Fellow student researchers and faculty members with complementary research expertise
            </p>
          </div>
          <Link to="/collaborators" className="text-xs font-semibold text-navy hover:underline flex items-center gap-1">
            Browse all researchers <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendedCollaborators.length === 0 ? (
            <p className="text-xs text-ink-400 col-span-3 text-center py-6">Add more skills and interests to see collaborator suggestions.</p>
          ) : (
            recommendedCollaborators.map(({ candidate, compatibilityScore, reason }) => (
              <PersonCard key={candidate.id} profile={candidate} score={compatibilityScore} reason={reason} />
            ))
          )}
        </div>
      </section>

      {/* Modals for Skills & Interests Management */}
      <Modal open={addSkillOpen} onClose={() => setAddSkillOpen(false)} title="Manage Technical Skills">
        <div className="space-y-6">
          {/* Current Skills List */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">
              Your Current Mapped Skills ({profile.skills.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {profile.skills.length === 0 ? (
                <p className="text-xs text-ink-400 italic">No skills added yet.</p>
              ) : (
                profile.skills.map((s) => (
                  <div key={s.skill} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-ink-100 bg-paper-50">
                    <span className="font-semibold text-xs text-ink">{s.skill}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={s.proficiency}
                        onChange={(e) => handleUpdateSkillProf(s.skill, e.target.value as Proficiency)}
                        className="text-[11px] rounded border border-ink-200 bg-white px-2 py-1 text-ink-700"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s.skill)}
                        className="p-1 text-ink-400 hover:text-red-600 rounded"
                        title="Remove skill"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add New Skill Form */}
          <form onSubmit={handleAddSkill} className="space-y-3 pt-3 border-t border-ink-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Add New Technical Skill
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Skill Name">
                <Input
                  required
                  placeholder="e.g., Python, React, PyTorch"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                />
              </Field>
              <Field label="Proficiency Level">
                <Select
                  value={newSkillProf}
                  onChange={(e) => setNewSkillProf(e.target.value as Proficiency)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setAddSkillOpen(false)}>
                Done
              </Button>
              <Button type="submit">+ Add to Profile</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal open={addInterestOpen} onClose={() => setAddInterestOpen(false)} title="Manage Research Interests">
        <div className="space-y-6">
          {/* Current Interests */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">
              Current Research Interests ({profile.interests.length})
            </h4>
            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 bg-paper-50 rounded-lg border border-ink-100">
              {profile.interests.length === 0 ? (
                <p className="text-xs text-ink-400 italic">No interests added yet.</p>
              ) : (
                profile.interests.map((int) => (
                  <span
                    key={int}
                    className="inline-flex items-center gap-1 rounded-full bg-brass-100 px-2.5 py-0.5 text-xs font-medium text-brass-900"
                  >
                    {int}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(int)}
                      className="hover:text-red-700"
                      title="Remove interest"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAddInterest} className="space-y-3 pt-3 border-t border-ink-100">
            <Field label="New Domain / Research Interest">
              <Input
                required
                placeholder="e.g., Computer Vision, Quantum Computing"
                value={newInterestName}
                onChange={(e) => setNewInterestName(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setAddInterestOpen(false)}>
                Done
              </Button>
              <Button type="submit">+ Add Interest</Button>
            </div>
          </form>
        </div>
      </Modal>

    </div>
  );
}
