const fs = require('fs');

let dash = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const missingImports = `
import { saveProfile } from "@/lib/supabase-db";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
`;
if (!dash.includes('import { Modal }')) {
  dash = missingImports + dash;
}
fs.writeFileSync('src/pages/Dashboard.tsx', dash);

console.log('Prepended unconditionally.');
