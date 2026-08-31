const fs = require('fs');
let code = fs.readFileSync('src/pages/HouseholdHubPage.tsx', 'utf8');

const target = `<div className="mt-8 pt-8 border-t border-[rgba(255,255,255,0.1)]">`;
const replacement = `
            {currentUser.emergency_contact_name && (
              <div className="mt-8 pt-8 border-t border-[rgba(255,255,255,0.1)]">
                <h3 className="text-xl mb-4 font-semibold">Emergency Contacts</h3>
                <div className="card">
                  <p className="text-sm muted mb-1">Next of Kin</p>
                  <p className="font-medium text-[var(--mint)]">{currentUser.emergency_contact_name}</p>
                  <p className="text-sm mt-1">{currentUser.emergency_contact_phone} • {currentUser.emergency_relationship}</p>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-8 border-t border-[rgba(255,255,255,0.1)]">`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/HouseholdHubPage.tsx', code);
