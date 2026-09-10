import type {
  AiConfidence,
  CompatibilityAnalysis,
  Difficulty,
  JoinRequest,
  Profile,
  Project,
  TeamRecommendation,
} from "@/types";
import { AI_DISCLAIMER } from "@/types";
import { clamp, overlap, overlapRatio } from "@/lib/utils";

export function experienceLevel(profile: Profile): number {
  if (profile.researchExperience) return Math.min(6, profile.researchExperience);
  return profile.academicYear ?? 2;
}

export function difficultyLevel(d: Difficulty) {
  return d === "beginner" ? 1 : d === "intermediate" ? 3 : 5;
}

export function skillNames(profile: Profile) {
  return profile.skills.map((s) => s.skill);
}

export function recencyScore(createdAt: string) {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  return clamp(100 - days * 2);
}

export function availabilityScore(profile: Profile) {
  const h = profile.availabilityHours ?? 8;
  return clamp((h / 15) * 100);
}

export function projectMatchBreakdown(profile: Profile, project: Project) {
  const skillMatch = overlapRatio(skillNames(profile), project.requiredSkills);
  const interestMatch = overlapRatio(profile.interests, [...project.interests, ...project.domains]);
  const openRoles = project.roles.map((r) => r.name.toLowerCase());
  const preferred = profile.preferredRoles.map((r) => r.toLowerCase());
  const roleHits = preferred.filter((r) => openRoles.some((o) => o.includes(r) || r.includes(o)));
  const roleMatch = preferred.length
    ? clamp((roleHits.length / Math.max(1, preferred.length)) * 100)
    : 70;
  const exp = experienceLevel(profile);
  const diff = difficultyLevel(project.difficulty);
  const experienceMatch = clamp(100 - Math.abs(exp - diff) * 12);
  const recency = recencyScore(project.createdAt);
  const availability = availabilityScore(profile);
  const score = clamp(
    0.28 * skillMatch +
      0.22 * interestMatch +
      0.16 * roleMatch +
      0.14 * experienceMatch +
      0.12 * recency +
      0.08 * availability
  );
  return { skillMatch, interestMatch, roleMatch, experienceMatch, recency, availability, score };
}

export function confidenceFromEvidence(profile: Profile, skillHits: number): AiConfidence {
  const evidenceCount =
    (profile.githubConnected ? 1 : 0) +
    profile.pastProjects.length +
    profile.publications.length +
    profile.certifications.length +
    skillHits;
  if (evidenceCount >= 6 && skillHits >= 2) return "high";
  if (evidenceCount >= 3) return "medium";
  return "low";
}

export function analyzeCompatibility(
  project: Project,
  applicant: Profile,
  selectedRoleName?: string
): CompatibilityAnalysis {
  const base = projectMatchBreakdown(applicant, project);
  const roleName = selectedRoleName?.toLowerCase() ?? "";
  const preferredHit = applicant.preferredRoles.some(
    (r) => r.toLowerCase().includes(roleName) || roleName.includes(r.toLowerCase())
  );
  const roleMatch = selectedRoleName
    ? clamp(preferredHit ? Math.max(base.roleMatch, 86) : Math.max(55, base.roleMatch - 8))
    : base.roleMatch;

  const skillMatch = base.skillMatch;
  const interestMatch = base.interestMatch;
  const experienceMatch = base.experienceMatch;
  const compatibilityScore = clamp(
    0.35 * skillMatch + 0.25 * interestMatch + 0.2 * roleMatch + 0.2 * experienceMatch
  );

  const matchingSkills = overlap(skillNames(applicant), project.requiredSkills);
  const missingSkills = project.requiredSkills.filter(
    (s) => !matchingSkills.some((m) => m.toLowerCase() === s.toLowerCase())
  );
  const matchingInterests = overlap(applicant.interests, [...project.interests, ...project.domains]);

  const strengths: string[] = [];
  if (matchingSkills.length)
    strengths.push(`Strong overlap in ${matchingSkills.slice(0, 3).join(", ")}`);
  if (matchingInterests.length)
    strengths.push(`Research interests align on ${matchingInterests.slice(0, 2).join(" and ")}`);
  if (applicant.githubConnected) strengths.push("GitHub profile linked as supporting evidence");
  if (applicant.pastProjects.length)
    strengths.push(`${applicant.pastProjects.length} related project(s) listed on the profile`);
  if (applicant.publications.length)
    strengths.push("Publication record supports research readiness");
  if (!strengths.length) strengths.push("Application motivation can be reviewed manually");

  const gaps: string[] = [];
  if (missingSkills.length)
    gaps.push(`Limited listed evidence for ${missingSkills.slice(0, 3).join(", ")}`);
  if (!applicant.githubConnected && project.githubRequired)
    gaps.push("Project prefers GitHub evidence, which is not linked");
  if (applicant.pastProjects.length === 0)
    gaps.push("Limited project history to corroborate self-declared skills");
  if (!gaps.length) gaps.push("No major gaps identified from available profile evidence");

  const evidence = [
    `${matchingSkills.length} matching skill(s)`,
    `${applicant.pastProjects.length} listed project(s)`,
    applicant.githubConnected ? "GitHub linked" : "GitHub not linked",
    `${applicant.publications.length} publication(s)`,
  ];

  const reason = `Candidate demonstrates ${
    compatibilityScore >= 80 ? "strong" : compatibilityScore >= 65 ? "moderate" : "limited"
  } alignment with “${project.title}”. Skill match is ${skillMatch}% and interest match is ${interestMatch}%. ${
    selectedRoleName ? `Selected role: ${selectedRoleName}. ` : ""
  }This estimate uses profile evidence only.`;

  return {
    compatibilityScore,
    skillMatch,
    interestMatch,
    roleMatch,
    experienceMatch,
    strengths: strengths.slice(0, 5),
    gaps: gaps.slice(0, 5),
    reason,
    confidence: confidenceFromEvidence(applicant, matchingSkills.length),
    evidence,
    disclaimer: AI_DISCLAIMER,
  };
}

