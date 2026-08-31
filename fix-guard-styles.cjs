const fs = require('fs');

let code = fs.readFileSync('src/pages/GuardSosPanelPage.tsx', 'utf8');

code = code.replace('<div className="shell">', '<div className="shell" style={{ backgroundColor: "var(--deep-800)", color: "#fff", minHeight: "100vh" }}>');

fs.writeFileSync('src/pages/GuardSosPanelPage.tsx', code);
