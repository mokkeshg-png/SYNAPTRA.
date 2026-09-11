/**
 * skillScoreEngine.ts
 *
 * AI Student Skill Intelligence & Score Engine — pure client-side algorithmic module.
 *
 * PURPOSE:
 *   Analyzes all available evidence on a student's profile and produces a
 *   structured SkillScoreAnalysis: an overall score (0–100), a category
 *   breakdown, per-skill evidence confidence, strengths, improvement areas,
 *   and a narrative summary.
 *
 * DESIGN RULES:
 *   - Completely independent of the existing AI Chatbot (AiAssistant / matching.ts).
 *   - Does NOT modify, call, import from, or share state with the chatbot.
 *   - No API calls — pure deterministic calculation from existing profile data.
 *   - Score is evidence-based, NOT a simple count of skills.
 *   - Identical input always produces the same score (deterministic).
 *   - Score is always validated: 0 ≤ score ≤ 100.
 *   - Never invents evidence; only uses what is present on the Profile object.
 *   - Never labels unsupported skills as "fake" — uses evidence status vocabulary.
 *
 * SCORING FRAMEWORK (total max = 100):
 *   Skill Evidence        0–20   Proficiency depth + evidence density per skill
 *   Project Evidence      0–25   Past projects that corroborate claimed skills
 *   GitHub Evidence       0–20   GitHub connectivity + public repo count signal
 *   Experience Evidence   0–15   Internships with skill-matching descriptions
 *   Certification Evidence 0–10  Certifications relevant to claimed skills
 *   Consistency Score     0–5    Agreement across all evidence sources
 *   Publication Bonus     0–5    Academic publications as additional signal
 *
 * ENGINE VERSION: skill-engine-v1
 */

import type {
  Profile,
  SkillEvidenceItem,
  SkillEvidenceStatus,
  SkillScoreAnalysis,
  SkillScoreBreakdown,
} from "@/types";
import { SKILL_SCORE_DISCLAIMER } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SKILL_ENGINE_VERSION = "skill-engine-v1";

/** Maximum points available per scoring category */
const MAX = {
  skillEvidence: 20,
  projectEvidence: 25,
  githubEvidence: 20,
  experienceEvidence: 15,
  certificationEvidence: 10,
  consistencyScore: 5,
  publicationBonus: 5,
} as const;

/** Proficiency multipliers — advanced skills weighted more than beginner */
const PROFICIENCY_WEIGHT = {
  beginner: 0.5,
  intermediate: 0.75,
  advanced: 1.0,
} as const;

/** Min evidence confidence score (0–100) per status bucket */
const STATUS_CONFIDENCE_FLOOR = {
  SUPPORTED: 70,
  PARTIALLY_SUPPORTED: 40,
  UNVERIFIED: 10,
  INSUFFICIENT_EVIDENCE: 0,
} as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Clamp a number to [min, max] and round to nearest integer */
function clamp(value: number, min = 0, max = 100): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

/**
 * Case-insensitive test: does `haystack` contain `needle`?
 * Used for evidence text matching across projects, internships, etc.
 */
