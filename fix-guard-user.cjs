const fs = require('fs');

let code = fs.readFileSync('src/pages/GuardSosPanelPage.tsx', 'utf8');
code = code.replace("currentUser?.work_location", "currentUser?.role === 'security_guard' ? 'Gate 1' : ''");
fs.writeFileSync('src/pages/GuardSosPanelPage.tsx', code);
