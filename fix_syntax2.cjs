const fs = require('fs');

function fixDash() {
  let dash = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
  
  // Fix imports
  if (!dash.includes('saveProfile')) {
    dash = dash.replace('fetchAllProfiles,', 'fetchAllProfiles,\n  saveProfile,');
  }

  // Comment out unused functions
  dash = dash.replace(/const handleDeleteSkill = [\s\S]*?refresh\(\);\n  };\n/g, '/* $& */');
  dash = dash.replace(/const handleDeleteInterest = [\s\S]*?refresh\(\);\n  };\n/g, '/* $& */');
  
  fs.writeFileSync('src/pages/Dashboard.tsx', dash);
}

function fixProf() {
  let prof = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
  
  // Comment out unused functions
  prof = prof.replace(/const handleDeleteSkill = [\s\S]*?refresh\(\);\n  };\n/g, '/* $& */');
  prof = prof.replace(/const handleDeleteInterest = [\s\S]*?refresh\(\);\n  };\n/g, '/* $& */');
  
  fs.writeFileSync('src/pages/Profile.tsx', prof);
}

fixDash();
fixProf();
console.log('Fixed.');
