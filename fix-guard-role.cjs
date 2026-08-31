const fs = require('fs');
let code = fs.readFileSync('src/pages/GuardSosPanelPage.tsx', 'utf8');
code = code.replace("currentUser?.role === 'security_guard'", "currentUser?.role === 'security'");
fs.writeFileSync('src/pages/GuardSosPanelPage.tsx', code);
