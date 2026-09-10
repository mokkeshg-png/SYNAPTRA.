export type PlatformRole = "student" | "faculty" | "admin";
export type AccountStatus = "active" | "suspended" | "deleted";
export type Proficiency = "beginner" | "intermediate" | "advanced";
export type ProfileVisibility = "public" | "members" | "institution" | "private";
export type ProjectVisibility = "public" | "private" | "restricted";
export type ProjectStatus = "open" | "closed" | "completed" | "flagged" | "removed";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type JoinStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";
export type MemberStatus = "invited" | "active" | "left" | "removed" | "declined";
export type SystemRole = "owner" | "mentor" | "lead" | "member";
export type TaskStatus = "todo" | "in_progress" | "review" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type AiConfidence = "high" | "medium" | "low";
export type NotificationType =
  | "join_request"
  | "application_accepted"
  | "application_rejected"
  | "project_invitation"
  | "task_assigned"
  | "task_deadline"
  | "new_team_member"
  | "project_update"
  | "ai_recommendation"
  | "github_activity"
  | "mentor_feedback"
  | "mention"
  | "details_request"
  | "mentorship_request";
export type ReportType =
  | "fake_profile"
  | "spam"
  | "harassment"
  | "misleading_project"
  | "inappropriate_content"
  | "suspicious_activity"
  | "other";
export type ReportStatus = "pending" | "resolved" | "dismissed";
export type ModerationAction = "warn" | "suspend" | "remove_content" | "escalate" | "dismiss";
export type NoteCategory = "literature" | "experiment" | "meeting" | "idea";
export type DocumentAccess = "members" | "owner_mentor";
export type ProjectType =
  | "Academic Project"
  | "Research Project"
  | "Final-Year Project"
  | "Hackathon"
  | "Innovation Project"
  | "Open-Source"
  | "Publication-Oriented"
  | "Faculty-Led Research"
  | "Interdisciplinary";

export const PROJECT_TYPES: ProjectType[] = [
  "Academic Project",
  "Research Project",
  "Final-Year Project",
  "Hackathon",
  "Innovation Project",
  "Open-Source",
  "Publication-Oriented",
  "Faculty-Led Research",
  "Interdisciplinary",
];

export const ROLE_TEMPLATES = [
  { name: "Frontend Developer", description: "Builds responsive, accessible, user-facing interfaces and components." },
  { name: "Backend Developer", description: "Designs RESTful APIs, database schemas, authentication, and core services." },
  { name: "Full Stack Developer", description: "Builds end-to-end web architectures, APIs, and client interfaces." },
  { name: "UI/UX Designer", description: "Designs intuitive user journeys, wireframes, and design systems." },
  { name: "AI/ML Developer", description: "Builds, trains, fine-tunes, and deploys machine learning models." },
  { name: "Cybersecurity Developer", description: "Implements security protocols, vulnerability testing, and audit logs." },
  { name: "Cloud Engineer", description: "Manages cloud infrastructure, containerization, and CI/CD pipelines." },
  { name: "Faculty Mentor", description: "Provides academic oversight, research direction, and milestone evaluation." },
  { name: "Project Lead", description: "Leads execution, timeline coordination, and deliverable handoffs." },
  { name: "Researcher", description: "Designs experimental studies, reviews literature, and analyzes findings." },
  { name: "Data Scientist", description: "Prepares datasets, cleans telemetry, and performs statistical analysis." },
  { name: "Research Writer", description: "Drafts academic paper manuscripts, methodology reports, and documentation." },
  { name: "Reviewer", description: "Reviews code, papers, and artifacts for quality and academic rigor." },
] as const;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: PlatformRole;
  emailVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  status: AccountStatus;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSkill {
  skill: string;
  proficiency: Proficiency;
}

export interface PastProject {
  id: string;
  title: string;
  description: string;
  year?: number;
}

export interface Internship {
  id: string;
  organization: string;
  role: string;
  description: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year?: number;
}

export interface Publication {
  id: string;
  title: string;
  venue: string;
  year: number;
  link?: string;
}

