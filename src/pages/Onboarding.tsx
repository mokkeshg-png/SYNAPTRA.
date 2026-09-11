import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { saveProfile, fetchSkillsFromDB, fetchResearchInterestsFromDB } from "@/lib/supabase-db";
import { computeCompleteness } from "@/lib/completeness";
import { Button } from "@/components/ui/Button";
import { Card, Badge, Progress } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";

import { ROLE_TEMPLATES, type Proficiency, type UserSkill, type PastProject, type Internship } from "@/types";
import {
  User,
  Wrench,
  BookOpen,
  Briefcase,
  GitBranch,
  Sliders,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export function Onboarding() {
  const { user, profile, refresh } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Form State
  const [bio, setBio] = useState(profile?.bio || "");
  const [degreeProgram, setDegreeProgram] = useState(profile?.degreeProgram || "");
  const [graduationYear, setGraduationYear] = useState<number>(profile?.graduationYear || 2026);
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || "");

  // Skills
  const [skills, setSkills] = useState<UserSkill[]>(
    profile?.skills?.length ? profile.skills : []
  );
  const [customSkillName, setCustomSkillName] = useState("");
  const [customSkillProf, setCustomSkillProf] = useState<Proficiency>("intermediate");

  // Interests
  const [interests, setInterests] = useState<string[]>(
    profile?.interests?.length ? profile.interests : []
  );
  const [customInterest, setCustomInterest] = useState("");

  // Experience
  const [pastProjects, setPastProjects] = useState<PastProject[]>(
    profile?.pastProjects || []
  );
  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");

  const [internships, setInternships] = useState<Internship[]>(
    profile?.internships || []
  );
  const [newInternOrg, setNewInternOrg] = useState("");
  const [newInternRole, setNewInternRole] = useState("");
  const [newInternDesc, setNewInternDesc] = useState("");

  // External Links
  const [githubUsername, setGithubUsername] = useState(profile?.githubUsername || "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl || "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolioUrl || "");

  // Preferences
  const [preferredRoles, setPreferredRoles] = useState<string[]>(
    profile?.preferredRoles || ["Machine Learning Engineer", "Researcher"]
  );
  const [availabilityHours, setAvailabilityHours] = useState<number>(
    profile?.availabilityHours || 15
  );
  const [preferredTeamSize, setPreferredTeamSize] = useState<number>(
    profile?.preferredTeamSize || 4
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchResearchInterestsFromDB().then((res) => { if (!cancelled) setAllDomains(res); });
    fetchSkillsFromDB().then((res) => { if (!cancelled) setAllSkills(res); });
    return () => { cancelled = true; };
  }, []);

  if (!user || !profile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-ink-500">Please sign in to access onboarding.</p>
      </div>
    );
  }

  // Calculate live completeness
  const previewProfile = {
    ...profile,
    bio,
    degreeProgram,
    graduationYear,
    photoUrl,
    skills,
    interests,
    pastProjects,
    internships,
    githubUsername,
    githubConnected: !!githubUsername,
    linkedinUrl,
    portfolioUrl,
    preferredRoles,
    availabilityHours,
    preferredTeamSize,
  };
  const completeness = computeCompleteness(previewProfile as any);

  // Handlers for Skills
  const addSkill = (name: string, prof: Proficiency) => {
    if (!name.trim()) return;
    if (skills.some((s) => s.skill.toLowerCase() === name.toLowerCase())) return;
    setSkills([...skills, { skill: name.trim(), proficiency: prof }]);
  };

  const removeSkill = (name: string) => {
    setSkills(skills.filter((s) => s.skill !== name));
  };

  // Handlers for Interests
  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  // Handlers for Projects
  const addProject = () => {
    if (!newProjTitle.trim()) return;
    setPastProjects([
      ...pastProjects,
      {
        id: `proj-${Date.now()}`,
        title: newProjTitle.trim(),
        description: newProjDesc.trim(),
        year: new Date().getFullYear(),
      },
    ]);
    setNewProjTitle("");
    setNewProjDesc("");
  };

  const removeProject = (id: string) => {
    setPastProjects(pastProjects.filter((p) => p.id !== id));
  };

  // Handlers for Internships
  const addInternship = () => {
    if (!newInternOrg.trim() || !newInternRole.trim()) return;
    setInternships([
      ...internships,
      {
        id: `intern-${Date.now()}`,
        organization: newInternOrg.trim(),
        role: newInternRole.trim(),
        description: newInternDesc.trim(),
      },
    ]);
    setNewInternOrg("");
    setNewInternRole("");
    setNewInternDesc("");
  };

  const removeInternship = (id: string) => {
    setInternships(internships.filter((i) => i.id !== id));
  };

  const handleNextOrFinish = async () => {
    setError(null);

    // Validation per step
    if (step === 2 && skills.length < 3) {
      setError("Please select at least 3 skills to enable accurate AI matching.");
      return;
    }
    if (step === 3 && interests.length < 2) {
      setError("Please select at least 2 research domains or interests.");
      return;
    }

    if (step < 6) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setSaving(true);
      try {
        await saveProfile(user.id, {
          bio,
          degreeProgram,
          graduationYear: Number(graduationYear),
          photoUrl,
          skills,
          interests,
          pastProjects,
          internships,
          githubUsername,
          githubConnected: !!githubUsername,
          linkedinUrl,
          portfolioUrl,
          preferredRoles,
          availabilityHours: Number(availabilityHours),
          preferredTeamSize: Number(preferredTeamSize),
        });
        await refresh();
        navigate("/dashboard");
      } catch (err: any) {
        setError(err?.message || "Failed to save profile");
        setSaving(false);
      }
    }
  };

  const steps = [
    { num: 1, label: "Basic Info", icon: User },
    { num: 2, label: "Skills (Min 3)", icon: Wrench },
    { num: 3, label: "Research Interests", icon: BookOpen },
    { num: 4, label: "Experience", icon: Briefcase },
    { num: 5, label: "External Links", icon: GitBranch },
    { num: 6, label: "Preferences", icon: Sliders },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-navy-600" />
          <span>Progressive Profile Setup • AI Skill Assessment</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">Academic Profile Onboarding</h1>
        <p className="mt-1 text-sm text-ink-500">
          Complete these steps to optimize your AI compatibility score and project recommendations
        </p>

        {/* Live completeness progress bar */}
        <div className="mt-6 max-w-md mx-auto">
          <div className="flex justify-between text-xs font-semibold text-ink-600 mb-1.5">
            <span>Profile Completeness</span>
            <span className="text-navy">{completeness}%</span>
          </div>
          <Progress value={completeness} />
        </div>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-6">
        {steps.map((s) => {
          const Icon = s.icon;
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex flex-col items-center rounded-xl p-2.5 text-center text-xs transition ${
                isCurrent
                  ? "border-2 border-navy bg-navy-50/50 font-bold text-navy"
                  : isDone
                  ? "border border-ink-200 bg-white text-emerald-800 font-medium"
                  : "border border-ink-100 bg-paper-50 text-ink-400"
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                {isDone ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span>Step {s.num}</span>
              </div>
              <span className="truncate max-w-[90px]">{s.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card className="shadow-card p-6 sm:p-8">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">Basic Academic Details</h2>
              <p className="text-xs text-ink-500">Provide an overview of your academic focus and biography</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <Input disabled value={profile.fullName} className="bg-paper-100 cursor-not-allowed" />
              </Field>
              <Field label="Institution">
                <Input disabled value={profile.institution} className="bg-paper-100 cursor-not-allowed" />
              </Field>
              <Field label="Department">
                <Input disabled value={profile.department} className="bg-paper-100 cursor-not-allowed" />
              </Field>
              <Field label="Degree Program">
                <Input
                  placeholder="e.g. B.Tech Computer Science, M.Sc Data Science"
                  value={degreeProgram}
                  onChange={(e) => setDegreeProgram(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Expected Graduation Year">
                <Input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(Number(e.target.value))}
                />
              </Field>
              <Field label="Profile Photo URL (Optional)">
                <Input
                  placeholder="https://example.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Academic Bio / Research Summary">
              <Textarea
                placeholder="Share a short bio summarizing your research background, technical interests, and goals..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* Step 2: Skills Taxonomy */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">Technical & Research Skills</h2>
              <p className="text-xs text-ink-500">Select at least 3 skills with your proficiency level</p>
            </div>

            {/* Currently selected skills list */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
                Your Configured Skills ({skills.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s.skill}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-navy-50/80 px-2.5 py-1 text-xs text-navy-800"
                  >
                    <strong>{s.skill}</strong>
                    <span className="text-[10px] text-navy-600 uppercase tracking-wider">({s.proficiency})</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(s.skill)}
                      className="text-navy-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Custom Skill Input */}
            <div className="rounded-xl border border-ink-100 bg-paper-50 p-4">
              <p className="text-xs font-semibold text-ink mb-2">Add Custom Skill</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="e.g. Docker, Next.js, Bioinformatics"
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)}
                  className="sm:flex-1"
                />
                <Select
                  value={customSkillProf}
                  onChange={(e) => setCustomSkillProf(e.target.value as Proficiency)}
                  className="sm:w-40"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    addSkill(customSkillName, customSkillProf);
                    setCustomSkillName("");
                  }}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>

            {/* Suggested Skills taxonomy */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
                Popular Academic Skills (Click to Add):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allSkills.map((skill: string) => {
                  const has = skills.some((s) => s.skill.toLowerCase() === skill.toLowerCase());
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => (has ? removeSkill(skill) : addSkill(skill, "intermediate"))}
                      className={`rounded-full px-2.5 py-1 text-xs transition ${
                        has
                          ? "bg-navy text-white font-medium"
                          : "border border-ink-200 bg-white text-ink-700 hover:bg-paper-100"
                      }`}
                    >
                      {has ? `✓ ${skill}` : `+ ${skill}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Research Interests */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">Research Domains & Interests</h2>
              <p className="text-xs text-ink-500">Pick at least 2 domains to match relevant research projects</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
                Selected Research Interests ({interests.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {interests.map((int) => (
                  <Badge key={int} tone="navy">
                    {int}
                    <button
                      type="button"
                      onClick={() => toggleInterest(int)}
                      className="ml-1 text-navy-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom Interest */}
            <div className="flex gap-2">
              <Input
                placeholder="Add custom research interest (e.g. Explainable AI, Quantum Computing)"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (customInterest.trim()) {
                    toggleInterest(customInterest.trim());
                    setCustomInterest("");
                  }
                }}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
                Academic Taxonomy Domains:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allDomains.map((domain) => {
                  const selected = interests.includes(domain);
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => toggleInterest(domain)}
                      className={`rounded-xl border p-3 text-left text-xs transition ${
                        selected
                          ? "border-navy bg-navy-50 font-bold text-navy"
                          : "border-ink-100 bg-white text-ink-700 hover:bg-paper-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{domain}</span>
                        {selected && <Check className="h-3.5 w-3.5 text-navy" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Experience */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">Past Projects & Experience</h2>
              <p className="text-xs text-ink-500">Provide verifiable academic evidence for the AI compatibility engine</p>
            </div>

            {/* Projects list */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Past Projects ({pastProjects.length})</h3>
              {pastProjects.map((p) => (
                <div key={p.id} className="flex items-start justify-between rounded-lg border border-ink-100 bg-paper-50 p-3">
                  <div>
                    <h4 className="text-xs font-bold text-ink">{p.title}</h4>
                    <p className="text-xs text-ink-500 mt-0.5">{p.description}</p>
                  </div>
                  <button onClick={() => removeProject(p.id)} className="text-ink-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <div className="rounded-xl border border-dashed border-ink-200 p-4 space-y-3">
                <Field label="Project Title">
                  <Input
                    placeholder="e.g. Autonomous Campus Navigation"
                    value={newProjTitle}
                    onChange={(e) => setNewProjTitle(e.target.value)}
                  />
                </Field>
                <Field label="Project Description">
                  <Input
                    placeholder="Built using ROS, Python and computer vision techniques"
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                  />
                </Field>
                <Button type="button" variant="outline" size="sm" onClick={addProject}>
                  <Plus className="h-3.5 w-3.5" /> Add Project Record
                </Button>
              </div>
            </div>

            {/* Internships list */}
            <div className="space-y-3 pt-4 border-t border-ink-100">
              <h3 className="text-sm font-semibold text-ink">Internships / Research Labs ({internships.length})</h3>
              {internships.map((i) => (
                <div key={i.id} className="flex items-start justify-between rounded-lg border border-ink-100 bg-paper-50 p-3">
                  <div>
                    <h4 className="text-xs font-bold text-ink">{i.role} at {i.organization}</h4>
                    <p className="text-xs text-ink-500 mt-0.5">{i.description}</p>
                  </div>
                  <button onClick={() => removeInternship(i.id)} className="text-ink-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <div className="rounded-xl border border-dashed border-ink-200 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Organization / Lab">
                    <Input
                      placeholder="e.g. DRDO Labs / Tech Innovation Center"
                      value={newInternOrg}
                      onChange={(e) => setNewInternOrg(e.target.value)}
                    />
                  </Field>
                  <Field label="Role Title">
                    <Input
                      placeholder="e.g. Research Intern"
                      value={newInternRole}
                      onChange={(e) => setNewInternRole(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Key Responsibilities">
                  <Input
                    placeholder="Implemented PyTorch models and evaluated validation accuracy"
                    value={newInternDesc}
                    onChange={(e) => setNewInternDesc(e.target.value)}
                  />
                </Field>
                <Button type="button" variant="outline" size="sm" onClick={addInternship}>
                  <Plus className="h-3.5 w-3.5" /> Add Internship Record
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: External Links */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">External Profiles & Repositories</h2>
              <p className="text-xs text-ink-500">Connecting GitHub enables evidence-based skill confidence ratings</p>
            </div>

            <Field label="GitHub Username" hint="Allows automatic repository indexing and commit analysis">
              <div className="relative">
                <Input
                  placeholder="e.g. rahulm"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="pl-9"
                />
                <GitBranch className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
              </div>
            </Field>

            <Field label="LinkedIn Profile URL">
              <Input
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </Field>

            <Field label="Portfolio / Personal Academic Website">
              <Input
                placeholder="https://rahulmehta.dev"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* Step 6: Preferences */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink">Collaboration Preferences</h2>
              <p className="text-xs text-ink-500">Configure team formation preferences and weekly availability</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
                Preferred Project Roles:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ROLE_TEMPLATES.map((roleObj) => {
                  const role = roleObj.name;
                  const selected = preferredRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setPreferredRoles(preferredRoles.filter((r) => r !== role));
                        } else {
                          setPreferredRoles([...preferredRoles, role]);
                        }
                      }}
                      className={`rounded-xl border p-2.5 text-xs text-left transition ${
                        selected
                          ? "border-navy bg-navy-50 font-bold text-navy"
                          : "border-ink-100 bg-white text-ink-700 hover:bg-paper-50"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Availability (Hours per Week)" hint="Typical academic dedication">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={availabilityHours}
                  onChange={(e) => setAvailabilityHours(Number(e.target.value))}
                />
              </Field>

              <Field label="Preferred Team Size">
                <Select
                  value={preferredTeamSize}
                  onChange={(e) => setPreferredTeamSize(Number(e.target.value))}
                >
                  <option value={2}>2 Members (Pair Collaboration)</option>
                  <option value={3}>3 Members (Small Team)</option>
                  <option value={4}>4 Members (Standard Academic)</option>
                  <option value={5}>5 Members (Hackathon / Interdisciplinary)</option>
                  <option value={6}>6+ Members (Large Lab)</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-ink-100">
          {step > 1 ? (
            <Button
              variant="outline"
              type="button"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous Step
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            onClick={handleNextOrFinish}
            loading={saving}
          >
            {step === 6 ? "Finish Onboarding & View Dashboard" : "Next Step"}
            {step < 6 && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
