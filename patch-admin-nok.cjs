const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

const target = `<div className="s">House {r.house_number} &#183; {r.house_unit || 'Main'}</div>`;
const replacement = `<div className="s">House {r.house_number} &#183; {r.house_unit || 'Main'}</div>
                  {r.emergency_contact_name && <div className="s" style={{ fontSize: 10 }}>Next of kin: {r.emergency_contact_name} ({r.emergency_contact_phone})</div>}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/AdminPage.tsx', code);