export interface Profile {
  id: string;
  userId: string;
  email: string;
  role: PlatformRole;
  fullName: string;
  photoUrl?: string;
  institution: string;
  department: string;
  phone?: string;
  location?: string;
  bio?: string;
  visibility: ProfileVisibility;
  profileCompleteness: number;
  skills: UserSkill[];
  interests: string[];
  programmingLanguages: string[];
  pastProjects: PastProject[];
  internships: Internship[];
  certifications: Certification[];
  publications: Publication[];
  githubUsername?: string;
  githubConnected: boolean;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  availabilityHours?: number;
  preferredRoles: string[];
  preferredTeamSize?: number;
  degreeProgram?: string;
  academicYear?: number;
  graduationYear?: number;
  designation?: string;
  subjectsTaught: string[];
  teachingAreas: string[];
  academicExperience?: number;
  researchExperience?: number;
  researchDomains: string[];
  expertise: string[];
  googleScholar?: string;
  orcid?: string;
  researchgate?: string;
  openToCollaboration: boolean;
  openToMentoring: boolean;
  preferredProjectTypes: ProjectType[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRole {
  id: string;
  name: string;
  description: string;
  requiredSkills: string[];
  openings: number;
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  shortDescription: string;
  detailedDescription: string;
  problemStatement?: string;
  objectives: string[];
  domains: string[];
  interests: string[];
  requiredSkills: string[];
  roles: ProjectRole[];
  teamMin: number;
  teamMax: number;
  duration?: string;
  difficulty: Difficulty;
  type: ProjectType;
  visibility: ProjectVisibility;
  deadline?: string;
  expectedOutcomes?: string;
  mentorRequired: boolean;
  githubRequired: boolean;
  tags: string[];
  status: ProjectStatus;
  githubRepo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  systemRole: SystemRole;
  roleId?: string;
  status: MemberStatus;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  projectId: string;
  applicantId: string;
  selectedRoleId: string;
  motivation: string;
  relevantExperience: string;
  message?: string;
  status: JoinStatus;
  rejectReason?: string;
  analysis?: CompatibilityAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  projectId: string;
  inviterId: string;
  inviteeId: string;
  roleId?: string;
  message?: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface DetailsRequest {
  id: string;
  projectId: string;
  userId: string;
  status: "pending" | "granted" | "denied";
  createdAt: string;
}

export interface MentorshipRequest {
  id: string;
  projectId: string;
  facultyId: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface AiStrength {
  category: string;
  evidence: string;
  impact: string;
}

export interface AiGap {
  category: string;
  gap: string;
  severity: "low" | "medium" | "high";
  evidence: string;
}

export interface AiRecommendation {
  priority: "low" | "medium" | "high";
  action: string;
  reason: string;
}

export interface AiScoreBreakdown {
  factor: string;
  score: number;
  max_score: number;
  explanation: string;
}

export interface AiProjectFitResult {
  match_score: number;
  summary: string;
  confidence: "high" | "medium" | "low";
  strengths: AiStrength[];
  gaps: AiGap[];
  recommendations: AiRecommendation[];
  score_breakdown?: AiScoreBreakdown[];
}

export interface AiAnalysisRecord {
  id: string;
  type: "compatibility" | "team_recommendation" | "skill_gap" | "project_summary";
  project_id: string;
  user_id: string;
  input_context?: Record<string, unknown>;
  output_result: AiProjectFitResult;
  model_used?: string;
  confidence?: "high" | "medium" | "low";
  created_at: string;
  expires_at?: string | null;
}

export interface CompatibilityAnalysis {
  compatibilityScore: number;
  skillMatch: number;
  interestMatch: number;
  roleMatch: number;
  experienceMatch: number;
  strengths: string[];
  gaps: string[];
  reason: string;
  confidence: AiConfidence;
  evidence: string[];
  disclaimer: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  roleId?: string;
  priority: TaskPriority;
  deadline?: string;
  status: TaskStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  projectId?: string;
  userId: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface ResearchNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceItem {
  id: string;
  projectId: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  link?: string;
  notes?: string;
  tags: string[];
  addedBy: string;
  createdAt: string;
}

export interface ExperimentRecord {
  id: string;
  projectId: string;
  name: string;
  objective: string;
  method: string;
  results: string;
  conclusion: string;
  date: string;
  createdBy: string;
}

export interface MeetingNote {
  id: string;
  projectId: string;
  date: string;
  attendees: string[];
  agenda: string;
  decisions: string;
  actionItems: string;
  createdBy: string;
}

export interface DatasetInfo {
  id: string;
  projectId: string;
  name: string;
  description: string;
  source?: string;
  license?: string;
  createdBy: string;
}

export interface DocumentItem {
  id: string;
  projectId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  access: DocumentAccess;
  uploadedBy: string;
  createdAt: string;
}

export interface Discussion {
  id: string;
  projectId: string;
  title: string;
  body: string;
  createdBy: string;
  createdAt: string;
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: "user" | "project";
  targetId: string;
  type: ReportType;
  details: string;
  status: ReportStatus;
  action?: ModerationAction;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}

export interface AiCallLog {
  id: string;
  type: string;
  success: boolean;
  createdAt: string;
}

export interface TeamRecommendation {
  role: string;
  candidateId: string;
  candidateName: string;
  compatibilityScore: number;
  reason: string;
}

export interface AppState {
  users: User[];
  profiles: Profile[];
  projects: Project[];
  members: ProjectMember[];
  joinRequests: JoinRequest[];
  invitations: Invitation[];
  detailsRequests: DetailsRequest[];
  mentorshipRequests: MentorshipRequest[];
  tasks: Task[];
  taskComments: TaskComment[];
  milestones: Milestone[];
  activity: ActivityLog[];
  notifications: Notification[];
  notes: ResearchNote[];
  references: ReferenceItem[];
  experiments: ExperimentRecord[];
  meetings: MeetingNote[];
  datasets: DatasetInfo[];
  documents: DocumentItem[];
  discussions: Discussion[];
  replies: DiscussionReply[];
  reports: Report[];
  auditLogs: AuditLog[];
  aiLogs: AiCallLog[];
  sessionUserId: string | null;
}

export const AI_DISCLAIMER =
  "This is an AI-estimated compatibility score, not an objective measurement of ability. AI recommends; humans decide.";
