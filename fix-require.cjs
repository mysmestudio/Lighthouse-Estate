const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

// Add import if not present
if (!code.includes("import { getStoredAccessLogs }")) {
  code = code.replace("import { getStoredAppUsers, updateAppUserStatus } from '../lib/auth-helpers';", "import { getStoredAppUsers, updateAppUserStatus } from '../lib/auth-helpers';\nimport { getStoredAccessLogs } from '../lib/estate-data';");
}

code = code.replace("const logs = require('../lib/estate-data').getStoredAccessLogs().slice(0, 3);", "const logs = getStoredAccessLogs().slice(0, 3);");

fs.writeFileSync('src/pages/AdminPage.tsx', code);
