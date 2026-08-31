const fs = require('fs');
let code = fs.readFileSync('src/lib/estate-data.ts', 'utf8');
code = code.replace(/body:/g, 'content:');
fs.writeFileSync('src/lib/estate-data.ts', code);
