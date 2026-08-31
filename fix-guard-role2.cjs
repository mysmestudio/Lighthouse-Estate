const fs = require('fs');
let code = fs.readFileSync('src/pages/GuardSosPanelPage.tsx', 'utf8');
code = code.replace("{currentUser?.role === 'security' ? 'Gate 1' : ''}", "Gate 1");
fs.writeFileSync('src/pages/GuardSosPanelPage.tsx', code);
