# SYNAPTRA Database Schema Flowchart & Architecture

This document visualizes the complete database architecture for SYNAPTRA, outlining the structural hierarchy, entity relationships (ER), and core data flows. 

---

## 1. Structural Hierarchy

This clean ER-style tree represents the logical grouping and top-down flow of the system components.

```text
AUTH
↓
USERS (auth.users)
↓
PROFILES
├── STUDENT_PROFILES
└── FACULTY_PROFILES

USER DATA
├── USER_SKILLS → SKILLS
├── USER_INTERESTS → RESEARCH_INTERESTS
├── USER_PAST_PROJECTS
├── USER_PUBLICATIONS
├── USER_CERTIFICATIONS
├── USER_INTERNSHIPS
└── GITHUB_CONNECTIONS

PROJECT
↓
PROJECTS
├── PROJECT_ROLES
├── PROJECT_MEMBERS
├── PROJECT_INVITATIONS
├── JOIN_REQUESTS
├── TEAM_RECOMMENDATIONS
├── TASKS
├── TASK_COMMENTS
├── MILESTONES
├── DOCUMENTS
├── RESEARCH_NOTES
├── REFERENCE_ITEMS
├── EXPERIMENTS
├── MEETING_NOTES
├── DATASETS
├── DISCUSSIONS
├── DISCUSSION_REPLIES
├── GITHUB_REPOSITORIES
└── GITHUB_ACTIVITY

AI
├── AI_ANALYSES
└── TEAM_RECOMMENDATIONS

SYSTEM
├── NOTIFICATIONS
├── ACTIVITY_LOGS
├── REPORTS
└── ADMIN_ACTIONS

TAXONOMY
├── SKILLS
├── SKILL_CATEGORIES
├── RESEARCH_INTERESTS
├── INTEREST_CATEGORIES
└── PROJECT_TYPES
```

---

## 2. Entity Relationship (ER) Diagrams

*The following diagrams illustrate the Primary Key (PK) and Foreign Key (FK) relationships, denoting one-to-one (`||--||`), one-to-many (`||--o{`), and many-to-many relationships.*

### A. Authentication & Profiles
```mermaid
erDiagram
    auth_users {
        uuid id PK
        string email
    }
    profiles {
        uuid id PK,FK "1:1 with auth.users"
        platform_role role
        account_status status
        string full_name
    }
    student_profiles {
        uuid profile_id PK,FK "1:1 with profiles"
        string degree_program
    }
    faculty_profiles {
        uuid profile_id PK,FK "1:1 with profiles"
        string designation
    }

    auth_users ||--|| profiles : "authenticates"
    profiles ||--|o student_profiles : "extends (student)"
    profiles ||--|o faculty_profiles : "extends (faculty)"
```

### B. Skills, Interests & Taxonomy
```mermaid
erDiagram
    skill_categories ||--o{ skills : "categorizes (1:M)"
    interest_categories ||--o{ research_interests : "categorizes (1:M)"

    profiles ||--o{ user_skills : "has (1:M)"
    skills ||--o{ user_skills : "referenced by (1:M)"
    
    profiles ||--o{ user_interests : "has (1:M)"
    research_interests ||--o{ user_interests : "referenced by (1:M)"

    profiles ||--o{ user_past_projects : "lists (1:M)"
    profiles ||--o{ user_internships : "lists (1:M)"
    profiles ||--o{ user_certifications : "lists (1:M)"
    profiles ||--o{ user_publications : "lists (1:M)"
```

### C. Projects & Membership
```mermaid
erDiagram
    profiles ||--o{ projects : "owns via owner_id (1:M)"
    projects ||--o{ project_roles : "defines (1:M)"
    
    projects ||--o{ project_members : "contains (1:M)"
    profiles ||--o{ project_members : "joins via user_id (1:M)"
    project_roles ||--o{ project_members : "assigned via role_id (1:M)"

    projects ||--o{ join_requests : "receives (1:M)"
    profiles ||--o{ join_requests : "applies via applicant_id (1:M)"
    project_roles ||--o{ join_requests : "requests via selected_role_id (1:M)"

    projects ||--o{ project_invitations : "issues (1:M)"
    projects ||--o{ details_requests : "receives (1:M)"
    projects ||--o{ mentorship_requests : "receives (1:M)"
```

