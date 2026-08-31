const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('MadrasaAdminPage')) {
  code = code.replace("import { GuardSosPanelPage } from './pages/GuardSosPanelPage';", "import { GuardSosPanelPage } from './pages/GuardSosPanelPage';\nimport { MadrasaAdminPage } from './pages/MadrasaAdminPage';");
  
  code = code.replace("case '/gate/alerts':", "case '/madrasa':\n        return <MadrasaAdminPage currentUser={currentUser} navigate={navigate} onLogout={handleLogout} />;\n      case '/gate/alerts':");
  
  fs.writeFileSync('src/App.tsx', code);
}
