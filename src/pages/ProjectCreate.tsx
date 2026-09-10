import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createProject, newRole } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { RESEARCH_DOMAINS, ALL_SKILLS } from "@/lib/taxonomies";
import {
  PROJECT_TYPES,
  ROLE_TEMPLATES,
  type ProjectType,
  type Difficulty,
  type ProjectVisibility,
  type ProjectRole,
} from "@/types";
import {
  FolderPlus,
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";

export function ProjectCreate() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [objectives, setObjectives] = useState<string[]>([
    "Formulate core hypothesis and review literature",
    "Develop baseline prototype and benchmark performance",
  ]);
  const [newObjective, setNewObjective] = useState("");

  const [domains, setDomains] = useState<string[]>(["Artificial Intelligence"]);
  const [interests] = useState<string[]>(["Deep Learning", "Computer Vision"]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>(["Python", "PyTorch"]);

  // Roles configuration
  const [roles, setRoles] = useState<ProjectRole[]>([
    newRole({
      name: "Machine Learning Engineer",
      description: "Builds and evaluates model architectures and datasets.",
      requiredSkills: ["Python", "PyTorch"],
      openings: 1,
    }),
    newRole({
      name: "Research Writer",
      description: "Drafts academic paper sections, methodology, and citations.",
      requiredSkills: ["Technical Writing", "LaTeX"],
      openings: 1,
    }),
  ]);

  const [teamMin, setTeamMin] = useState(2);
  const [teamMax, setTeamMax] = useState(5);
  const [duration, setDuration] = useState("3 months");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [type, setType] = useState<ProjectType>("Research Project");
  const [visibility, setVisibility] = useState<ProjectVisibility>("public");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [expectedOutcomes, setExpectedOutcomes] = useState("Publication draft / Conference submission");
  const [mentorRequired, setMentorRequired] = useState(true);
  const [githubRequired, setGithubRequired] = useState(false);
  const [tagsInput, setTagsInput] = useState("research, deep-learning, paper");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-sm text-ink-500">You must be logged in to create a project proposal.</p>
        <Button onClick={() => navigate("/login")}>Sign In</Button>
      </div>
    );
  }

  // Objective helpers
  const addObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives([...objectives, newObjective.trim()]);
    setNewObjective("");
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  // Role helpers
  const addCustomRole = () => {
    setRoles([
      ...roles,
      newRole({
        name: "Collaborator",
        description: "Contributes to implementation and evaluation.",
        openings: 1,
      }),
    ]);
  };

  const addTemplateRole = (templateName: string) => {
    const t = ROLE_TEMPLATES.find((r) => r.name === templateName);
    if (!t) return;
    setRoles([
      ...roles,
      newRole({
        name: t.name,
        description: t.description,
        openings: 1,
      }),
    ]);
  };

  const updateRole = (id: string, patch: Partial<ProjectRole>) => {
    setRoles(roles.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRole = (id: string) => {
    setRoles(roles.filter((r) => r.id !== id));
  };

  const toggleDomain = (domain: string) => {
    setDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const toggleSkill = (skill: string) => {
    setRequiredSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate per PRD 18.1
    if (title.trim().length < 5) {
      setError("Project title must be at least 5 characters long.");
      return;
    }
    if (shortDescription.trim().length < 20) {
      setError("Short description must be at least 20 characters long.");
      return;
    }
    if (domains.length === 0) {
      setError("Please select at least 1 research domain.");
      return;
    }
    if (requiredSkills.length === 0) {
      setError("Please specify at least 1 required technical skill.");
      return;
    }
    if (roles.length === 0) {
      setError("Please define at least 1 open role for the team.");
      return;
    }

    setLoading(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = createProject(user.id, {
        title,
        shortDescription,
        detailedDescription,
        problemStatement,
        objectives,
        domains,
        interests,
        requiredSkills,
        roles,
        teamMin: Number(teamMin),
        teamMax: Number(teamMax),
        duration,
        difficulty,
        type,
        visibility,
        deadline,
        expectedOutcomes,
        mentorRequired,
        githubRequired,
        tags,
      });

      refresh();
      navigate(`/projects/${created.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create project");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800 mb-2">
          <FolderPlus className="h-3.5 w-3.5 text-navy-600" />
          <span>New Research Proposal • Master Specification PRD</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">Publish Research Project</h1>
        <p className="mt-1 text-sm text-ink-500">
          Define your project scope, domain taxonomy, required team roles, and criteria to enable automated AI candidate matching.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Overview */}
        <Card className="p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-ink border-b border-ink-100 pb-2">
            1. Core Project Information
          </h2>

          <Field label="Project Title (5-150 characters)" hint="Clear academic or technical title">
            <Input
              required
              placeholder="e.g. AI-Based Early Plant Disease Detection using Multimodal Vision"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label="Short Description (for cards and discovery)" hint="Summary shown in directories (50-300 characters)">
            <Textarea
              required
              className="min-h-[80px]"
              placeholder="A brief overview of the project objectives, technologies, and target outcomes..."
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />
          </Field>

          <Field label="Detailed Description & Scope" hint="Comprehensive explanation for prospective team members">
            <Textarea
              required
              className="min-h-[140px]"
              placeholder="Describe background context, dataset requirements, planned methodology, and architectural roadmap..."
              value={detailedDescription}
              onChange={(e) => setDetailedDescription(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Problem Statement (Optional)">
              <Input
                placeholder="What critical academic or real-world problem does this address?"
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
              />
            </Field>

            <Field label="Expected Deliverable / Outcome">
              <Input
                placeholder="e.g. Research paper, IEEE publication, working prototype"
                value={expectedOutcomes}
                onChange={(e) => setExpectedOutcomes(e.target.value)}
              />
            </Field>
          </div>

          {/* Objectives */}
          <div className="space-y-2 pt-2">
            <label className="block text-sm font-medium text-ink-800">Key Project Objectives</label>
            <div className="space-y-2">
              {objectives.map((obj, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-ink-100 bg-paper-50 px-3 py-2 text-xs text-ink-700">
                  <span>{i + 1}. {obj}</span>
                  <button type="button" onClick={() => removeObjective(i)} className="text-ink-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add specific objective (e.g. Conduct ablation studies)"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={addObjective}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Taxonomy & Classification */}
        <Card className="p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-ink border-b border-ink-100 pb-2">
            2. Research Domains & Technical Skills
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Project Classification">
              <Select value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>

            <Field label="Difficulty Level">
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                <option value="beginner">Beginner (Undergrad / Intro)</option>
                <option value="intermediate">Intermediate (Standard Lab)</option>
                <option value="advanced">Advanced (Doctoral / High Rigor)</option>
              </Select>
            </Field>

            <Field label="Target Duration">
              <Input
                placeholder="e.g. 3 months, 1 Semester"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
          </div>

          {/* Research Domains picker */}
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">
              Primary Research Domains ({domains.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RESEARCH_DOMAINS.map((d) => {
                const sel = domains.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDomain(d)}
                    className={`rounded-full px-2.5 py-1 text-xs transition ${
                      sel ? "bg-navy text-white font-medium" : "border border-ink-200 bg-white text-ink-700 hover:bg-paper-100"
                    }`}
                  >
                    {sel ? `✓ ${d}` : `+ ${d}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Required Skills picker */}
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1.5">
              Required Technical Skills ({requiredSkills.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SKILLS.map((s: string) => {
                const sel = requiredSkills.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`rounded-full px-2.5 py-1 text-xs transition ${
                      sel ? "bg-brass text-white font-medium" : "border border-ink-200 bg-white text-ink-700 hover:bg-paper-100"
                    }`}
                  >
                    {sel ? `✓ ${s}` : `+ ${s}`}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Project Tags (Comma separated)">
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. PyTorch, CNN, PlantVillage, Vision"
            />
          </Field>
        </Card>

        {/* Section 3: Roles & Team Composition */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-ink-100 pb-2 gap-2">
            <div>
              <h2 className="font-serif text-lg font-bold text-ink">
                3. Team Roles & Open Positions
              </h2>
              <p className="text-xs text-ink-500">
                Define the specific roles applicants can apply for with required competencies
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomRole}>
              <Plus className="h-3.5 w-3.5" /> Add Custom Role
            </Button>
          </div>

          {/* Quick template adder */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
              Add Standard Role Template:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => addTemplateRole(tpl.name)}
                  className="rounded-lg border border-ink-200 bg-paper-50 px-2.5 py-1 text-xs text-ink-700 hover:bg-navy-50 hover:border-navy"
                >
                  + {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Defined roles list */}
          <div className="space-y-3 pt-2">
            {roles.map((role) => (
              <div key={role.id} className="rounded-xl border border-ink-200 bg-paper-50/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <Field label="Role Name">
                      <Input
                        value={role.name}
                        onChange={(e) => updateRole(role.id, { name: e.target.value })}
                      />
                    </Field>
                    <Field label="Open Positions">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={role.openings}
                        onChange={(e) => updateRole(role.id, { openings: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRole(role.id)}
                    className="mt-6 text-ink-400 hover:text-red-600 p-1"
                    title="Remove Role"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Field label="Role Description / Expectations">
                  <Input
                    value={role.description}
                    onChange={(e) => updateRole(role.id, { description: e.target.value })}
                  />
                </Field>
              </div>
            ))}
          </div>

          {/* Team limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Field label="Minimum Team Size">
              <Input
                type="number"
                min={1}
                max={15}
                value={teamMin}
                onChange={(e) => setTeamMin(Number(e.target.value))}
              />
            </Field>
            <Field label="Maximum Team Size">
              <Input
                type="number"
                min={1}
                max={20}
                value={teamMax}
                onChange={(e) => setTeamMax(Number(e.target.value))}
              />
            </Field>
          </div>
        </Card>

        {/* Section 4: Governance, Privacy & Deadlines */}
        <Card className="p-6 space-y-4">
          <h2 className="font-serif text-lg font-bold text-ink border-b border-ink-100 pb-2">
            4. Governance, Deadlines & Privacy
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Project Visibility Mode" hint="Governs discovery and details access">
              <Select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as ProjectVisibility)}
              >
                <option value="public">Public (Fully visible in directory)</option>
                <option value="restricted">Restricted (Teaser visible, requires approval for full details)</option>
                <option value="private">Private (Invite only, hidden from directory)</option>
              </Select>
            </Field>

            <Field label="Application Deadline">
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-ink-700">
              <input
                type="checkbox"
                checked={mentorRequired}
                onChange={(e) => setMentorRequired(e.target.checked)}
                className="rounded border-ink-300 text-navy focus:ring-navy"
              />
              <span>
                <strong>Faculty Mentor Required:</strong> Open this project for university faculty mentorship requests and guidance.
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-ink-700">
              <input
                type="checkbox"
                checked={githubRequired}
                onChange={(e) => setGithubRequired(e.target.checked)}
                className="rounded border-ink-300 text-navy focus:ring-navy"
              />
              <span>
                <strong>GitHub Connection Required:</strong> Applicants must have a connected GitHub account for evidence-based evaluation.
              </span>
            </label>
          </div>
        </Card>

        {/* Submission */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate("/projects")}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} size="lg">
            Publish Research Project Proposal →
          </Button>
        </div>
      </form>
    </div>
  );
}