### D. Collaboration & Research Workspace
```mermaid
erDiagram
    projects ||--o{ tasks : "tracks (1:M)"
    profiles ||--o{ tasks : "assigned_to / created_by (1:M)"
    tasks ||--o{ task_comments : "has (1:M)"
    
    projects ||--o{ milestones : "tracks (1:M)"
    projects ||--o{ research_notes : "contains (1:M)"
    projects ||--o{ reference_items : "contains (1:M)"
    projects ||--o{ experiments : "contains (1:M)"
    projects ||--o{ meeting_notes : "contains (1:M)"
    projects ||--o{ datasets : "contains (1:M)"
    projects ||--o{ documents : "contains (1:M)"

    projects ||--o{ discussions : "hosts (1:M)"
    discussions ||--o{ discussion_replies : "has (1:M)"
```

### E. AI, GitHub & System
```mermaid
erDiagram
    %% AI
    projects ||--o{ ai_analyses : "analyzed via project_id (1:M)"
    profiles ||--o{ ai_analyses : "analyzed via user_id (1:M)"
    ai_analyses ||--o{ join_requests : "scores via ai_analysis_id (1:1)"
    projects ||--o{ team_recommendations : "receives (1:M)"
    ai_analyses ||--o{ team_recommendations : "based on (1:M)"

    %% GitHub
    profiles ||--|| github_connections : "links via profile_id (1:1)"
    projects ||--o{ github_repositories : "links via project_id (1:M)"
    github_repositories ||--o{ github_activity : "generates via repository_id (1:M)"

    %% System
    profiles ||--o{ notifications : "receives via user_id (1:M)"
    projects ||--o{ activity_logs : "generates via project_id (1:M)"
    
    profiles ||--o{ reports : "files via reporter_id (1:M)"
    profiles ||--o{ admin_actions : "performs via admin_id (1:M)"
```

---

## 3. Data & Application Workflows

### Main Application Data Flow
```mermaid
flowchart TD
    User([User]) --> Profile[Profile]
    Profile --> SkillsInterests[Skills / Interests]
    SkillsInterests --> ProjectDiscovery[Project Discovery]
    ProjectDiscovery --> Project[Project]
    Project --> ProjectRoles[Project Roles]
    ProjectRoles --> JoinRequest[Join Request]
    JoinRequest --> AIAnalysis[AI Compatibility Analysis]
    AIAnalysis --> OwnerDecision[Owner Decision]
    OwnerDecision --> ProjectMember[Project Member]
    ProjectMember --> Collab[Tasks / Research / Documents / Discussions]
    Collab --> ActivityNotifs[Activity / Notifications]
```

### AI Flow
```mermaid
flowchart TD
    Data[Project + Applicant Data] --> AIAnalysis[AI Analysis]
    AIAnalysis --> CompScore[Compatibility Score]
    AIAnalysis --> TeamRec[Team Recommendation]
    AIAnalysis --> SkillGap[Skill Gap Analysis]
    CompScore --> HumanDec[Human Decision]
    TeamRec --> HumanDec
    SkillGap --> HumanDec
```

### GitHub Flow
```mermaid
flowchart TD
    User([User]) --> GHConn[GitHub Connection]
    GHConn --> GHRepo[GitHub Repository]
    GHRepo --> GHActivity[GitHub Activity]
    GHActivity --> Evidence[Skill Evidence / AI Analysis]
```

### Admin Flow
```mermaid
flowchart TD
    Admin([Admin]) --> Data[Users / Projects / Reports]
    Data --> Actions[Admin Actions]
    Actions --> Audit[Activity / Audit information]
```
