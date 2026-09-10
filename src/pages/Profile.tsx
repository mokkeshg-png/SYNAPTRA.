import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getState, saveProfile, inviteUser, fileReport } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Progress } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import type { ReportType } from "@/types";
import {
  Building2,
  GitBranch,
  Globe,
  Mail,
  Edit,
  ShieldCheck,
  Flag,
  Sparkles,
} from "lucide-react";

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user, refresh } = useAuth();
  const state = getState();

  // Find target profile
  const targetUserId = id || user?.id;
  const targetUser = state.users.find((u) => u.id === targetUserId);
  const profile = state.profiles.find((p) => p.userId === targetUserId);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [bio, setBio] = useState(profile?.bio || "");
  const [degreeProgram, setDegreeProgram] = useState(profile?.degreeProgram || "");
  const [availabilityHours, setAvailabilityHours] = useState(profile?.availabilityHours || 15);
  const [openToCollaboration, setOpenToCollaboration] = useState(profile?.openToCollaboration ?? true);
  const [openToMentoring, setOpenToMentoring] = useState(profile?.openToMentoring ?? false);

  // Invite Modal State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Report Modal State
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("fake_profile");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  if (!profile || !targetUser) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-ink">Researcher Profile Not Found</h2>
        <p className="text-sm text-ink-500">The requested user profile does not exist or has been removed.</p>
        <Link to="/collaborators">
          <Button variant="outline">Back to Directory</Button>
        </Link>
      </div>
    );
  }

  const isSelf = user?.id === profile.userId;
  const ownedProjects = user ? state.projects.filter((p) => p.ownerId === user.id && p.status === "open") : [];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    saveProfile(user.id, {
      bio,
      degreeProgram,
      availabilityHours: Number(availabilityHours),
      openToCollaboration,
      openToMentoring,
    });
    refresh();
    setEditOpen(false);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProjectId) return;
    inviteUser(user.id, selectedProjectId, profile.userId, undefined, inviteMsg);
    refresh();
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteOpen(false);
      setInviteSuccess(false);
      setInviteMsg("");
    }, 1500);
  };

  const handleReportUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    fileReport(user.id, "user", profile.userId, reportType, reportDetails);
    setReportSuccess(true);
    setTimeout(() => {
      setReportOpen(false);
      setReportSuccess(false);
      setReportDetails("");
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Profile Academic Header Card */}
      <Card className="p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-navy text-white font-serif font-bold text-3xl shadow-md">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                profile.fullName.charAt(0)
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                  {profile.fullName}
                </h1>
                {targetUser.emailVerified && (
                  <Badge tone="green">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Institutional Verified
                  </Badge>
                )}
                <Badge tone={targetUser.role === "faculty" ? "brass" : "navy"}>
                  {targetUser.role.toUpperCase()}
                </Badge>
              </div>

              <p className="text-sm font-medium text-ink-700">
                {profile.designation ? `${profile.designation} • ` : ""}
                {profile.degreeProgram ? `${profile.degreeProgram} • ` : ""}
                {profile.department}
              </p>

              <p className="text-xs text-ink-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {profile.institution}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isSelf ? (
              <Button onClick={() => setEditOpen(true)} size="sm">
                <Edit className="h-4 w-4" /> Edit Profile
              </Button>
            ) : (
              <>
                {ownedProjects.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedProjectId(ownedProjects[0]?.id || "");
                      setInviteOpen(true);
                    }}
                  >
                    <Mail className="h-4 w-4" /> Invite to Project
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReportOpen(true)}
                  className="text-xs text-ink-400 hover:text-red-700"
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mt-6 pt-6 border-t border-ink-100">
            <p className="text-sm text-ink-600 leading-relaxed max-w-3xl">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Key Quick Indicators */}
        <div className="mt-6 pt-4 border-t border-ink-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-ink-500">
          <div>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-ink-400">Weekly Availability</span>
            <strong className="text-ink text-sm">{profile.availabilityHours || 10} hrs/week</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-ink-400">Preferred Team Size</span>
            <strong className="text-ink text-sm">{profile.preferredTeamSize || 4} members</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-ink-400">Collaboration Status</span>
            <strong className="text-emerald-700 text-sm">
              {profile.openToCollaboration ? "Open to Projects ✓" : "Unavailable"}
            </strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-ink-400">Profile Completeness</span>
            <strong className="text-navy text-sm">{profile.profileCompleteness}%</strong>
          </div>
        </div>
      </Card>

      {/* Two Column Layout: Skills & Evidence vs. Experience */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (1/3): Skills, Interests & External Repos */}
        <div className="space-y-6">
          {/* Skills & AI Confidence Indicator */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2">
              <h3 className="font-serif text-lg font-bold text-ink">Technical Skills</h3>
              <Badge tone="navy">
                <Sparkles className="h-3 w-3 mr-1" /> Evidence-Assessed
              </Badge>
            </div>

            <div className="space-y-2.5">
              {profile.skills.map((s) => (
                <div key={s.skill} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-ink">{s.skill}</span>
                    <span className="text-[11px] text-ink-500 uppercase tracking-wider capitalize">
                      {s.proficiency}
                    </span>
                  </div>
                  <Progress
                    value={
                      s.proficiency === "advanced" ? 95 : s.proficiency === "intermediate" ? 65 : 35
                    }
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Research Domains & Interests */}
          <Card className="p-6 space-y-3">
            <h3 className="font-serif text-lg font-bold text-ink">Research Interests</h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((int) => (
                <Badge key={int} tone="brass">
                  {int}
                </Badge>
              ))}
            </div>
          </Card>

          {/* GitHub & External Profiles */}
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-ink">External Evidence & Links</h3>
            <div className="space-y-2 text-xs">
              {profile.githubUsername ? (
                <div className="flex items-center justify-between rounded-lg border border-ink-100 bg-paper-50 p-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-ink-600" />
                    <div>
                      <span className="font-semibold text-ink">GitHub Connected</span>
                      <p className="text-[11px] text-ink-400">@{profile.githubUsername}</p>
                    </div>
                  </div>
                  <Badge tone="green">Verified Audit</Badge>
                </div>
              ) : (
                <div className="text-xs text-ink-400 italic">No GitHub account linked</div>
              )}

              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-ink-100 p-2.5 hover:bg-paper-50 text-navy"
                >
                  <Globe className="h-3.5 w-3.5" /> LinkedIn Profile
                </a>
              )}

              {profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-ink-100 p-2.5 hover:bg-paper-50 text-navy"
                >
                  <Globe className="h-3.5 w-3.5" /> Academic Portfolio
                </a>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column (2/3): Experience, Past Projects, Publications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Past Projects */}
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl font-bold text-ink">
              Past Projects & Technical Work ({profile.pastProjects?.length || 0})
            </h3>
            {!profile.pastProjects?.length ? (
              <p className="text-xs text-ink-400 italic">No previous project records added yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.pastProjects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-ink-100 bg-paper-50/60 p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-serif font-bold text-ink text-sm">{p.title}</h4>
                      {p.year && <span className="text-xs text-ink-400">{p.year}</span>}
                    </div>
                    <p className="text-xs text-ink-600 leading-relaxed">{p.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Research Internships & Lab Work */}
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl font-bold text-ink">
              Internships & Laboratory Experience ({profile.internships?.length || 0})
            </h3>
            {!profile.internships?.length ? (
              <p className="text-xs text-ink-400 italic">No internship records entered yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.internships.map((i) => (
                  <div key={i.id} className="rounded-xl border border-ink-100 bg-paper-50/60 p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-serif font-bold text-ink text-sm">{i.role}</h4>
                        <p className="text-xs text-ink-500">{i.organization}</p>
                      </div>
                    </div>
                    <p className="text-xs text-ink-600 leading-relaxed">{i.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Publications */}
          {profile.publications && profile.publications.length > 0 && (
            <Card className="p-6 space-y-4">
              <h3 className="font-serif text-xl font-bold text-ink">
                Academic Publications ({profile.publications.length})
              </h3>
              <div className="space-y-3">
                {profile.publications.map((pub) => (
                  <div key={pub.id} className="rounded-xl border border-ink-100 bg-paper-50/60 p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-serif font-bold text-ink text-sm">{pub.title}</h4>
                      <span className="text-xs text-ink-400">{pub.year}</span>
                    </div>
                    <p className="text-xs text-ink-500 italic">Published in: {pub.venue}</p>
                    {pub.link && (
                      <a href={pub.link} target="_blank" rel="noreferrer" className="text-xs text-navy hover:underline block pt-1">
                        View Publication DOI / Link →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Academic Profile"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Field label="Academic Bio / Research Mission">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Summary of research focus and background..."
            />
          </Field>

          <Field label="Degree Program">
            <Input
              value={degreeProgram}
              onChange={(e) => setDegreeProgram(e.target.value)}
              placeholder="e.g. B.Tech Computer Science"
            />
          </Field>

          <Field label="Weekly Availability (Hours)">
            <Input
              type="number"
              min={1}
              max={60}
              value={availabilityHours}
              onChange={(e) => setAvailabilityHours(Number(e.target.value))}
            />
          </Field>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-700">
              <input
                type="checkbox"
                checked={openToCollaboration}
                onChange={(e) => setOpenToCollaboration(e.target.checked)}
                className="rounded border-ink-300 text-navy focus:ring-navy"
              />
              <span>Open to receiving project invitations from collaborators</span>
            </label>

            {targetUser.role === "faculty" && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-700">
                <input
                  type="checkbox"
                  checked={openToMentoring}
                  onChange={(e) => setOpenToMentoring(e.target.checked)}
                  className="rounded border-ink-300 text-navy focus:ring-navy"
                />
                <span>Open to advising and mentoring student research projects</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={`Invite ${profile.fullName} to Research Project`}
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          {inviteSuccess ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 text-center">
              Invitation dispatched! The researcher will receive an in-app notification.
            </div>
          ) : (
            <>
              <Field label="Select Target Project">
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {ownedProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Invitation Note">
                <Input
                  placeholder="e.g. We saw your computer vision background and would love to collaborate."
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Send Invitation
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report Profile"
      >
        <form onSubmit={handleReportUser} className="space-y-4">
          {reportSuccess ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200 text-center">
              Report received and queued for administrative review.
            </div>
          ) : (
            <>
              <Field label="Reason">
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                >
                  <option value="fake_profile">Fake Profile / Misrepresented Identity</option>
                  <option value="spam">Spam or Solicitation</option>
                  <option value="harassment">Harassment / Abusive Behavior</option>
                  <option value="other">Other Violation</option>
                </Select>
              </Field>

              <Field label="Details">
                <Textarea
                  required
                  placeholder="Explain the reason for reporting..."
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
