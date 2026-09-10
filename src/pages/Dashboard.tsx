
import { saveProfile } from "@/lib/supabase-db";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProjects,
  fetchProjectMembers,
  fetchJoinRequests,
  fetchMentorshipRequests,
  reviewMentorship,
  withdrawApplication,
  fetchAllProfiles,
} from "@/lib/supabase-db";
import { recommendProjects, recommendCollaborators } from "@/lib/matching";
import { ProjectCard, PersonCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Progress } from "@/components/ui/Card";
import type { Project, ProjectMember, JoinRequest, MentorshipRequest, Profile, Proficiency } from "@/types";
import {
  Sparkles,
  Layers,
  FolderPlus,
  Users,
  GraduationCap,
  Building2,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

export function Dashboard() {
  const { user, profile, refresh } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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

        const allMembers: ProjectMember[] = [];
        const allReceivedJrs: JoinRequest[] = [];

        await Promise.all(
          [...connectedProjectIds].map(async (pid) => {
            const [ms, pjrs] = await Promise.all([
              fetchProjectMembers(pid),
              ownedProjectIds.has(pid) ? fetchJoinRequests(pid) : Promise.resolve([]),
            ]);
            allMembers.push(...ms);
            allReceivedJrs.push(...pjrs);
          })
        );

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

  // Derived state
  const userMemberships = members.filter((m) => m.userId === user.id && m.status === "active");
  const activeProjectIds = new Set([
    ...userMemberships.map((m) => m.projectId),
    ...projects.filter((p) => p.ownerId === user.id).map((p) => p.id),
  ]);
  const activeProjects = projects.filter((p) => activeProjectIds.has(p.id));

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

  // AI recommendations
  const recommendedProjects = recommendProjects(profile, projects, [...activeProjectIds]).slice(0, 3);
  const sharedIds = new Set<string>(
    members.filter((m) => activeProjectIds.has(m.projectId)).map((m) => m.userId)
  );
  const recommendedCollaborators = recommendCollaborators(
    profile,
    allProfiles.filter((p) => p.userId !== user.id),
    sharedIds
  ).slice(0, 3);

  // Task progress per project
  function getProjectStats(projectId: string) {
    const projectMembers = members.filter((m) => m.projectId === projectId && m.status === "active");
    return { membersCount: projectMembers.length + 1 };
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

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    saveProfile(user.id, {
      ...profile,
      skills: [...profile.skills, { skill: newSkillName.trim(), proficiency: newSkillProf }]
    });
    setNewSkillName("");
    setAddSkillOpen(false);
    refresh();
  };

  
  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterestName.trim()) return;
    saveProfile(user.id, {
      ...profile,
      interests: [...profile.interests, newInterestName.trim()]
    });
    setNewInterestName("");
    setAddInterestOpen(false);
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
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-ink">
              Incoming Join Applications ({receivedApplications.length})
            </h2>
            <Badge tone="navy">Project Owner Review</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receivedApplications.map((req) => {
              const project = projects.find((p) => p.id === req.projectId);
              const applicant = allProfiles.find((pr) => pr.userId === req.applicantId);
              const role = project?.roles.find((r) => r.id === req.selectedRoleId);
              return (
                <Card key={req.id} className="p-4 space-y-3 border-navy-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-serif font-bold text-ink text-base">{applicant?.fullName}</h4>
                      <p className="text-xs text-ink-500">
                        Applying for: <strong>{role?.name || "Member"}</strong> on <em>{project?.title}</em>
                      </p>
                    </div>
                    {req.analysis && (
                      <Badge tone="navy">{req.analysis.compatibilityScore}% AI Match</Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-600 line-clamp-2">
                    <strong>Motivation:</strong> {req.motivation}
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Link to={`/projects/${project?.id}`}>
                      <Button size="sm" variant="outline">Review in Project →</Button>
                    </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendedProjects.length === 0 ? (
            <p className="text-xs text-ink-400 col-span-3 text-center py-6">No recommendations yet — complete your profile to improve matching.</p>
          ) : (
            recommendedProjects.map(({ project, matchScore }) => (
              <ProjectCard key={project.id} project={project} match={matchScore} viewer={profile} />
            ))
          )}
        </div>
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

      {/* Modals for Skills & Interests */}
      <Modal open={addSkillOpen} onClose={() => setAddSkillOpen(false)} title="Add Technical Skill">
        <form onSubmit={handleAddSkill} className="space-y-4">
          <Field label="Skill Name">
            <Input
              required
              placeholder="e.g., Python, React, Data Analysis"
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddSkillOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Skill</Button>
          </div>
        </form>
      </Modal>

      <Modal open={addInterestOpen} onClose={() => setAddInterestOpen(false)} title="Add Research Interest">
        <form onSubmit={handleAddInterest} className="space-y-4">
          <Field label="Domain / Interest">
            <Input
              required
              placeholder="e.g., Machine Learning, Quantum Physics"
              value={newInterestName}
              onChange={(e) => setNewInterestName(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddInterestOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Interest</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
