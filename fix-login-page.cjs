const fs = require('fs');
let code = fs.readFileSync('src/pages/LoginPage.tsx', 'utf8');

code = code.replace("import { authenticateEstateUser, getStoredAppUsers } from '../lib/auth-helpers';", "import { authenticateEstateUser } from '../lib/auth-helpers';");

const oldFallback = `      // Local fallback for quick preview:
      if (!adminEmail.includes('@')) {
        const users = getStoredAppUsers();
        const adminUser = users.find(u => u.role === 'admin' || u.role === 'master_admin');
        if (adminUser) {
          if (onLoginSuccess) {
            onLoginSuccess(adminUser);
          } else {
            navigate('/admin');
          }
        }
        return;
      }`;

code = code.replace(oldFallback, "");
fs.writeFileSync('src/pages/LoginPage.tsx', code);
