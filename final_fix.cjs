const fs = require('fs');
const cp = require('child_process');

try {
  cp.execSync('git restore .');
} catch (e) {
  console.log('git restore failed', e.message);
}

const filesToFix = ['src/lib/store.ts', 'src/pages/Dashboard.tsx', 'src/pages/Admin.tsx', 'src/pages/Profile.tsx', 'src/pages/Register.tsx'];

for (const file of filesToFix) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  while (content.includes('<<<<<<< Updated upstream')) {
    const start = content.indexOf('<<<<<<< Updated upstream');
    const startLineEnd = content.indexOf('\n', start) + 1;
    
    let mid = content.indexOf('=======\n', startLineEnd);
    if (mid === -1) mid = content.indexOf('=======\r\n', startLineEnd);
    if (mid === -1) break;
    
    const midLineEnd = content.indexOf('\n', mid) + 1;
    
    const end = content.indexOf('>>>>>>>', midLineEnd);
    if (end === -1) break;
    
    let endLineEnd = content.indexOf('\n', end);
    if (endLineEnd === -1) endLineEnd = content.length;
    else endLineEnd += 1;
    
    const upstreamContent = content.substring(startLineEnd, mid);
    content = content.substring(0, start) + upstreamContent + content.substring(endLineEnd);
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
  }
}

// Register.tsx missing bracket fix
let reg = fs.readFileSync('src/pages/Register.tsx', 'utf8');
reg = reg.replace('</Card>\n\n        <p className="text-center text-xs text-ink-500">', '</Card>\n        )}\n\n        <p className="text-center text-xs text-ink-500">');
reg = reg.replace('</Card>\r\n\r\n        <p className="text-center text-xs text-ink-500">', '</Card>\r\n        )}\r\n\r\n        <p className="text-center text-xs text-ink-500">');
reg = reg.replace('GraduationCap, Building2, AlertCircle', 'GraduationCap, Building2, AlertCircle, CheckCircle2');
fs.writeFileSync('src/pages/Register.tsx', reg);

// Dashboard.tsx fixes
let dash = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
if (!dash.includes('saveProfile')) dash = dash.replace('fetchAllProfiles,', 'fetchAllProfiles,\n  saveProfile,');
if (!dash.includes('Proficiency }')) dash = dash.replace('MentorshipRequest, Profile } from "@/types";', 'MentorshipRequest, Profile, Proficiency } from "@/types";');
if (!dash.includes('Modal')) dash = dash.replace('import { ProjectCard, PersonCard } from "@/components/projects/ProjectCard";', 'import { ProjectCard, PersonCard } from "@/components/projects/ProjectCard";\nimport { Modal } from "@/components/ui/Modal";\nimport { Field, Input, Select } from "@/components/ui/Field";');

dash = dash.replace(/const handleDeleteSkill = [\s\S]*?refresh\(\);\n  };\n/g, '');
dash = dash.replace(/const handleDeleteSkill = [\s\S]*?refresh\(\);\r\n  };\r\n/g, '');
dash = dash.replace(/const handleDeleteInterest = [\s\S]*?refresh\(\);\n  };\n/g, '');
dash = dash.replace(/const handleDeleteInterest = [\s\S]*?refresh\(\);\r\n  };\r\n/g, '');
fs.writeFileSync('src/pages/Dashboard.tsx', dash);

// Profile.tsx fixes
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
if (!prof.includes('Proficiency }')) {
  prof = prof.replace('ReportType } from "@/types";', 'ReportType, Proficiency } from "@/types";');
}
prof = prof.replace(/const handleDeleteSkill = [\s\S]*?refresh\(\);\n  };\n/g, '');
prof = prof.replace(/const handleDeleteSkill = [\s\S]*?refresh\(\);\r\n  };\r\n/g, '');
prof = prof.replace(/const handleDeleteInterest = [\s\S]*?refresh\(\);\n  };\n/g, '');
prof = prof.replace(/const handleDeleteInterest = [\s\S]*?refresh\(\);\r\n  };\r\n/g, '');
fs.writeFileSync('src/pages/Profile.tsx', prof);

console.log('Final fixes applied.');
