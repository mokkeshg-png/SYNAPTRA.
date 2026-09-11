import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProfile,
  fetchProjects,
  saveProfile,
  inviteUser,
  fileReport,
} from "@/lib/supabase-db";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Progress } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import type { Profile as ProfileType, Project, ReportType, Proficiency } from "@/types";
import {
  Building2,
  GitBranch,
  Globe,
  Mail,
  Edit,
  ShieldCheck,
  Flag,
  Loader2,
  Award,
  BookOpen,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  Trash2,
  Plus,
  FileText,
  X,
} from "lucide-react";
import { SkillScorePanel } from "@/components/ai/SkillScorePanel";

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user, refresh } = useAuth();

  const targetUserId = id || user?.id;

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [department, setDepartment] = useState("");
  const [degreeProgram, setDegreeProgram] = useState("");
  const [academicYear, setAcademicYear] = useState<number | undefined>(undefined);
  const [graduationYear, setGraduationYear] = useState<number | undefined>(undefined);
  const [resumeUrl, setResumeUrl] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [availabilityHours, setAvailabilityHours] = useState(15);
  const [openToCollaboration, setOpenToCollaboration] = useState(true);
  const [openToMentoring, setOpenToMentoring] = useState(false);

  // Faculty specific edit fields
  const [designation, setDesignation] = useState("");
  const [researchExperience, setResearchExperience] = useState<number | undefined>(undefined);
  const [academicExperience, setAcademicExperience] = useState<number | undefined>(undefined);
  const [googleScholar, setGoogleScholar] = useState("");
  const [orcid, setOrcid] = useState("");
  const [researchgate, setResearchgate] = useState("");
  const [saving, setSaving] = useState(false);

  // Skill Modals
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState<Proficiency>("intermediate");

  // Interest Modal
  const [addInterestOpen, setAddInterestOpen] = useState(false);
  const [newInterestName, setNewInterestName] = useState("");

  // Past Project Modal
  const [addProjOpen, setAddProjOpen] = useState(false);
  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjYear, setNewProjYear] = useState<number>(new Date().getFullYear());

  // Internship Modal
  const [addInternOpen, setAddInternOpen] = useState(false);
  const [newInternOrg, setNewInternOrg] = useState("");
  const [newInternRole, setNewInternRole] = useState("");
  const [newInternDesc, setNewInternDesc] = useState("");

  // Certification Modal
  const [addCertOpen, setAddCertOpen] = useState(false);
  const [newCertName, setNewCertName] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");
  const [newCertYear, setNewCertYear] = useState<number>(new Date().getFullYear());

  // Publication Modal
  const [addPubOpen, setAddPubOpen] = useState(false);
  const [newPubTitle, setNewPubTitle] = useState("");
  const [newPubVenue, setNewPubVenue] = useState("");
  const [newPubYear, setNewPubYear] = useState<number>(new Date().getFullYear());
  const [newPubLink, setNewPubLink] = useState("");

  // Invite Modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Report Modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("fake_profile");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [prof, projs] = await Promise.all([
        fetchProfile(targetUserId!),
        user ? fetchProjects() : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setProfile(prof);
      if (user && projs) {
        setOwnedProjects(projs.filter((p) => p.ownerId === user.id && p.status === "open"));
      }
      if (prof) {
        setFullName(prof.fullName || "");
        setBio(prof.bio ?? "");
        setPhotoUrl(prof.photoUrl ?? "");
        setDepartment(prof.department ?? "");
        setDegreeProgram(prof.degreeProgram ?? "");
        setAcademicYear(prof.academicYear);
        setGraduationYear(prof.graduationYear);
        setResumeUrl(prof.resumeUrl ?? "");
        setGithubUsername(prof.githubUsername ?? "");
        setLinkedinUrl(prof.linkedinUrl ?? "");
        setPortfolioUrl(prof.portfolioUrl ?? "");
        setAvailabilityHours(prof.availabilityHours ?? 15);
        setOpenToCollaboration(prof.openToCollaboration ?? true);
        setOpenToMentoring(prof.openToMentoring ?? false);

        setDesignation(prof.designation ?? "");
        setResearchExperience(prof.researchExperience);
        setAcademicExperience(prof.academicExperience);
        setGoogleScholar(prof.googleScholar ?? "");
        setOrcid(prof.orcid ?? "");
        setResearchgate(prof.researchgate ?? "");
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, user]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  if (!profile) {
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
  const isFaculty = !!profile.designation || profile.role === "faculty";
  const uid = `${isFaculty ? "FAC" : "STU"}-${profile.userId.substring(0, 6).toUpperCase()}`;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updatePayload: Partial<ProfileType> = {
        fullName: fullName.trim() || profile.fullName,
        bio: bio.trim(),
        photoUrl: photoUrl.trim() || undefined,
        department: department.trim() || profile.department,
        degreeProgram: degreeProgram.trim() || undefined,
        academicYear: academicYear ? Number(academicYear) : undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        resumeUrl: resumeUrl.trim() || undefined,
        githubUsername: githubUsername.trim() || undefined,
        githubConnected: !!githubUsername.trim(),
        linkedinUrl: linkedinUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        availabilityHours: Number(availabilityHours),
        openToCollaboration,
        openToMentoring,
      };

      if (isFaculty) {
        updatePayload.designation = designation.trim() || undefined;
        updatePayload.researchExperience = researchExperience ? Number(researchExperience) : undefined;
        updatePayload.academicExperience = academicExperience ? Number(academicExperience) : undefined;
        updatePayload.googleScholar = googleScholar.trim() || undefined;
        updatePayload.orcid = orcid.trim() || undefined;
        updatePayload.researchgate = researchgate.trim() || undefined;
      }

      await saveProfile(user.id, updatePayload);
      await refresh();
      const updated = await fetchProfile(user.id);
      setProfile(updated);
      setEditOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Skill Handlers
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSkillName.trim()) return;
    if (profile.skills.some((s) => s.skill.toLowerCase() === newSkillName.trim().toLowerCase())) {
      alert("This skill is already listed on your profile.");
      return;
    }
    const updatedSkills = [...profile.skills, { skill: newSkillName.trim(), proficiency: newSkillProf }];
    await saveProfile(user.id, { skills: updatedSkills });
    setProfile({ ...profile, skills: updatedSkills });
    setNewSkillName("");
    setAddSkillOpen(false);
    refresh();
  };

  const handleRemoveSkill = async (skillName: string) => {
    if (!user) return;
    const updatedSkills = profile.skills.filter((s) => s.skill !== skillName);
    await saveProfile(user.id, { skills: updatedSkills });
    setProfile({ ...profile, skills: updatedSkills });
    refresh();
  };

  const handleUpdateProficiency = async (skillName: string, proficiency: Proficiency) => {
    if (!user) return;
    const updatedSkills = profile.skills.map((s) => (s.skill === skillName ? { ...s, proficiency } : s));
    await saveProfile(user.id, { skills: updatedSkills });
    setProfile({ ...profile, skills: updatedSkills });
    refresh();
  };

  // Interest Handlers
  const handleAddInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newInterestName.trim()) return;
    if (profile.interests.some((i) => i.toLowerCase() === newInterestName.trim().toLowerCase())) {
      alert("This interest is already listed.");
      return;
    }
    const updatedInterests = [...profile.interests, newInterestName.trim()];
    await saveProfile(user.id, { interests: updatedInterests });
    setProfile({ ...profile, interests: updatedInterests });
    setNewInterestName("");
    setAddInterestOpen(false);
    refresh();
  };

  const handleRemoveInterest = async (interest: string) => {
    if (!user) return;
    const updatedInterests = profile.interests.filter((i) => i !== interest);
    await saveProfile(user.id, { interests: updatedInterests });
    setProfile({ ...profile, interests: updatedInterests });
    refresh();
  };

  // Past Project Handlers
  const handleAddPastProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjTitle.trim()) return;
    const newProj = {
      id: `proj-${Date.now()}`,
      title: newProjTitle.trim(),
      description: newProjDesc.trim(),
      year: Number(newProjYear),
    };
    const updated = [...(profile.pastProjects || []), newProj];
    await saveProfile(user.id, { pastProjects: updated });
    setProfile({ ...profile, pastProjects: updated });
    setNewProjTitle("");
    setNewProjDesc("");
    setAddProjOpen(false);
    refresh();
  };

  const handleDeletePastProject = async (projId: string) => {
    if (!user) return;
    const updated = (profile.pastProjects || []).filter((p) => p.id !== projId);
    await saveProfile(user.id, { pastProjects: updated });
    setProfile({ ...profile, pastProjects: updated });
    refresh();
  };

  // Internship Handlers
  const handleAddInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newInternOrg.trim() || !newInternRole.trim()) return;
    const newIntern = {
      id: `intern-${Date.now()}`,
      organization: newInternOrg.trim(),
      role: newInternRole.trim(),
      description: newInternDesc.trim(),
    };
    const updated = [...(profile.internships || []), newIntern];
    await saveProfile(user.id, { internships: updated });
    setProfile({ ...profile, internships: updated });
    setNewInternOrg("");
    setNewInternRole("");
    setNewInternDesc("");
    setAddInternOpen(false);
    refresh();
  };

  const handleDeleteInternship = async (internId: string) => {
    if (!user) return;
    const updated = (profile.internships || []).filter((i) => i.id !== internId);
    await saveProfile(user.id, { internships: updated });
    setProfile({ ...profile, internships: updated });
    refresh();
  };

  // Certification Handlers
  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCertName.trim() || !newCertIssuer.trim()) return;
    const newCert = {
      id: `cert-${Date.now()}`,
      name: newCertName.trim(),
      issuer: newCertIssuer.trim(),
      year: Number(newCertYear),
    };
    const updated = [...(profile.certifications || []), newCert];
    await saveProfile(user.id, { certifications: updated });
    setProfile({ ...profile, certifications: updated });
    setNewCertName("");
    setNewCertIssuer("");
    setAddCertOpen(false);
    refresh();
  };

  const handleDeleteCertification = async (certId: string) => {
    if (!user) return;
    const updated = (profile.certifications || []).filter((c) => c.id !== certId);
    await saveProfile(user.id, { certifications: updated });
    setProfile({ ...profile, certifications: updated });
    refresh();
  };

  // Publication Handlers
  const handleAddPublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPubTitle.trim() || !newPubVenue.trim()) return;
    const newPub = {
      id: `pub-${Date.now()}`,
      title: newPubTitle.trim(),
      venue: newPubVenue.trim(),
      year: Number(newPubYear),
      link: newPubLink.trim() || undefined,
    };
    const updated = [...(profile.publications || []), newPub];
    await saveProfile(user.id, { publications: updated });
    setProfile({ ...profile, publications: updated });
    setNewPubTitle("");
    setNewPubVenue("");
    setNewPubLink("");
    setAddPubOpen(false);
    refresh();
  };

  const handleDeletePublication = async (pubId: string) => {
    if (!user) return;
    const updated = (profile.publications || []).filter((p) => p.id !== pubId);
    await saveProfile(user.id, { publications: updated });
    setProfile({ ...profile, publications: updated });
    refresh();
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProjectId) return;
    try {
      await inviteUser(user.id, selectedProjectId, profile.userId, undefined, inviteMsg);
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteOpen(false);
        setInviteSuccess(false);
        setInviteMsg("");
      }, 1500);
    } catch (err: any) {
      alert(err?.message || "Failed to send invitation");
    }
  };

  const handleReportUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await fileReport(user.id, "user", profile.userId, reportType, reportDetails);
      setReportSuccess(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportSuccess(false);
        setReportDetails("");
      }, 1500);
    } catch (err: any) {
      alert(err?.message || "Failed to submit report");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Profile Header Card */}
      <Card className="p-6 sm:p-8 relative overflow-hidden shadow-card">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-navy text-white font-serif font-bold text-3xl shadow-md overflow-hidden">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
              ) : (
                profile.fullName.charAt(0)
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">{profile.fullName}</h1>
                <Badge tone="green">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Institutional Verified
                </Badge>
                <Badge tone={isFaculty ? "brass" : "navy"}>
                  {isFaculty ? "FACULTY" : "STUDENT"}
                </Badge>
                <Badge tone="slate" className="font-mono text-[11px]">
                  ID: {uid}
                </Badge>
              </div>
              <p className="text-sm font-medium text-ink-700">
                {profile.designation ? `${profile.designation} • ` : ""}
                {profile.degreeProgram ? `${profile.degreeProgram} • ` : ""}
                {profile.department}
                {profile.academicYear ? ` (Year ${profile.academicYear})` : ""}
              </p>
              <p className="text-xs text-ink-500 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {profile.institution}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isSelf ? (
              <Button onClick={() => setEditOpen(true)} size="sm">
                <Edit className="h-4 w-4 mr-1" /> Edit Profile & Portfolio
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
                    <Mail className="h-4 w-4 mr-1" /> Invite to Project
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReportOpen(true)}
                  className="text-xs text-ink-400 hover:text-red-700"
                  title="Report Profile"
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {profile.bio && (
          <div className="mt-6 pt-6 border-t border-ink-100">
            <p className="text-sm text-ink-600 leading-relaxed max-w-3xl">{profile.bio}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-ink-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-ink-500">
          <div>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Weekly Availability
            </span>
            <strong className="text-ink text-sm">{profile.availabilityHours || 10} hrs/week</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Preferred Team Size
            </span>
            <strong className="text-ink text-sm">{profile.preferredTeamSize || 4} members</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Collaboration Status
            </span>
            <strong className="text-emerald-700 text-sm">
              {profile.openToCollaboration ? "Open to Projects ✓" : "Unavailable"}
            </strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-ink-400">
              Profile Completeness
            </span>
            <strong className="text-navy text-sm">{profile.profileCompleteness}%</strong>
          </div>
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Skills, Interests & External Links */}
        <div className="space-y-6">
          {/* Skills Management */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink">Technical Skills</h3>
                <span className="text-[11px] text-ink-400">{profile.skills.length} mapped skills</span>
              </div>
              {isSelf && (
                <Button size="sm" variant="outline" onClick={() => setAddSkillOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Skill
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {profile.skills.map((s) => (
                <div key={s.skill} className="space-y-1.5 p-2 rounded-lg bg-paper-50/50 border border-ink-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">{s.skill}</span>
                    <div className="flex items-center gap-1.5">
                      {isSelf ? (
                        <select
                          value={s.proficiency}
                          onChange={(e) => handleUpdateProficiency(s.skill, e.target.value as Proficiency)}
                          className="text-[10px] rounded border border-ink-200 bg-white px-1.5 py-0.5 text-ink-600 font-medium"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      ) : (
                        <span className="text-[11px] text-ink-500 uppercase tracking-wider capitalize font-medium">
                          {s.proficiency}
                        </span>
                      )}
                      {isSelf && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s.skill)}
                          className="p-1 text-ink-400 hover:text-red-600 rounded"
                          title="Remove skill"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Progress
                    value={s.proficiency === "advanced" ? 95 : s.proficiency === "intermediate" ? 65 : 35}
                  />
                </div>
              ))}
              {profile.skills.length === 0 && (
                <p className="text-xs text-ink-400 italic py-2">No skills added yet.</p>
              )}
            </div>
          </Card>

          {/* Research Interests */}
          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2">
              <h3 className="font-serif text-lg font-bold text-ink">Research Interests</h3>
              {isSelf && (
                <Button size="sm" variant="outline" onClick={() => setAddInterestOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.interests.map((int) => (
                <span
                  key={int}
                  className="inline-flex items-center gap-1 rounded-full bg-brass-100 px-2.5 py-0.5 text-xs font-medium text-brass-900"
                >
                  {int}
                  {isSelf && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(int)}
                      className="hover:text-red-700 ml-0.5"
                      title="Remove interest"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
              {profile.interests.length === 0 && (
                <p className="text-xs text-ink-400 italic">No interests added yet.</p>
              )}
            </div>
          </Card>

          {/* External Evidence, Links & Resume */}
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-ink border-b border-ink-100 pb-2">
              External Evidence & Links
            </h3>
            <div className="space-y-2.5 text-xs">
              {profile.resumeUrl ? (
                <div className="flex items-center justify-between rounded-lg border border-navy-200 bg-navy-50/50 p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-navy" />
                    <div>
                      <span className="font-semibold text-ink">Academic Resume</span>
                      <p className="text-[11px] text-ink-400 truncate max-w-[140px]">{profile.resumeUrl}</p>
                    </div>
                  </div>
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                  >
                    View Resume →
                  </a>
                </div>
              ) : (
                <div className="text-xs text-ink-400 italic">No resume linked yet</div>
              )}

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
                  className="flex items-center justify-between rounded-lg border border-ink-100 p-2.5 hover:bg-paper-50 text-navy"
                >
                  <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> LinkedIn Profile</span>
                  <span>→</span>
                </a>
              )}

              {profile.portfolioUrl && (
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-ink-100 p-2.5 hover:bg-paper-50 text-navy"
                >
                  <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Academic Portfolio</span>
                  <span>→</span>
                </a>
              )}

              {isFaculty && profile.googleScholar && (
                <a
                  href={profile.googleScholar}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-ink-100 p-2.5 hover:bg-paper-50 text-navy"
                >
                  <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> Google Scholar</span>
                  <span>→</span>
                </a>
              )}
            </div>
          </Card>

          {/* AI Skill Score Engine — own profile only */}
          {isSelf && user && (
            <SkillScorePanel userId={user.id} profile={profile} />
          )}
        </div>

        {/* Right column: Past Projects, Internships, Certifications, Publications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Past Projects */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2">
              <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-navy" />
                Past Projects & Technical Work ({profile.pastProjects?.length || 0})
              </h3>
              {isSelf && (
                <Button size="sm" variant="outline" onClick={() => setAddProjOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
                </Button>
              )}
            </div>

            {!profile.pastProjects?.length ? (
              <p className="text-xs text-ink-400 italic py-2">No previous project records added yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.pastProjects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-ink-100 bg-paper-50/60 p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-ink text-sm">{p.title}</h4>
                        {p.year && <span className="text-xs text-ink-400">({p.year})</span>}
                      </div>
                      {isSelf && (
                        <button
                          onClick={() => handleDeletePastProject(p.id)}
                          className="text-ink-400 hover:text-red-600 p-1"
                          title="Delete Project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-ink-600 leading-relaxed">{p.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Internships & Laboratory Experience */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2">
              <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                Internships & Laboratory Experience ({profile.internships?.length || 0})
              </h3>
              {isSelf && (
                <Button size="sm" variant="outline" onClick={() => setAddInternOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Experience
                </Button>
              )}
            </div>

            {!profile.internships?.length ? (
              <p className="text-xs text-ink-400 italic py-2">No internship or laboratory records entered yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.internships.map((i) => (
                  <div key={i.id} className="rounded-xl border border-ink-100 bg-paper-50/60 p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-serif font-bold text-ink text-sm">{i.role}</h4>
                        <p className="text-xs text-ink-500 font-medium">{i.organization}</p>
                      </div>
                      {isSelf && (
                        <button
                          onClick={() => handleDeleteInternship(i.id)}
                          className="text-ink-400 hover:text-red-600 p-1"
                          title="Delete Experience"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-ink-600 leading-relaxed">{i.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Certifications & Honors */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2">
              <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <Award className="h-5 w-5 text-gold" />
                Certifications & Honors ({profile.certifications?.length || 0})
              </h3>
              {isSelf && (
                <Button size="sm" variant="outline" onClick={() => setAddCertOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Certification
                </Button>
              )}
            </div>

            {!profile.certifications?.length ? (
              <p className="text-xs text-ink-400 italic py-2">No certifications added yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.certifications.map((c) => (
                  <div key={c.id} className="rounded-xl border border-ink-100 bg-paper-50/60 p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-serif font-bold text-ink text-sm">{c.name}</h4>
                        <p className="text-xs text-ink-500">Issuer: {c.issuer} {c.year ? `(${c.year})` : ""}</p>
                      </div>
                      {isSelf && (
                        <button
                          onClick={() => handleDeleteCertification(c.id)}
                          className="text-ink-400 hover:text-red-600 p-1"
                          title="Delete Certification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Academic Publications */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2">
              <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                Academic Publications ({profile.publications?.length || 0})
              </h3>
              {isSelf && (
                <Button size="sm" variant="outline" onClick={() => setAddPubOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Publication
                </Button>
              )}
            </div>

            {!profile.publications?.length ? (
              <p className="text-xs text-ink-400 italic py-2">No publication records entered yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.publications.map((pub) => (
                  <div key={pub.id} className="rounded-xl border border-ink-100 bg-paper-50/60 p-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-serif font-bold text-ink text-sm">{pub.title}</h4>
                        <span className="text-xs text-ink-400">{pub.year}</span>
                      </div>
                      {isSelf && (
                        <button
                          onClick={() => handleDeletePublication(pub.id)}
                          className="text-ink-400 hover:text-red-600 p-1"
                          title="Delete Publication"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-ink-500 italic">Published in: {pub.venue}</p>
                    {pub.link && (
                      <a
                        href={pub.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-navy hover:underline block pt-1"
                      >
                        View Publication DOI / Link →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Academic Profile & Portfolio">
        <form onSubmit={handleSaveProfile} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Profile Photo URL">
              <Input
                placeholder="https://..."
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Academic Bio / Research Mission">
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Summary of research focus, technical specialties, and project interests..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Department">
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
              />
            </Field>
            <Field label="Degree Program">
              <Input
                value={degreeProgram}
                onChange={(e) => setDegreeProgram(e.target.value)}
                placeholder="e.g. B.Tech CS / M.S. AI"
              />
            </Field>
            <Field label="Academic Year (1-5)">
              <Input
                type="number"
                min={1}
                max={6}
                value={academicYear ?? ""}
                onChange={(e) => setAcademicYear(e.target.value ? Number(e.target.value) : undefined)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Resume URL (PDF / Cloud Link)">
              <Input
                placeholder="https://drive.google.com/... or https://..."
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
              />
            </Field>
            <Field label="GitHub Username">
              <Input
                placeholder="e.g. torvalds"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="LinkedIn Profile URL">
              <Input
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </Field>
            <Field label="Portfolio / Website URL">
              <Input
                placeholder="https://myportfolio.dev"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </Field>
          </div>

          {isFaculty && (
            <div className="p-3 bg-paper-50 rounded-xl border border-ink-100 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-brass-800">
                Faculty & Mentorship Attributes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Academic Designation">
                  <Input
                    placeholder="e.g. Associate Professor, HOD"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </Field>
                <Field label="Research Experience (Years)">
                  <Input
                    type="number"
                    min={0}
                    value={researchExperience ?? ""}
                    onChange={(e) => setResearchExperience(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Google Scholar Profile">
                  <Input
                    placeholder="https://scholar.google.com/..."
                    value={googleScholar}
                    onChange={(e) => setGoogleScholar(e.target.value)}
                  />
                </Field>
                <Field label="ORCID / ResearchGate">
                  <Input
                    placeholder="0000-0002-..."
                    value={orcid}
                    onChange={(e) => setOrcid(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Weekly Availability (Hours)">
              <Input
                type="number"
                min={1}
                max={60}
                value={availabilityHours}
                onChange={(e) => setAvailabilityHours(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="space-y-2 pt-2 border-t border-ink-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-700">
              <input
                type="checkbox"
                checked={openToCollaboration}
                onChange={(e) => setOpenToCollaboration(e.target.checked)}
                className="rounded border-ink-300 text-navy focus:ring-navy"
              />
              <span>Open to receiving project invitations from campus collaborators</span>
            </label>
            {isFaculty && (
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

          <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
            <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Skill Modal */}
      <Modal open={addSkillOpen} onClose={() => setAddSkillOpen(false)} title="Add Technical Skill">
        <form onSubmit={handleAddSkill} className="space-y-4">
          <Field label="Skill Name">
            <Input
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. Python, PyTorch, React, Docker, Cybersecurity"
              required
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
            <Button type="submit">Add Skill</Button>
          </div>
        </form>
      </Modal>

      {/* Add Interest Modal */}
      <Modal open={addInterestOpen} onClose={() => setAddInterestOpen(false)} title="Add Research Interest">
        <form onSubmit={handleAddInterest} className="space-y-4">
          <Field label="Research Interest / Domain">
            <Input
              value={newInterestName}
              onChange={(e) => setNewInterestName(e.target.value)}
              placeholder="e.g. Generative AI, Robotics, Computer Vision"
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddInterestOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Interest</Button>
          </div>
        </form>
      </Modal>

      {/* Add Past Project Modal */}
      <Modal open={addProjOpen} onClose={() => setAddProjOpen(false)} title="Add Past Project Showcase">
        <form onSubmit={handleAddPastProject} className="space-y-4">
          <Field label="Project Title">
            <Input
              required
              placeholder="e.g. Distributed Database Engine"
              value={newProjTitle}
              onChange={(e) => setNewProjTitle(e.target.value)}
            />
          </Field>
          <Field label="Year">
            <Input
              type="number"
              min={2015}
              max={2030}
              value={newProjYear}
              onChange={(e) => setNewProjYear(Number(e.target.value))}
            />
          </Field>
          <Field label="Project Description & Technologies">
            <Textarea
              required
              placeholder="Describe what you built, architecture decisions, and technologies used..."
              value={newProjDesc}
              onChange={(e) => setNewProjDesc(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddProjOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Past Project</Button>
          </div>
        </form>
      </Modal>

      {/* Add Internship Modal */}
      <Modal open={addInternOpen} onClose={() => setAddInternOpen(false)} title="Add Internship / Lab Experience">
        <form onSubmit={handleAddInternship} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Organization / Lab">
              <Input
                required
                placeholder="e.g. IIT Kanpur Research Lab"
                value={newInternOrg}
                onChange={(e) => setNewInternOrg(e.target.value)}
              />
            </Field>
            <Field label="Role Title">
              <Input
                required
                placeholder="e.g. Machine Learning Research Intern"
                value={newInternRole}
                onChange={(e) => setNewInternRole(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Experience Description">
            <Textarea
              required
              placeholder="Detail your contributions, experimental setups, or papers assisted..."
              value={newInternDesc}
              onChange={(e) => setNewInternDesc(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddInternOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Experience</Button>
          </div>
        </form>
      </Modal>

      {/* Add Certification Modal */}
      <Modal open={addCertOpen} onClose={() => setAddCertOpen(false)} title="Add Academic Certification">
        <form onSubmit={handleAddCertification} className="space-y-4">
          <Field label="Certification Name">
            <Input
              required
              placeholder="e.g. AWS Certified Solutions Architect"
              value={newCertName}
              onChange={(e) => setNewCertName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Issuing Organization">
              <Input
                required
                placeholder="e.g. Amazon Web Services / Stanford Online"
                value={newCertIssuer}
                onChange={(e) => setNewCertIssuer(e.target.value)}
              />
            </Field>
            <Field label="Year">
              <Input
                type="number"
                min={2015}
                max={2030}
                value={newCertYear}
                onChange={(e) => setNewCertYear(Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddCertOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Certification</Button>
          </div>
        </form>
      </Modal>

      {/* Add Publication Modal */}
      <Modal open={addPubOpen} onClose={() => setAddPubOpen(false)} title="Add Academic Publication">
        <form onSubmit={handleAddPublication} className="space-y-4">
          <Field label="Paper Title">
            <Input
              required
              placeholder="e.g. Multimodal Vision Transformer for Crop Disease"
              value={newPubTitle}
              onChange={(e) => setNewPubTitle(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Publication Venue / Conference">
              <Input
                required
                placeholder="e.g. IEEE Access / CVPR Workshop"
                value={newPubVenue}
                onChange={(e) => setNewPubVenue(e.target.value)}
              />
            </Field>
            <Field label="Year">
              <Input
                type="number"
                min={2010}
                max={2030}
                value={newPubYear}
                onChange={(e) => setNewPubYear(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="DOI / Online Link (Optional)">
            <Input
              placeholder="https://doi.org/..."
              value={newPubLink}
              onChange={(e) => setNewPubLink(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddPubOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Publication</Button>
          </div>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title={`Invite ${profile.fullName} to Project`}>
        {inviteSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-serif font-bold text-ink">Invitation Sent!</h3>
            <p className="text-xs text-ink-500">The collaborator has received your project invitation.</p>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4">
            <Field label="Select Open Project">
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
              >
                {ownedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Invitation Note (Optional)">
              <Textarea
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                placeholder="Explain why their skills would be a great fit for this project..."
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send Invitation</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report Profile">
        {reportSuccess ? (
          <div className="py-8 text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-serif font-bold text-ink">Report Submitted</h3>
            <p className="text-xs text-ink-500">Our academic moderation team will review this report.</p>
          </div>
        ) : (
          <form onSubmit={handleReportUser} className="space-y-4">
            <Field label="Reason for Report">
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <option value="fake_profile">Fake / Inaccurate Profile</option>
                <option value="harassment">Harassment / Inappropriate Behavior</option>
                <option value="spam">Spam / Unrelated Content</option>
                <option value="inappropriate_content">Academic Misconduct / Plagiarism</option>
                <option value="other">Other Issue</option>
              </Select>
            </Field>
            <Field label="Details / Context">
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Please describe the issue in detail..."
                required
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
          </form>
        )}
      </Modal>
    </div>
  );
}
