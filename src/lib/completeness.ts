import type { Profile } from "@/types";

export function computeCompleteness(p: Profile): number {
  const checks: boolean[] = [
    Boolean(p.fullName),
    Boolean(p.institution),
    Boolean(p.department),
    Boolean(p.photoUrl),
    p.skills.length >= 3,
    p.interests.length >= 2,
    p.pastProjects.length > 0,
    Boolean(p.githubConnected || p.linkedinUrl || p.portfolioUrl),
    Boolean(p.bio),
    p.preferredRoles.length > 0,
  ];
  if (p.degreeProgram !== undefined || p.academicYear !== undefined) {
    checks.push(Boolean(p.degreeProgram), Boolean(p.academicYear));
  }
  if (p.designation !== undefined) {
    checks.push(Boolean(p.designation), p.researchDomains.length >= 1);
  }
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return score;
}
