const fs = require('fs');
let code = fs.readFileSync('src/lib/auth-helpers.ts', 'utf8');

const target = `        if (!userError && userData) {
          // Merge local status if it exists, since admin approvals might only succeed locally due to RLS in demo
          const localUser = getStoredAppUsers().find(u => u.auth_user_id === data.user.id || (u.house_number === userData.house_number && u.house_unit === userData.house_unit && u.role === userData.role));
          if (localUser && localUser.status) {
            userData.status = localUser.status;
          }
          if (userData.status !== 'active') {`;

const replacement = `        if (!userError && userData) {
          if (userData.status !== 'active') {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/auth-helpers.ts', code);
