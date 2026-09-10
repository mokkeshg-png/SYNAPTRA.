import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getState, reviewMentorship, withdrawApplication } from "@/lib/store";
import { recommendProjects, recommendCollaborators } from "@/lib/matching";
import { ProjectCard, PersonCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Progress } from "@/components/ui/Card";
import {
  Sparkles,
  Layers,
  FolderPlus,
  Users,
  GraduationCap,
  Building2,
  ArrowUpRight,
} from "lucide-react";

export function Dashboard() {
  const { user, profile, refresh } = useAuth();
  const state = getState();

  if (!user || !profile) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-ink-500">You must be signed in to access the Academic Dashboard.</p>
        <Link to="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  // Recommended Projects via matching engine
  const recommendedProjects = recommendProjects(profile, state.projects, []).slice(0, 3);
  // Recommended Collaborators
  const sharedIds = new Set<string>();
  const recommendedCollaborators = recommendCollaborators(profile, state.profiles, sharedIds).slice(0, 3);

  // Active Projects (where user is owner or accepted member)
  const userMemberships = state.members.filter(
    (m) => m.userId === user.id && m.status === "active"
  );
  const activeProjectIds = new Set([
    ...userMemberships.map((m) => m.projectId),
    ...state.projects.filter((p) => p.ownerId === user.id).map((p) => p.id),
  ]);
  const activeProjects = state.projects.filter((p) => activeProjectIds.has(p.id));

  // Pending applications submitted by the user
  const submittedApplications = state.joinRequests.filter(
    (jr) => jr.applicantId === user.id
  );

  // Received applications (for projects owned by user)
  const ownedProjectIds = new Set(
    state.projects.filter((p) => p.ownerId === user.id).map((p) => p.id)
  );
  const receivedApplications = state.joinRequests.filter(
    (jr) => ownedProjectIds.has(jr.projectId) && jr.status === "pending"
  );

  // Faculty specific: Mentorship requests
  const facultyMentorshipRequests = state.mentorshipRequests.filter(
    (mr) => mr.facultyId === user.id && mr.status === "pending"
  );

  const handleWithdraw = (reqId: string) => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      withdrawApplication(user.id, reqId);
      refresh();
    }
  };

  const handleMentorshipResponse = (reqId: string, accept: boolean) => {
    reviewMentorship(user.id, reqId, accept);
    refresh();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-ink-600">
              {user.role === "faculty" ? <Building2 className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
              {user.role === "faculty" ? "Faculty Workspace" : "Researcher Workspace"}
            </span>
            <span className="text-xs text-ink-400">• {profile.institution}</span>
          </div>

          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
            Welcome back, {profile.fullName}
          </h1>
          <p className="text-sm text-ink-500 max-w-2xl">
            {user.role === "faculty"
              ? "Guide student initiatives, review research mentorship requests, and track active laboratory collaborations."
              : "Discover research projects matching your skills, coordinate with team members, and track your applications."}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/projects/new">
            <Button className="shadow-sm">
              <FolderPlus className="h-4 w-4" /> Create Project
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="outline">
              <Sparkles className="h-4 w-4" /> Browse Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Completeness Alert (if under 100%) */}
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
              Adding your GitHub profile, past projects, or academic certifications boosts your compatibility scores for high-tier research projects.
            </p>
            <div className="w-full sm:w-64 pt-1">
              <Progress value={profile.profileCompleteness} />
            </div>
          </div>
          <Link to="/onboarding">
            <Button variant="secondary" size="sm" className="whitespace-nowrap">
              Complete Setup →
            </Button>
          </Link>
        </div>
      )}

      {/* Faculty Specific Mentorship Requests Section */}
      {user.role === "faculty" && facultyMentorshipRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold text-ink">
                Pending Mentorship Requests ({facultyMentorshipRequests.length})
              </h2>
              <Badge tone="amber">Action Needed</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facultyMentorshipRequests.map((req) => {
              const project = state.projects.find((p) => p.id === req.projectId);
              const owner = state.profiles.find((pr) => pr.userId === project?.ownerId);
              return (
                <Card key={req.id} className="p-4 space-y-3 border-amber-200 bg-amber-50/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-brass-700 uppercase tracking-wider">
                        {project?.domains[0] || "Research"}
                      </p>
                      <h4 className="font-serif font-bold text-ink text-base">
                        {project?.title}
                      </h4>
                      <p className="text-xs text-ink-500">Lead: {owner?.fullName || "Student Lead"}</p>
                    </div>
                    <Badge tone="slate">Direct Request</Badge>
                  </div>

                  <p className="text-xs text-ink-600 italic bg-white p-2.5 rounded border border-ink-100">
                    "{req.message}"
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMentorshipResponse(req.id, false)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMentorshipResponse(req.id, true)}
                    >
                      Accept Mentorship
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Owner Specific: Received Join Requests */}
      {receivedApplications.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold text-ink">
                Incoming Join Applications ({receivedApplications.length})
              </h2>
              <Badge tone="navy">Project Owner Review</Badge>
            </div>
            <span className="text-xs text-ink-400">Requires your decision</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receivedApplications.map((req) => {
              const project = state.projects.find((p) => p.id === req.projectId);
              const applicant = state.profiles.find((pr) => pr.userId === req.applicantId);
              const role = project?.roles.find((r) => r.id === req.selectedRoleId);
              return (
                <Card key={req.id} className="p-4 space-y-3 border-navy-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-serif font-bold text-ink text-base">
                        {applicant?.fullName}
                      </h4>
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
                      <Button size="sm" variant="outline">
                        Review in Project →
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Active Projects (Project Rooms) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">Active Project Workspaces</h2>
            <p className="text-xs text-ink-500">Projects where you are currently collaborating as an owner, member, or mentor</p>
          </div>
          <Link to="/projects/new">
            <Button size="sm" variant="outline">
              <FolderPlus className="h-4 w-4" /> Start New
            </Button>
          </Link>
        </div>

        {activeProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-paper-50 p-8 text-center space-y-3">
            <Layers className="h-8 w-8 text-ink-400 mx-auto" />
            <h3 className="font-serif font-bold text-ink">No Active Projects Yet</h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              Explore open academic research projects to join, or initiate your own project proposal to recruit researchers.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/projects">
                <Button size="sm">Explore Directory</Button>
              </Link>
              <Link to="/projects/new">
                <Button size="sm" variant="outline">Create Project</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((proj) => {
              const isOwner = proj.ownerId === user.id;
              const isMentor = state.members.some(
                (m) => m.projectId === proj.id && m.userId === user.id && m.systemRole === "mentor"
              );
              const membersCount = state.members.filter(
                (m) => m.projectId === proj.id && m.status === "active"
              ).length + 1; // + owner
              const tasks = state.tasks.filter((t) => t.projectId === proj.id);
              const completedTasks = tasks.filter((t) => t.status === "completed").length;
              const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

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

                    <p className="text-xs text-ink-500 line-clamp-2">
                      {proj.shortDescription}
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs text-ink-500">
                        <span>Milestone Progress</span>
                        <span>{taskProgress}%</span>
                      </div>
                      <Progress value={taskProgress} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-400 pt-2 border-t border-ink-50">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {membersCount} collaborators
                      </span>
                      <span>{tasks.length} tasks recorded</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-ink-100 flex gap-2">
                    <Link to={`/projects/${proj.id}/room`} className="flex-1">
                      <Button className="w-full text-xs" size="sm">
                        Enter Project Room →
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Submitted Applications Feed */}
      {submittedApplications.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold text-ink">
            Your Submitted Applications ({submittedApplications.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
            <div className="divide-y divide-ink-100">
              {submittedApplications.map((app) => {
                const project = state.projects.find((p) => p.id === app.projectId);
                const role = project?.roles.find((r) => r.id === app.selectedRoleId);
                return (
                  <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/projects/${project?.id}`} className="font-semibold text-sm text-ink hover:underline">
                          {project?.title || "Research Project"}
                        </Link>
                        <Badge
                          tone={
                            app.status === "accepted"
                              ? "green"
                              : app.status === "rejected"
                              ? "red"
                              : "amber"
                          }
                        >
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
              <Badge tone="navy">
                <Sparkles className="h-3 w-3 mr-1" /> Explainable Matching
              </Badge>
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
          {recommendedProjects.map(({ project, matchScore }) => (
            <ProjectCard key={project.id} project={project} match={matchScore} viewer={profile} />
          ))}
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
          {recommendedCollaborators.map(({ candidate, compatibilityScore, reason }) => (
            <PersonCard key={candidate.id} profile={candidate} score={compatibilityScore} reason={reason} />
          ))}
        </div>
      </section>
    </div>
  );
}
