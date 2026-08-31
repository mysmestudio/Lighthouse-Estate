const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

code = code.replace("import { getStoredAppUsers, updateAppUserStatus } from '../lib/auth-helpers';", "import { getAppUsers, updateAppUserStatus } from '../lib/auth-helpers';");

const loadPendingReplacement = `  const loadPending = async () => {
    const users = await getAppUsers();
    setPendingResidents(users.filter(u => u.status === 'pending'));
    
    // We will keep staff local mock if they are, but for now just fix residents.
    const staff = getStoredStaffKYC().filter(s => s.status === 'pending');
    setPendingStaff(staff);
  };`;

code = code.replace(/  const loadPending = \(\) => {[\s\S]*?  };/, loadPendingReplacement);

fs.writeFileSync('src/pages/AdminPage.tsx', code);
