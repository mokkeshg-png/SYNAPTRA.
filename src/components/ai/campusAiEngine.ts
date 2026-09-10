import type { Profile, Project } from "@/types";

export interface AiConversationContext {
  lastIntent?: string;
  lastStudents?: Profile[];
  lastFaculty?: Profile[];
  lastProjects?: Project[];
  lastQuerySkills?: string[];
  lastPerson?: Profile;
}

export interface ProcessedAiResponse {
  text: string;
  students?: Profile[];
  faculty?: Profile[];
  projects?: Project[];
  contextUpdate: AiConversationContext;
}

// Synonyms and domain mapping
const DOMAIN_SKILL_MAP: Record<string, string[]> = {
  frontend: ["react", "vue", "angular", "html", "css", "tailwind", "javascript", "typescript", "ui", "ux", "frontend", "next.js", "svelte", "web design"],
  backend: ["node", "nodejs", "node.js", "express", "django", "fastapi", "flask", "java", "spring", "golang", "go", "sql", "postgres", "postgresql", "mongodb", "database", "redis", "backend", "server-side", "rest api", "graphql"],
  fullstack: ["react", "node", "express", "full stack", "fullstack", "django", "postgres", "mongodb", "mern", "mean"],
  "ai/ml": ["python", "machine learning", "ml", "ai", "artificial intelligence", "deep learning", "nlp", "computer vision", "vision", "pytorch", "tensorflow", "scikit-learn", "data science", "neural networks", "llm"],
  cybersecurity: ["cybersecurity", "security", "cryptography", "network security", "penetration testing", "ethical hacking", "infosec", "wireshark"],
  mobile: ["react native", "flutter", "ios", "android", "swift", "kotlin", "mobile app"],
  cloud: ["aws", "azure", "gcp", "docker", "kubernetes", "devops", "cloud computing", "ci/cd"],
  "ui/ux": ["figma", "ui design", "ux research", "wireframing", "prototyping", "design systems", "ui/ux"],
};

const COMMON_SKILLS = [
  "python", "javascript", "typescript", "react", "node.js", "nodejs", "express", "django",
  "fastapi", "java", "c++", "c", "sql", "postgresql", "postgres", "mongodb", "pytorch",
  "tensorflow", "machine learning", "deep learning", "computer vision", "nlp", "cybersecurity",
  "cryptography", "figma", "ui/ux", "docker", "kubernetes", "aws", "git", "flutter", "react native",
  "html", "css", "tailwind", "data science", "linux", "cloud computing", "robotics", "iot", "hardware", "arduino"
];

function extractKeywords(query: string): string[] {
  const q = query.toLowerCase();
  const matched = new Set<string>();

  // Check known multi-word & single-word skills
  for (const skill of COMMON_SKILLS) {
    if (q.includes(skill)) {
      matched.add(skill);
    }
  }

  // Check domain aliases
  if (q.includes("frontend") || q.includes("front-end") || q.includes("client-side")) matched.add("frontend");
  if (q.includes("backend") || q.includes("back-end") || q.includes("server-side") || q.includes("server")) matched.add("backend");
  if (q.includes("fullstack") || q.includes("full-stack") || q.includes("full stack")) matched.add("fullstack");
  if (q.includes("cybersecurity") || q.includes("security") || q.includes("infosec")) matched.add("cybersecurity");
  if (q.includes("ui/ux") || q.includes("ui") || q.includes("ux") || q.includes("design")) matched.add("ui/ux");
  if (q.includes("machine learning") || q.includes("ai") || q.includes("ml") || q.includes("deep learning")) matched.add("ai/ml");

  return Array.from(matched);
}

function getStudentSkills(s: Profile): string[] {
  const list = (s.skills || []).map((sk) => sk.skill.toLowerCase());
  const langs = (s.programmingLanguages || []).map((l) => l.toLowerCase());
  const interests = (s.interests || []).map((i) => i.toLowerCase());
  const past = (s.pastProjects || []).flatMap((p) => `${p.title} ${p.description}`.toLowerCase().split(/\s+/));
  return Array.from(new Set([...list, ...langs, ...interests, ...past]));
}