export function recommendProjects(profile: Profile, projects: Project[], excludeIds: string[]) {
  return projects
    .filter((p) => p.status === "open" && p.visibility !== "private")
    .filter((p) => !excludeIds.includes(p.id))
    .map((project) => {
      const b = projectMatchBreakdown(profile, project);
      const matchingSkills = overlap(skillNames(profile), project.requiredSkills);
      const matchingInterests = overlap(profile.interests, [...project.interests, ...project.domains]);
      return {
        project,
        matchScore: b.score,
        matchingSkills,
        matchingInterests,
        reason: matchingSkills.length
          ? `Strong overlap with your ${matchingSkills.slice(0, 2).join(" and ")} background.`
          : `Interests in ${matchingInterests[0] ?? project.domains[0]} make this a relevant opportunity.`,
        confidence: confidenceFromEvidence(profile, matchingSkills.length),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function recommendCollaborators(
  profile: Profile,
  others: Profile[],
  sharedProjectUserIds: Set<string>
) {
  return others
    .filter((c) => c.userId !== profile.userId && !sharedProjectUserIds.has(c.userId))
    .map((candidate) => {
      const sharedInterests = overlap(profile.interests, candidate.interests);
      const mine = skillNames(profile);
      const theirs = skillNames(candidate);
      const complementary = theirs.filter(
        (s) => !mine.some((m) => m.toLowerCase() === s.toLowerCase())
      );
      const sharedSkills = overlap(mine, theirs);
      const score = clamp(
        0.4 * overlapRatio(profile.interests, candidate.interests) +
          0.35 * clamp((complementary.length / Math.max(3, theirs.length)) * 100) +
          0.25 * overlapRatio(mine, theirs)
      );
      return {
        candidate,
        compatibilityScore: score,
        complementarySkills: complementary.slice(0, 4),
        sharedInterests,
        reason: complementary.length
          ? `Complements your profile with ${complementary.slice(0, 2).join(" and ")}.${
              sharedInterests.length ? ` Shared interest in ${sharedInterests[0]}.` : ""
            }`
          : `Shared skills in ${sharedSkills.slice(0, 2).join(" and ") || "related areas"}.`,
        confidence: confidenceFromEvidence(candidate, sharedSkills.length + complementary.length),
      };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

export function analyzeSkillGap(project: Project, memberProfiles: Profile[], candidates: Profile[]) {
  const teamSkills = [...new Set(memberProfiles.flatMap(skillNames))];
  const gaps = project.requiredSkills
    .filter((s) => !teamSkills.some((t) => t.toLowerCase() === s.toLowerCase()))
    .map((skill, i) => {
      const recommended = candidates
        .map((c) => ({
          userId: c.userId,
          name: c.fullName,
          matchScore: overlapRatio(skillNames(c), [skill]),
          reason: skillNames(c).includes(skill)
            ? `Listed ${skill} with supporting profile evidence`
            : `Related skills may transfer to ${skill}`,
        }))
        .filter((c) => c.matchScore >= 40)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3);
      return {
        skill,
        priority: (i === 0 ? "high" : recommended.length ? "medium" : "low") as
          | "high"
          | "medium"
          | "low",
        recommendedCandidates: recommended,
      };
    });
  return {
    teamSkills,
    requiredSkills: project.requiredSkills,
    gaps,
    summary: gaps.length
      ? `Team coverage is incomplete. Priority gaps: ${gaps
          .slice(0, 3)
          .map((g) => g.skill)
          .join(", ")}.`
      : "Current team covers the listed required skills.",
  };
}

export function recommendTeam(
  project: Project,
  applicants: { request: JoinRequest; profile: Profile }[]
): {
  recommendedTeam: TeamRecommendation[];
  teamSkillCoverage: number;
  roleCoverage: number;
  skillDuplication: "low" | "medium" | "high";
  gaps: string[];
  reason: string;
  alternatives: { role: string; alternativeCandidate: { name: string; compatibilityScore: number } }[];
  disclaimer: string;
} {
  const eligible = applicants
    .filter((a) => a.request.status === "pending")
    .filter((a) => (a.request.analysis?.compatibilityScore ?? 0) >= 60)
    .sort(
      (a, b) =>
        (b.request.analysis?.compatibilityScore ?? 0) - (a.request.analysis?.compatibilityScore ?? 0)
    );

  const used = new Set<string>();
  const recommendedTeam: TeamRecommendation[] = [];
  const alternatives: {
    role: string;
    alternativeCandidate: { name: string; compatibilityScore: number };
  }[] = [];

  for (const role of project.roles) {
    const pool = eligible.filter(
      (a) => a.request.selectedRoleId === role.id && !used.has(a.profile.userId)
    );
    const pick = pool[0];
    if (pick) {
      used.add(pick.profile.userId);
      recommendedTeam.push({
        role: role.name,
        candidateId: pick.profile.userId,
        candidateName: pick.profile.fullName,
        compatibilityScore: pick.request.analysis?.compatibilityScore ?? 0,
        reason: pick.request.analysis?.reason ?? "Best available match for this role.",
      });
      if (pool[1]) {
        alternatives.push({
          role: role.name,
          alternativeCandidate: {
            name: pool[1].profile.fullName,
            compatibilityScore: pool[1].request.analysis?.compatibilityScore ?? 0,
          },
        });
      }
    }
  }

  const coveredSkills = new Set(
    recommendedTeam.flatMap((m) => {
      const p = eligible.find((e) => e.profile.userId === m.candidateId)?.profile;
      return p ? skillNames(p) : [];
    })
  );
  const teamSkillCoverage = overlapRatio([...coveredSkills], project.requiredSkills);
  const roleCoverage = clamp((recommendedTeam.length / Math.max(1, project.roles.length)) * 100);
  const skillLists = recommendedTeam.map((m) => {
    const p = eligible.find((e) => e.profile.userId === m.candidateId)?.profile;
    return p ? skillNames(p) : [];
  });
  const dup =
    skillLists.flat().length - new Set(skillLists.flat().map((s) => s.toLowerCase())).size;
  const skillDuplication = dup > 8 ? "high" : dup > 4 ? "medium" : "low";
  const gaps = project.roles
    .filter((r) => !recommendedTeam.some((t) => t.role === r.name))
    .map((r) => r.name);

  return {
    recommendedTeam,
    teamSkillCoverage,
    roleCoverage,
    skillDuplication,
    gaps,
    reason: gaps.length
      ? `Recommended combination covers ${recommendedTeam.length} of ${project.roles.length} roles. Remaining openings: ${gaps.join(", ")}.`
      : "This combination covers required roles with strong compatibility and limited skill duplication. AI recommends; the owner decides.",
    alternatives,
    disclaimer: AI_DISCLAIMER,
  };
}

export function analyzeProfileSkills(profile: Profile) {
  return profile.skills.map((s) => {
    const evidence: string[] = [];
    const relatedProjects = profile.pastProjects.filter((p) =>
      `${p.title} ${p.description}`.toLowerCase().includes(s.skill.toLowerCase())
    );
    if (relatedProjects.length) evidence.push(`${relatedProjects.length} related project(s)`);
    if (profile.githubConnected) evidence.push("GitHub profile linked");
    if (profile.publications.length) evidence.push("Publications on record");
    if (profile.certifications.length) evidence.push("Certifications listed");
    const evidenceSupported = evidence.length > 0;
    return {
      skill: s.skill,
      confidence: (evidence.length >= 2 ? "high" : evidence.length === 1 ? "medium" : "low") as AiConfidence,
      evidence: evidence.length ? evidence : ["Self-declared only"],
      selfDeclaredProficiency: s.proficiency,
      evidenceSupported,
      note: "This is an AI estimate, not a certification.",
    };
  });
}

export function projectAssistantSummary(input: {
  title: string;
  taskTotal: number;
  taskDone: number;
  openHigh: number;
  nextMilestone?: string;
  memberCount: number;
  recentActivity: string[];
}) {
  const pct = input.taskTotal ? Math.round((input.taskDone / input.taskTotal) * 100) : 0;
  return {
    summary: `${input.title} is ${pct}% complete on tracked tasks, with ${input.memberCount} active members.`,
    priorityActions: [
      input.openHigh
        ? `Resolve ${input.openHigh} high-priority open task(s).`
        : "Keep current task cadence and review blockers.",
      input.nextMilestone
        ? `Prepare for upcoming milestone: ${input.nextMilestone}.`
        : "Define the next milestone so progress is measurable.",
      "Review recent activity and confirm ownership of open work.",
    ],
    risks: [
      pct < 30 ? "Early-stage delivery risk if roles remain unfilled." : "Monitor deadline slippage on in-progress work.",
      input.memberCount < 3 ? "Team size may be too small for the stated scope." : "Handoffs can stall if status updates lag.",
    ],
    suggestions: [
      "Assign unowned tasks before the next check-in.",
      "Use the research workspace to keep notes with the team, not in chat threads.",
    ],
    confidence: "medium" as AiConfidence,
    disclaimer:
      "Generated from project data available to members. This is an estimate, not an autonomous decision.",
  };
}
