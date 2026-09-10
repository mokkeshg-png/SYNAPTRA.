export const INSTITUTIONS = [
  "Indian Institute of Technology Delhi",
  "Indian Institute of Technology Bombay",
  "Indian Institute of Technology Madras",
  "Indian Institute of Science Bangalore",
  "National Institute of Technology Trichy",
  "Delhi Technological University",
  "Anna University",
  "University of Hyderabad",
  "Jawaharlal Nehru University",
  "Birla Institute of Technology and Science",
  "Other / Type your institution",
];

export const DEPARTMENTS = [
  "Computer Science and Engineering",
  "Electrical Engineering",
  "Electronics and Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Technology",
  "Data Science",
  "Artificial Intelligence",
  "Biotechnology",
  "Physics",
  "Mathematics",
  "Design",
  "Management",
  "English and Humanities",
];

export const DEGREE_PROGRAMS = [
  "B.Tech",
  "B.E.",
  "B.Sc",
  "M.Tech",
  "M.Sc",
  "MCA",
  "MBA",
  "Ph.D",
  "Integrated Dual Degree",
];

export const DESIGNATIONS = [
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Research Scientist",
  "Visiting Faculty",
  "Postdoctoral Fellow",
  "Head of Department",
];

export const SKILL_TAXONOMY: Record<string, string[]> = {
  Programming: ["Python", "Java", "C++", "JavaScript", "TypeScript", "Go", "R", "MATLAB"],
  "Machine Learning": [
    "Machine Learning",
    "Deep Learning",
    "Computer Vision",
    "Natural Language Processing",
    "Reinforcement Learning",
    "MLOps",
  ],
  Data: ["Data Analysis", "Data Science", "Statistics", "SQL", "Pandas", "Dataset Curation"],
  Systems: ["Backend", "Frontend", "Cloud", "DevOps", "Git", "Docker"],
  Research: [
    "Research Writing",
    "Literature Review",
    "Experiment Design",
    "Academic Publishing",
    "Survey Design",
  ],
  Design: ["UI/UX", "Figma", "Product Design"],
  Domain: ["Healthcare AI", "Agriculture Tech", "Cybersecurity", "IoT", "Robotics", "HCI"],
};

export const ALL_SKILLS = Object.values(SKILL_TAXONOMY).flat();

export const INTEREST_TAXONOMY: Record<string, string[]> = {
  Computing: [
    "Artificial Intelligence",
    "Machine Learning",
    "Computer Vision",
    "Natural Language Processing",
    "Human-Computer Interaction",
    "Distributed Systems",
  ],
  Science: ["Healthcare AI", "Computational Biology", "Climate Informatics", "Agriculture Tech"],
  Society: ["Education Technology", "Digital Humanities", "Responsible AI", "Accessibility"],
  Engineering: ["Embedded Systems", "Robotics", "Cybersecurity", "Software Engineering"],
};

export const ALL_INTERESTS = Object.values(INTEREST_TAXONOMY).flat();

export const RESEARCH_DOMAINS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Computer Vision",
  "Natural Language Processing",
  "Healthcare",
  "Agriculture",
  "Education",
  "Cybersecurity",
  "Human-Computer Interaction",
  "Data Science",
  "Software Engineering",
  "Robotics",
  "Climate and Sustainability",
  "Social Computing",
];
