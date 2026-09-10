const fs = require('fs');

// Fix Register.tsx
let reg = fs.readFileSync('src/pages/Register.tsx', 'utf8');
reg = reg.replace('GraduationCap, Building2, AlertCircle', 'GraduationCap, Building2, AlertCircle, CheckCircle2');
fs.writeFileSync('src/pages/Register.tsx', reg);

// Fix Dashboard.tsx
let dash = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
dash = dash.replace(
  'import { ProjectCard, PersonCard } from "@/components/projects/ProjectCard";',
  `import { ProjectCard, PersonCard } from "@/components/projects/ProjectCard";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";`
);
dash = dash.replace(
  'MentorshipRequest, Profile } from "@/types";',
  'MentorshipRequest, Profile, Proficiency } from "@/types";'
);
dash = dash.replace(
  'fetchAllProfiles,\n} from "@/lib/supabase-db";',
  'fetchAllProfiles,\n  saveProfile,\n} from "@/lib/supabase-db";'
);
dash = dash.replace(/const handleDeleteSkill = [\s\S]*?refresh\(\);\n  };\n/g, '');
dash = dash.replace(/const handleDeleteInterest = [\s\S]*?refresh\(\);\n  };\n/g, '');
fs.writeFileSync('src/pages/Dashboard.tsx', dash);

// Fix Profile.tsx
let prof = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
prof = prof.replace(
  'const [saving, setSaving] = useState(false);',
  `const [saving, setSaving] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProf, setNewSkillProf] = useState<Proficiency>("intermediate");
  const [addInterestOpen, setAddInterestOpen] = useState(false);
  const [newInterestName, setNewInterestName] = useState("");`
);
prof = prof.replace(
  'ReportType } from "@/types";',
  'ReportType, Proficiency } from "@/types";'
);
prof = prof.replace(/const handleDeleteSkill = [\s\S]*?refresh\(\);\n  };\n/g, '');
prof = prof.replace(/const handleDeleteInterest = [\s\S]*?refresh\(\);\n  };\n/g, '');
fs.writeFileSync('src/pages/Profile.tsx', prof);

console.log('Fixed syntax issues.');