function textContains(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Recency multiplier based on the year a piece of evidence was recorded.
 * Recent evidence (within 2 years of now) is full weight.
 * Older evidence tapers linearly to 0.5 at 6+ years old.
 */
function recencyMultiplier(year: number | undefined): number {
  if (!year) return 0.8; // unknown year — moderate weight
  const age = new Date().getFullYear() - year;
  if (age <= 2) return 1.0;
  if (age <= 4) return 0.85;
  if (age <= 6) return 0.7;
  return 0.55;
}

// ---------------------------------------------------------------------------
// Per-Skill Evidence Analysis
// ---------------------------------------------------------------------------

/**
 * Determines the evidence status and confidence score for a single claimed skill.
 *
 * Evidence sources checked (in priority order):
 *   1. Past project titles + descriptions
 *   2. Internship descriptions
 *   3. GitHub connectivity
 *   4. Certification names + issuers
 *   5. Publication titles + venues
 *   6. Research interests
 */
function analyzeSkillEvidence(
  skillName: string,
  proficiency: Profile["skills"][number]["proficiency"],
  profile: Profile,
  /** Live public repo count from GitHub API — boosts confidence when present */
  githubPublicRepos?: number
): SkillEvidenceItem {
  const supporting: string[] = [];

  // ── 1. Past projects ──────────────────────────────────────────────────
  const relatedProjects = profile.pastProjects.filter((p) =>
    textContains(`${p.title} ${p.description}`, skillName)
  );
  if (relatedProjects.length > 0) {
    supporting.push(
      `${relatedProjects.length} past project${relatedProjects.length > 1 ? "s" : ""} reference${relatedProjects.length === 1 ? "s" : ""} this skill (${relatedProjects
        .slice(0, 2)
        .map((p) => `"${p.title}"`)
        .join(", ")}${relatedProjects.length > 2 ? "…" : ""})`
    );
  }

  // ── 2. Internship / experience descriptions ──────────────────────────
  const relatedInternships = profile.internships.filter((i) =>
    textContains(`${i.role} ${i.description} ${i.organization}`, skillName)
  );
  if (relatedInternships.length > 0) {
    supporting.push(
      `${relatedInternships.length} internship record${relatedInternships.length > 1 ? "s" : ""} mention${relatedInternships.length === 1 ? "s" : ""} this skill`
    );
  }

  // ── 3. GitHub connectivity + repo signal ─────────────────────────────
  if (profile.githubConnected && profile.githubUsername) {
    const repoNote =
      githubPublicRepos !== undefined && githubPublicRepos > 0
        ? `, ${githubPublicRepos} public repo${githubPublicRepos !== 1 ? "s" : ""}`
        : "";
    supporting.push(`GitHub profile linked (@${profile.githubUsername}${repoNote})`);
  } else if (profile.githubUsername) {
    supporting.push(`GitHub username on file (@${profile.githubUsername})`);
  }

  // ── 4. Resume linked ──────────────────────────────────────────────────
  // Resume is treated as a corroborating signal for all skills — we can't
  // parse its content, but its presence increases overall evidence credibility.
  if (profile.resumeUrl) {
    supporting.push("Academic resume linked");
  }

  // ── 5. Certifications ─────────────────────────────────────────────────
  const relatedCerts = profile.certifications.filter((c) =>
    textContains(`${c.name} ${c.issuer}`, skillName)
  );
  if (relatedCerts.length > 0) {
    supporting.push(
      `Certification: "${relatedCerts[0].name}"${relatedCerts[0].issuer ? ` (${relatedCerts[0].issuer})` : ""}`
    );
  }

  // ── 6. Publications ───────────────────────────────────────────────────
  const relatedPubs = profile.publications.filter((pub) =>
    textContains(`${pub.title} ${pub.venue}`, skillName)
  );
  if (relatedPubs.length > 0) {
    supporting.push(
      `${relatedPubs.length} academic publication${relatedPubs.length > 1 ? "s" : ""} related to this area`
    );
  }

  // ── 7. Research interests ─────────────────────────────────────────────
  const relatedInterests = profile.interests.filter((i) =>
    textContains(i, skillName) || textContains(skillName, i)
  );
  if (relatedInterests.length > 0) {
    supporting.push(`Listed research interest: "${relatedInterests[0]}"`);
  }

  // ── Determine status ──────────────────────────────────────────────────
  // Count distinct evidence source types for status determination.
  // resumeUrl and githubPublicRepos are treated as soft corroborators —
  // they count toward the evidence total but resume alone doesn't elevate
  // status to PARTIALLY_SUPPORTED since we can't verify its content.
  const hasGithub = profile.githubConnected || Boolean(profile.githubUsername);
  const hasResume = Boolean(profile.resumeUrl);
  // Repo count boosts GitHub's weight when we have > 5 repos
  const githubWeight = hasGithub && githubPublicRepos !== undefined && githubPublicRepos >= 5
    ? 2  // counts as 2 source slots — meaningful activity confirmed
    : hasGithub ? 1 : 0;

  const evidenceSourceCount =
    (relatedProjects.length > 0 ? 1 : 0) +
    (relatedInternships.length > 0 ? 1 : 0) +
    githubWeight +
    (relatedCerts.length > 0 ? 1 : 0) +
    (relatedPubs.length > 0 ? 1 : 0) +
    (relatedInterests.length > 0 ? 1 : 0) +
    (hasResume ? 1 : 0); // resume: soft corroborator

  let status: SkillEvidenceStatus;
  if (evidenceSourceCount >= 3) {
    status = "SUPPORTED";
  } else if (evidenceSourceCount === 2) {
    status = "SUPPORTED";
  } else if (evidenceSourceCount === 1) {
    // Projects, internships, or certs alone → partial; GitHub/resume/interest alone → insufficient
    if (relatedProjects.length > 0 || relatedInternships.length > 0 || relatedCerts.length > 0) {
      status = "PARTIALLY_SUPPORTED";
    } else {
      status = "INSUFFICIENT_EVIDENCE";
    }
  } else {
    status = "UNVERIFIED";
  }

  // ── Confidence score ───────────────────────────────────────────────────
  const proficiencyBonus =
    proficiency === "advanced" ? 8 : proficiency === "intermediate" ? 4 : 0;

  // GitHub repo count bonus for per-skill confidence
  const repoConfidenceBonus =
    githubPublicRepos === undefined ? 0 :
    githubPublicRepos >= 20 ? 6 :
    githubPublicRepos >= 10 ? 4 :
    githubPublicRepos >= 5  ? 2 : 1;

  let rawConfidence =
    STATUS_CONFIDENCE_FLOOR[status] +
    relatedProjects.length * 10 +
    relatedInternships.length * 7 +
    (hasGithub ? 5 : 0) +
    repoConfidenceBonus +
    (hasResume ? 3 : 0) +  // resume: small but consistent credibility boost
    relatedCerts.length * 8 +
    relatedPubs.length * 6 +
    relatedInterests.length * 3 +
    proficiencyBonus;

  // Advanced claims with zero corroborating evidence stay low
  if (proficiency === "advanced" && status === "UNVERIFIED") {
    rawConfidence = Math.min(rawConfidence, 25);
  }

  const confidenceScore = clamp(rawConfidence);

  // ── Gap note ───────────────────────────────────────────────────────────
  let gapNote: string | undefined;
  if (status === "UNVERIFIED") {
    gapNote = `The profile currently contains limited evidence supporting the claimed ${skillName} skill. Consider adding a related project, internship, or certification.`;
  } else if (status === "INSUFFICIENT_EVIDENCE") {
    const onlySignal = hasGithub ? "GitHub connectivity" : hasResume ? "A resume link" : "Limited evidence";
    gapNote = `${onlySignal} is the only evidence signal for ${skillName}. Adding a project or certification would strengthen this claim.`;
  } else if (status === "PARTIALLY_SUPPORTED" && proficiency === "advanced") {
    gapNote = `The claimed "advanced" level for ${skillName} is only partially supported by the available evidence. Additional projects or certifications would improve confidence.`;
  }

  return {
    skill: skillName,
    claimedLevel: proficiency,
    confidenceScore,
    status,
    supportingEvidence: supporting,
    gapNote,
  };
}

// ---------------------------------------------------------------------------
// Category Score Calculators
// ---------------------------------------------------------------------------

/**
 * SKILL EVIDENCE SCORE (0–20)
 *
 * Evaluates the quality and depth of listed skills, weighted by proficiency
 * and the degree of cross-source evidence. Does NOT reward simply listing
 * more skills without evidence.
 *
 * Formula:
 *   Per-skill contribution = proficiency_weight × evidence_density_ratio × (1/skill_count_penalty)
 *   Sum contributions, normalize to 0–20.
 *
 * skill_count_penalty: diminishing returns after 8 skills — adding more
 * unverified skills does not improve the score.
 */
function calcSkillEvidenceScore(_profile: Profile, skillItems: SkillEvidenceItem[]): number {
  if (skillItems.length === 0) return 0;

  // Raw contribution from each skill's confidence × proficiency weight
  const contributions = skillItems.map((item) => {
    const pw = PROFICIENCY_WEIGHT[item.claimedLevel];
    return (item.confidenceScore / 100) * pw;
  });

  // Average contribution (prevents score inflation from many low-quality skills)
  const avgContribution = contributions.reduce((a, b) => a + b, 0) / contributions.length;

  // Breadth bonus: up to +20% for having ≥5 skills with meaningful evidence
  const wellSupportedCount = skillItems.filter(
    (s) => s.status === "SUPPORTED" || s.status === "PARTIALLY_SUPPORTED"
  ).length;
  const breadthBonus = Math.min(0.2, (wellSupportedCount / 10) * 0.2);

  return clamp((avgContribution + breadthBonus) * MAX.skillEvidence);
}

/**
 * PROJECT EVIDENCE SCORE (0–25)
 *
 * Past projects are the strongest indicator of applied skills.
 *
 * Each project contributes:
 *   - Base: 4 points
 *   - Skill-match bonus: +1 per claimed skill mentioned in the project (cap 4)
 *   - Description quality bonus: +1 for non-trivial description (≥30 chars)
 *   - Recency bonus: multiplied by recencyMultiplier(year)
 *
 * Total is capped at MAX.projectEvidence.
 */
function calcProjectEvidenceScore(profile: Profile): number {
  if (profile.pastProjects.length === 0) return 0;

  const claimedSkillNames = profile.skills.map((s) => s.skill.toLowerCase());

  let total = 0;
  for (const proj of profile.pastProjects) {
    const projText = `${proj.title} ${proj.description}`.toLowerCase();

    // Base project credit
    let pts = 4;

    // Skill overlap bonus (up to 4 pts)
    const matchCount = claimedSkillNames.filter((s) => projText.includes(s)).length;
    pts += Math.min(4, matchCount);

    // Description quality (non-trivial: at least 30 characters)
    if ((proj.description?.trim()?.length ?? 0) >= 30) pts += 1;

    // Recency multiplier
    pts *= recencyMultiplier(proj.year);

    total += pts;
  }

  return clamp(total, 0, MAX.projectEvidence);
}

/**
 * GITHUB EVIDENCE SCORE (0–20)
 *
 * Scoring tiers (mutually exclusive connectivity levels):
 *   Fully connected (githubConnected + githubUsername): 16 pts base
 *   Username entered but not OAuth-connected:            8 pts base
 *   Not connected, no username:                          0 pts base
 *
 * Additional external links (independent of connectivity):
 *   Has resumeUrl:      +2 pts  (external document evidence)
 *   Has linkedinUrl:    +2 pts
 *   Has portfolioUrl:   +2 pts
 *
 * Live GitHub repo count bonus (when available from GitHub API):
 *   ≥20 repos: +4  |  ≥10: +3  |  ≥5: +2  |  ≥1: +1
 *
 * Total capped at MAX.githubEvidence (20).
 */
function calcGithubEvidenceScore(
  profile: Profile,
  githubPublicRepos?: number
): number {
  let pts = 0;

  // Connectivity base — mutually exclusive tiers
  if (profile.githubConnected && profile.githubUsername) {
    pts += 16; // Fully connected via OAuth + username confirmed
  } else if (profile.githubUsername) {
    pts += 8;  // Username entered manually but not OAuth-verified
  }

  // Additional external profile links (independent of GitHub)
  if (profile.resumeUrl)    pts += 2;
  if (profile.linkedinUrl)  pts += 2;
  if (profile.portfolioUrl) pts += 2;

  // Live repo count bonus — only meaningful when we have a real count
  if (githubPublicRepos !== undefined && githubPublicRepos > 0) {
    if (githubPublicRepos >= 20) pts += 4;
    else if (githubPublicRepos >= 10) pts += 3;
    else if (githubPublicRepos >= 5) pts += 2;
    else pts += 1;
  }

  return clamp(pts, 0, MAX.githubEvidence);
}

/**
 * EXPERIENCE EVIDENCE SCORE (0–15)
 *
 * Internships and laboratory experience demonstrate applied practice.
 *
 * Per internship:
 *   - Base: 4 pts
 *   - Skill-match bonus: +1 per claimed skill mentioned in role+description (cap 3)
 *   - Has non-trivial description: +1
 *
 * Capped at MAX.experienceEvidence.
 */
function calcExperienceEvidenceScore(profile: Profile): number {
  if (profile.internships.length === 0) return 0;

  const claimedSkillNames = profile.skills.map((s) => s.skill.toLowerCase());
  let total = 0;

  for (const intern of profile.internships) {
    const text = `${intern.role} ${intern.description} ${intern.organization}`.toLowerCase();
    let pts = 4;

    const matchCount = claimedSkillNames.filter((s) => text.includes(s)).length;
    pts += Math.min(3, matchCount);

    if ((intern.description?.trim()?.length ?? 0) >= 30) pts += 1;

    total += pts;
  }

  return clamp(total, 0, MAX.experienceEvidence);
}

/**
 * CERTIFICATION EVIDENCE SCORE (0–10)
 *
 * Certifications are external validators.
 *
 * Per certification:
 *   - Base: 3 pts
 *   - Skill-match bonus: +1 if cert name/issuer matches a claimed skill
 *   - Recency: multiplied by recencyMultiplier(year)
 *
 * Capped at MAX.certificationEvidence.
 */
function calcCertificationEvidenceScore(profile: Profile): number {
  if (profile.certifications.length === 0) return 0;

  const claimedSkillNames = profile.skills.map((s) => s.skill.toLowerCase());
  let total = 0;

  for (const cert of profile.certifications) {
    const certText = `${cert.name} ${cert.issuer}`.toLowerCase();
    let pts = 3;

    const isRelevant = claimedSkillNames.some((s) => certText.includes(s));
    if (isRelevant) pts += 1;

    pts *= recencyMultiplier(cert.year);

    total += pts;
  }

  return clamp(total, 0, MAX.certificationEvidence);
}

/**
 * CONSISTENCY SCORE (0–5)
 *
 * Rewards profiles where multiple evidence sources agree.
 * Example: skill "Python" appears in projects AND internships AND certifications.
 *
 * For each claimed skill, count how many DISTINCT evidence source types
 * corroborate it. A skill corroborated by 3+ source types gives max consistency.
 *
 * Formula:
 *   consistency_hits = skills where corroboration_source_count >= 2
 *   score = min(5, consistency_hits × 1.25)
 */
function calcConsistencyScore(skillItems: SkillEvidenceItem[]): number {
  const consistentSkills = skillItems.filter(
    (s) => s.status === "SUPPORTED" || s.supportingEvidence.length >= 2
  ).length;

  return clamp(consistentSkills * 1.25, 0, MAX.consistencyScore);
}

/**
 * PUBLICATION BONUS (0–5)
 *
 * Academic publications demonstrate research output.
 *
 * 1 publication → +2 pts
 * 2 publications → +3.5 pts
 * 3+ publications → +5 pts (max)
 */
function calcPublicationBonus(profile: Profile): number {
  const count = profile.publications.length;
  if (count === 0) return 0;
  if (count === 1) return 2;
  if (count === 2) return clamp(3.5, 0, MAX.publicationBonus);
  return MAX.publicationBonus;
}

// ---------------------------------------------------------------------------
// Strengths & Improvement Areas
// ---------------------------------------------------------------------------

function buildStrengths(
  profile: Profile,
  skillItems: SkillEvidenceItem[],
  breakdown: SkillScoreBreakdown
): string[] {
  const strengths: string[] = [];

  // Strong skill evidence
  const supportedSkills = skillItems
    .filter((s) => s.status === "SUPPORTED")
    .map((s) => s.skill);
  if (supportedSkills.length >= 3) {
    strengths.push(
      `Strong multi-source evidence for ${supportedSkills.slice(0, 3).join(", ")}${supportedSkills.length > 3 ? " and more" : ""}.`
    );
  } else if (supportedSkills.length > 0) {
    strengths.push(`Well-evidenced skill${supportedSkills.length > 1 ? "s" : ""}: ${supportedSkills.join(", ")}.`);
  }

  // Projects
  if (profile.pastProjects.length >= 3) {
    strengths.push(
      `${profile.pastProjects.length} past projects provide strong applied evidence.`
    );
  } else if (profile.pastProjects.length > 0) {
    strengths.push(
      `Past project${profile.pastProjects.length > 1 ? "s" : ""} (${profile.pastProjects.map((p) => `"${p.title}"`).join(", ")}) support claimed skills.`
    );
  }

  // GitHub
  if (profile.githubConnected && breakdown.githubEvidence >= 14) {
    strengths.push("GitHub profile connected and contributes to evidence credibility.");
  }

  // Resume
  if (profile.resumeUrl) {
    strengths.push("Academic resume linked, providing an additional external evidence signal.");
  }

  // Experience
  if (profile.internships.length >= 2) {
    strengths.push(
      `${profile.internships.length} internship/lab records demonstrate professional exposure.`
    );
  } else if (profile.internships.length === 1) {
    strengths.push(`Internship at ${profile.internships[0].organization} provides real-world context.`);
  }

  // Certifications
  if (profile.certifications.length >= 2) {
    strengths.push(
      `${profile.certifications.length} certifications externally validate technical knowledge.`
    );
  } else if (profile.certifications.length === 1) {
    strengths.push(
      `Certification "${profile.certifications[0].name}" provides external validation.`
    );
  }

  // Publications
  if (profile.publications.length > 0) {
    strengths.push(
      `${profile.publications.length} academic publication${profile.publications.length > 1 ? "s" : ""} demonstrate${profile.publications.length === 1 ? "s" : ""} research output.`
    );
  }

  // Consistency bonus
  if (breakdown.consistencyScore >= 4) {
    strengths.push("Strong consistency across projects, experience, and certifications.");
  }

  return strengths.slice(0, 6);
}

function buildImprovementAreas(
  profile: Profile,
  skillItems: SkillEvidenceItem[],
  _breakdown: SkillScoreBreakdown
): string[] {
  const areas: string[] = [];

  // Unverified skills
  const unverified = skillItems.filter((s) => s.status === "UNVERIFIED").map((s) => s.skill);
  if (unverified.length > 0) {
    areas.push(
      `Add supporting evidence for: ${unverified.slice(0, 3).join(", ")}. A project, certification, or internship mentioning these skills would improve confidence.`
    );
  }

  // No projects
  if (profile.pastProjects.length === 0) {
    areas.push("Adding at least one past project with a description will significantly increase your evidence score.");
  }

  // No GitHub
  if (!profile.githubConnected && !profile.githubUsername) {
    areas.push("Linking your GitHub profile provides external credibility and increases your evidence score.");
  }

  // No resume
  if (!profile.resumeUrl) {
    areas.push("Adding a resume link provides an additional external evidence signal for all your claimed skills.");
  }

  // No certifications
  if (profile.certifications.length === 0) {
    areas.push("Adding a relevant certification provides external validation for your claimed skills.");
  }

  // No internships
  if (profile.internships.length === 0) {
    areas.push("Adding internship or laboratory experience demonstrates applied practice beyond self-declared skills.");
  }

  // Advanced claims without strong support
  const weakAdvanced = skillItems.filter(
    (s) =>
      s.claimedLevel === "advanced" &&
      (s.status === "UNVERIFIED" || s.status === "INSUFFICIENT_EVIDENCE")
  );
  if (weakAdvanced.length > 0) {
    areas.push(
      `The "advanced" claim for ${weakAdvanced.map((s) => s.skill).join(", ")} currently lacks sufficient supporting evidence. Projects or certifications would strengthen it.`
    );
  }

  return areas.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Summary Narrative Builder
// ---------------------------------------------------------------------------

function buildSummary(
  profile: Profile,
  overallScore: number,
  skillItems: SkillEvidenceItem[],
  _breakdown: SkillScoreBreakdown
): string {
  const firstName = profile.fullName?.split(" ")[0] ?? "This student";
  const supportedCount = skillItems.filter((s) => s.status === "SUPPORTED").length;
  const totalSkills = skillItems.length;

  let scoreLabel: string;
  if (overallScore >= 80) scoreLabel = "strong";
  else if (overallScore >= 60) scoreLabel = "solid";
  else if (overallScore >= 40) scoreLabel = "developing";
  else scoreLabel = "early-stage";

  const parts: string[] = [];

  parts.push(
    `${firstName}'s profile demonstrates a ${scoreLabel} evidence foundation with an overall score of ${overallScore}/100.`
  );

  if (totalSkills > 0) {
    parts.push(
      `${supportedCount} of ${totalSkills} claimed skill${totalSkills !== 1 ? "s" : ""} ${supportedCount !== 1 ? "are" : "is"} supported by corroborating evidence.`
    );
  }

  if (profile.pastProjects.length > 0) {
    parts.push(
      `${profile.pastProjects.length} past project${profile.pastProjects.length !== 1 ? "s" : ""} contribute to the applied evidence base.`
    );
  }

  if (profile.githubConnected) {
    parts.push("A connected GitHub profile adds external credibility.");
  }

  if (profile.certifications.length > 0) {
    parts.push(
      `${profile.certifications.length} certification${profile.certifications.length !== 1 ? "s" : ""} provide external validation.`
    );
  }

  if (overallScore < 50) {
    parts.push(
      "Adding projects with detailed descriptions, linking GitHub, and including certifications will meaningfully improve this score."
    );
  } else if (overallScore < 70) {
    parts.push("Further improving evidence depth — especially for partially-supported skills — will increase the score.");
  }

  parts.push(SKILL_SCORE_DISCLAIMER);

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Confidence Label
// ---------------------------------------------------------------------------

function computeConfidence(
  profile: Profile,
  skillItems: SkillEvidenceItem[]
): "high" | "medium" | "low" {
  // Total evidence item count across all sources
  const evidenceCount =
    profile.pastProjects.length +
    profile.internships.length +
    profile.certifications.length +
    profile.publications.length +
    (profile.githubConnected ? 2 : 0) +
    skillItems.filter((s) => s.status === "SUPPORTED").length;

  if (evidenceCount >= 8) return "high";
  if (evidenceCount >= 4) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * analyzeStudentSkillScore
 *
 * Entry point. Accepts a fully-loaded Profile and optional live GitHub data.
 * Returns a complete SkillScoreAnalysis ready for storage and display.
 *
 * @param profile       - Full Profile object from fetchProfile()
 * @param githubPublicRepos - Optional live repo count from github API (if available)
 */
export function analyzeStudentSkillScore(
  profile: Profile,
  githubPublicRepos?: number
): SkillScoreAnalysis {
  // ── 1. Per-skill evidence analysis ───────────────────────────────────
  const skillItems: SkillEvidenceItem[] = profile.skills.map((s) =>
    analyzeSkillEvidence(s.skill, s.proficiency, profile, githubPublicRepos)
  );

  // ── 2. Category scores ────────────────────────────────────────────────
  const breakdown: SkillScoreBreakdown = {
    skillEvidence: calcSkillEvidenceScore(profile, skillItems),
    projectEvidence: calcProjectEvidenceScore(profile),
    githubEvidence: calcGithubEvidenceScore(profile, githubPublicRepos),
    experienceEvidence: calcExperienceEvidenceScore(profile),
    certificationEvidence: calcCertificationEvidenceScore(profile),
    consistencyScore: calcConsistencyScore(skillItems),
    publicationBonus: calcPublicationBonus(profile),
  };

  // ── 3. Overall score — sum of breakdown, validated 0–100 ─────────────
  const rawTotal =
    breakdown.skillEvidence +
    breakdown.projectEvidence +
    breakdown.githubEvidence +
    breakdown.experienceEvidence +
    breakdown.certificationEvidence +
    breakdown.consistencyScore +
    breakdown.publicationBonus;

  const overallScore = clamp(rawTotal);

  // ── 4. Narrative ──────────────────────────────────────────────────────
  const strengths = buildStrengths(profile, skillItems, breakdown);
  const improvementAreas = buildImprovementAreas(profile, skillItems, breakdown);
  const summary = buildSummary(profile, overallScore, skillItems, breakdown);
  const confidence = computeConfidence(profile, skillItems);

  return {
    overallScore,
    breakdown,
    skillEvidence: skillItems,
    strengths,
    improvementAreas,
    summary,
    confidence,
    analyzedAt: new Date().toISOString(),
    modelVersion: SKILL_ENGINE_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Utility: score change label
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable explanation of the change between two scores.
 * Used in the "Previous vs Current" history display.
 */
export function describeScoreChange(
  previousScore: number,
  currentScore: number
): string {
  const delta = currentScore - previousScore;
  if (Math.abs(delta) < 2) return "Score is effectively unchanged.";

  const direction = delta > 0 ? "increased" : "decreased";
  const magnitude = Math.abs(delta);

  if (magnitude >= 15)
    return `Score ${direction} significantly by ${magnitude} points. A major evidence change was detected.`;
  if (magnitude >= 8)
    return `Score ${direction} by ${magnitude} points. Meaningful new evidence was added or removed.`;
  return `Score ${direction} by ${magnitude} points. A minor evidence update was detected.`;
}
