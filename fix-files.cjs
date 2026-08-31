const fs = require('fs');

// Fix types/index.ts
let types = fs.readFileSync('src/types/index.ts', 'utf8');
types = types.replace('\\n// Madrasa Types', '\n// Madrasa Types');
fs.writeFileSync('src/types/index.ts', types);

// Fix MadrasaAdminPage.tsx
let page = fs.readFileSync('src/pages/MadrasaAdminPage.tsx', 'utf8');
page = page.replace(/\\`/g, '`');
page = page.replace(/\\\$/g, '$'); // Just in case, though I used ${...} not \${...}
fs.writeFileSync('src/pages/MadrasaAdminPage.tsx', page);
