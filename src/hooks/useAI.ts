import {
  analyzeCompatibility,
  analyzeProfileSkills,
  analyzeSkillGap,
  recommendCollaborators,
  recommendProjects,
  recommendTeam,
} from "@/lib/matching";

export {
  analyzeCompatibility,
  analyzeProfileSkills,
  analyzeSkillGap,
  recommendCollaborators,
  recommendProjects,
  recommendTeam,
};

export function useAI() {
  return {
    analyzeCompatibility,
    analyzeProfileSkills,
    analyzeSkillGap,
    recommendCollaborators,
    recommendProjects,
    recommendTeam,
  };
}