function matchesSkill(skillPool: string[], targetSkill: string): boolean {
  const target = targetSkill.toLowerCase();
  if (skillPool.some((s) => s.includes(target) || target.includes(s))) return true;

  // Check domain mapping
  const domainSkills = DOMAIN_SKILL_MAP[target];
  if (domainSkills) {
    return domainSkills.some((ds) => skillPool.some((s) => s.includes(ds) || ds.includes(s)));
  }
  return false;
}

export function processCampusQuery(
  rawQuery: string,
  profiles: Profile[],
  projects: Project[],
  currentProfile: Profile | null,
  context: AiConversationContext = {}
): ProcessedAiResponse {
  const query = rawQuery.trim();
  const q = query.toLowerCase();

  const students = profiles.filter((p) => !p.designation && p.role !== "admin");
  const faculty = profiles.filter((p) => !!p.designation || p.role === "faculty");

  // -------------------------------------------------------------------------
  // 1. Follow-up handling (e.g. "Only third-year students", "3rd year only", "Computer Science only")
  // -------------------------------------------------------------------------
  const isYearFollowUp = /^(only\s+)?(1st|2nd|3rd|4th|first|second|third|fourth|final)\s*(year|yr)?(\s*students?)?$/i.test(q) ||
    /^(show\s+)?(only\s+)?(year\s*[1-4]|3rd\s*year|third\s*year|final\s*year|2nd\s*year|1st\s*year)/i.test(q);

  if (isYearFollowUp && context.lastStudents && context.lastStudents.length > 0) {
    let targetYear = 3;
    if (q.includes("1st") || q.includes("first") || q.includes("year 1")) targetYear = 1;
    if (q.includes("2nd") || q.includes("second") || q.includes("year 2")) targetYear = 2;
    if (q.includes("3rd") || q.includes("third") || q.includes("year 3")) targetYear = 3;
    if (q.includes("4th") || q.includes("fourth") || q.includes("final") || q.includes("year 4")) targetYear = 4;

    const filtered = context.lastStudents.filter((s) => s.academicYear === targetYear);
    if (filtered.length === 0) {
      return {
        text: `From the previous search, none of the students are in Year ${targetYear}.`,
        contextUpdate: { ...context },
      };
    }
    return {
      text: `Filtered to Year ${targetYear} students from your previous search:`,
      students: filtered,
      contextUpdate: { ...context, lastStudents: filtered },
    };
  }

  // -------------------------------------------------------------------------
  // 2. Specific Person Profile Query (e.g., "What skills does Rahul Mehta have?", "Who is Priya Sharma?")
  // -------------------------------------------------------------------------
  const personQueryMatch = profiles.find((p) => {
    const nameLower = p.fullName.toLowerCase();
    const parts = nameLower.split(/\s+/);
    if (q.includes(nameLower)) return true;
    // Check if query contains both first and last name or distinct full name
    return parts.length >= 2 && parts.every((part) => q.includes(part));
  });

  if (personQueryMatch && (q.includes("who is") || q.includes("skills does") || q.includes("department is") || q.includes("projects has") || q.includes("profile") || q.includes("about") || q.includes("what does"))) {
    const isFac = !!personQueryMatch.designation;
    const uid = `${isFac ? "FAC" : "STU"}-${personQueryMatch.userId.substring(0, 6).toUpperCase()}`;
    const skillsList = personQueryMatch.skills.map((s) => `${s.skill} (${s.proficiency})`).join(", ");
    const pastProjs = (personQueryMatch.pastProjects || []).map((p) => `“${p.title}”`).join(", ");
    const pubs = (personQueryMatch.publications || []).map((p) => `“${p.title}” (${p.venue}, ${p.year})`).join("; ");

    let responseText = `**${personQueryMatch.fullName}** (${uid})\n`;
    responseText += `• **Role**: ${isFac ? "Faculty (" + personQueryMatch.designation + ")" : "Student (Year " + (personQueryMatch.academicYear ?? "—") + ")"}\n`;
    responseText += `• **Department**: ${personQueryMatch.department} (${personQueryMatch.institution})\n`;
    if (personQueryMatch.bio) responseText += `• **Bio**: ${personQueryMatch.bio}\n`;
    if (skillsList) responseText += `• **Skills**: ${skillsList}\n`;
    if (personQueryMatch.interests?.length) responseText += `• **Research Interests**: ${personQueryMatch.interests.join(", ")}\n`;
    if (pastProjs) responseText += `• **Past Projects**: ${pastProjs}\n`;
    if (pubs) responseText += `• **Publications**: ${pubs}\n`;

    return {
      text: responseText,
      students: !isFac ? [personQueryMatch] : undefined,
      faculty: isFac ? [personQueryMatch] : undefined,
      contextUpdate: { ...context, lastPerson: personQueryMatch },
    };
  }

  // -------------------------------------------------------------------------
  // 3. Ambiguous generic requests (Clarification handling)
  // -------------------------------------------------------------------------
  if (/^find\s+(me\s+)?(a\s+)?developer\.?$/i.test(q) || /^i\s+need\s+a\s+developer\.?$/i.test(q)) {
    return {
      text: "Sure! What type of developer are you looking for — frontend, backend, full stack, mobile, AI/ML, or UI/UX?",
      contextUpdate: context,
    };
  }

  // -------------------------------------------------------------------------
  // 4. Hardware / Out-of-Scope Questions (Strict No Hallucination)
  // -------------------------------------------------------------------------
  if (q.includes("hardware") || q.includes("underwater robotics") || q.includes("mechanical engineering") || q.includes("circuit design")) {
    const hasHardware = projects.some((p) => {
      const text = `${p.title} ${p.shortDescription} ${p.detailedDescription} ${p.domains.join(" ")} ${p.requiredSkills.join(" ")}`.toLowerCase();
      return text.includes("hardware") || text.includes("underwater") || text.includes("vlsi");
    });

    if (!hasHardware) {
      if (q.includes("hardware project")) {
        return {
          text: "Currently, I can find software-based and AI research projects on this platform. I couldn't find any hardware projects in the available project data.",
          contextUpdate: context,
        };
      }
      if (q.includes("underwater robotics")) {
        return {
          text: "I couldn't find a student or project with underwater robotics experience in the available campus data.",
          contextUpdate: context,
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. General Knowledge vs Website Questions
  // -------------------------------------------------------------------------
  if (q === "what is a hackathon?" || q.startsWith("what is a hackathon")) {
    return {
      text: "A hackathon is a collaborative, time-bounded event where developers, designers, and domain specialists work intensively to build innovative software or hardware solutions.\n\nOn **SYNAPTRA**, students frequently post hackathon initiatives to recruit teammates with complementary frontend, backend, or ML skills under the **Explore Projects** catalog.",
      contextUpdate: context,
    };
  }

  if (q.includes("how to create a project") || q.includes("how do i create a project")) {
    return {
      text: "To create a project on SYNAPTRA:\n1. Click **Explore Projects** in the top navigation.\n2. Click the **+ Create Project** button.\n3. Fill in your project title, domains, required team skills, and open role openings.\n4. Once published, interested campus peers can submit join requests!",
      contextUpdate: context,
    };
  }

  // -------------------------------------------------------------------------
  // 6. Campus Skills Inventory & Statistics
  // -------------------------------------------------------------------------
  if (q.includes("what skills are available") || q.includes("skills on this campus") || q.includes("list all skills")) {
    const allSkills = Array.from(
      new Set(profiles.flatMap((p) => (p.skills || []).map((s) => s.skill)))
    ).sort();

    return {
      text: `Here are the active technical skills recorded across campus profiles (${allSkills.length} total):\n\n${allSkills.slice(0, 25).join(" • ")}${allSkills.length > 25 ? ` and ${allSkills.length - 25} more.` : "."}`,
      contextUpdate: context,
    };
  }

  if (q.includes("how many students") || q.includes("count of students")) {
    const extracted = extractKeywords(q);
    if (extracted.length > 0) {
      const count = students.filter((s) => {
        const pool = getStudentSkills(s);
        return extracted.some((sk) => matchesSkill(pool, sk));
      }).length;

      return {
        text: `There are **${count}** student(s) on the platform with skills related to ${extracted.join(", ")}.`,
        contextUpdate: context,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 7. "I have X skills / I know X, find me projects"
  // -------------------------------------------------------------------------
  const isUserSkillQuery = (q.includes("i have") || q.includes("i know") || q.includes("my skills") || q.includes("i am good at") || q.includes("where i can contribute")) && (q.includes("project") || q.includes("contribute") || q.includes("join"));

  if (isUserSkillQuery) {
    const userSkills = extractKeywords(q);
    const skillsToMatch = userSkills.length > 0 ? userSkills : (currentProfile?.skills || []).map((s) => s.skill.toLowerCase());

    if (skillsToMatch.length === 0) {
      return {
        text: "Please mention the technical skills you have (for example, React, Python, or UI/UX), and I'll find open projects that need those skills.",
        contextUpdate: context,
      };
    }

    const matchedProjects = projects.filter((p) => {
      const projSkills = p.requiredSkills.map((s) => s.toLowerCase());
      const projDomains = p.domains.map((d) => d.toLowerCase());
      const allProj = [...projSkills, ...projDomains];
      return skillsToMatch.some((us) => matchesSkill(allProj, us));
    });

    if (matchedProjects.length === 0) {
      return {
        text: `I couldn't find open projects currently requesting ${skillsToMatch.join(", ")}. You can check back soon or create your own project initiative!`,
        contextUpdate: context,
      };
    }

    return {
      text: `Based on your background in ${skillsToMatch.join(", ")}, here are matching projects looking for your skills:`,
      projects: matchedProjects.slice(0, 4),
      contextUpdate: { ...context, lastProjects: matchedProjects },
    };
  }

  // -------------------------------------------------------------------------
  // 8. Faculty Search & Mentor Matching
  // -------------------------------------------------------------------------
  const isFacultySearch = q.includes("faculty") || q.includes("professor") || q.includes("mentor") || q.includes("advisor") || q.includes("prof");

  if (isFacultySearch) {
    const extracted = extractKeywords(q);
    let matchedFaculty = faculty;

    if (extracted.length > 0) {
      matchedFaculty = faculty.filter((f) => {
        const facPool = [
          ...(f.expertise || []).map((e) => e.toLowerCase()),
          ...(f.researchDomains || []).map((d) => d.toLowerCase()),
          ...(f.skills || []).map((s) => s.skill.toLowerCase()),
          f.department.toLowerCase(),
          (f.bio || "").toLowerCase(),
        ];
        return extracted.some((sk) => matchesSkill(facPool, sk));
      });
    }

    if (q.includes("mentor")) {
      matchedFaculty = matchedFaculty.filter((f) => f.openToMentoring !== false);
    }

    if (matchedFaculty.length === 0) {
      return {
        text: extracted.length > 0
          ? `I couldn't find a faculty member with expertise in ${extracted.join(", ")} in the available campus data.`
          : "I couldn't find a faculty member matching that request in the campus directory.",
        contextUpdate: context,
      };
    }

    return {
      text: extracted.length > 0
        ? `Found ${matchedFaculty.length} faculty member(s) specializing in ${extracted.join(", ")}:`
        : `Here are available faculty advisors across campus departments:`,
      faculty: matchedFaculty.slice(0, 4),
      contextUpdate: { ...context, lastFaculty: matchedFaculty },
    };
  }

  // -------------------------------------------------------------------------
  // 9. Project Search (e.g. "Find AI projects", "Which projects need backend developers?", "Cybersecurity projects")
  // -------------------------------------------------------------------------
  const isProjectSearch = q.includes("project") || q.includes("research work") || q.includes("initiative") || q.includes("looking for") || q.includes("need backend") || q.includes("need frontend") || q.includes("need ui/ux") || q.includes("need designer");

  if (isProjectSearch) {
    const extracted = extractKeywords(q);
    let matchedProjects = projects;

    if (extracted.length > 0) {
      matchedProjects = projects.filter((p) => {
        const pSkills = p.requiredSkills.map((s) => s.toLowerCase());
        const pDomains = p.domains.map((d) => d.toLowerCase());
        const pRoles = p.roles.map((r) => r.name.toLowerCase());
        const pText = `${p.title} ${p.shortDescription} ${p.detailedDescription}`.toLowerCase();
        const pool = [...pSkills, ...pDomains, ...pRoles, pText];

        return extracted.some((sk) => matchesSkill(pool, sk));
      });
    }

    if (q.includes("open") || q.includes("active")) {
      matchedProjects = matchedProjects.filter((p) => p.status === "open");
    }

    if (matchedProjects.length === 0) {
      return {
        text: extracted.length > 0
          ? `I couldn't find a project matching requirements for ${extracted.join(", ")} in the available project data.`
          : "I couldn't find projects matching those criteria in the catalog.",
        contextUpdate: context,
      };
    }

    return {
      text: extracted.length > 0
        ? `Found ${matchedProjects.length} project(s) matching ${extracted.join(", ")}:`
        : `Here are active campus research projects:`,
      projects: matchedProjects.slice(0, 4),
      contextUpdate: { ...context, lastProjects: matchedProjects },
    };
  }

  // -------------------------------------------------------------------------
  // 10. Student Search & Multi-Skill Matching (e.g. "Find students who know Python and AI")
  // -------------------------------------------------------------------------
  const extractedSkills = extractKeywords(q);

  if (extractedSkills.length > 0 || q.includes("student") || q.includes("collaborator") || q.includes("developer") || q.includes("who knows") || q.includes("who has") || q.includes("someone")) {
    const skillsToSearch = extractedSkills.length > 0 ? extractedSkills : ["frontend", "backend"];

    // Multi-skill matching with exact count ranking
    const scoredStudents = students.map((s) => {
      const pool = getStudentSkills(s);
      let matchedCount = 0;
      const matchedList: string[] = [];

      for (const reqSkill of skillsToSearch) {
        if (matchesSkill(pool, reqSkill)) {
          matchedCount++;
          matchedList.push(reqSkill);
        }
      }

      return {
        student: s,
        matchedCount,
        matchedList,
        totalReq: skillsToSearch.length,
      };
    }).filter((res) => res.matchedCount > 0);

    // Sort: students with highest matchedCount first
    scoredStudents.sort((a, b) => b.matchedCount - a.matchedCount);

    if (scoredStudents.length === 0) {
      return {
        text: `I couldn't find a student matching ${skillsToSearch.join(" and ")} in the available campus data.`,
        contextUpdate: context,
      };
    }

    const exactMatches = scoredStudents.filter((s) => s.matchedCount === skillsToSearch.length);
    let replyText = "";
    let finalStudents: Profile[] = [];

    if (exactMatches.length > 0) {
      replyText = `Found ${exactMatches.length} student(s) matching all requested skills (${skillsToSearch.join(", ")}):`;
      finalStudents = exactMatches.map((e) => e.student);
    } else {
      replyText = `I couldn't find a student matching all ${skillsToSearch.length} skills (${skillsToSearch.join(", ")}). Here are students matching ${scoredStudents[0].matchedCount} of the requested skills:`;
      finalStudents = scoredStudents.map((e) => e.student);
    }

    return {
      text: replyText,
      students: finalStudents.slice(0, 4),
      contextUpdate: {
        ...context,
        lastIntent: "student_search",
        lastStudents: finalStudents,
        lastQuerySkills: skillsToSearch,
      },
    };
  }

  // -------------------------------------------------------------------------
  // 11. Fallback / General Campus Assistance
  // -------------------------------------------------------------------------
  return {
    text: "I can help you search student collaborators by skill, discover faculty mentors, or find active research projects. You can ask queries like:\n\n• *\"Show me students who know frontend development\"*\n• *\"I need a student who knows Python and AI\"*\n• *\"Find projects that need backend developers\"*\n• *\"Find faculty with cybersecurity expertise\"*",
    contextUpdate: context,
  };
}
