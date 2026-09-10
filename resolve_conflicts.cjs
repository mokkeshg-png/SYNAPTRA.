const fs = require('fs');

function fix(file) {
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
    console.log('Fixed', file);
  }
}

['src/lib/store.ts', 'src/pages/Dashboard.tsx', 'src/pages/Admin.tsx', 'src/pages/Profile.tsx', 'src/pages/Register.tsx'].forEach(f => {
    try {
        // first restore original
        require('child_process').execSync('git restore ' + f);
        fix(f);
    } catch(e) {
        console.error(e);
    }
});
