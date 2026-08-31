const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.roletag')) {
  css += '\n.roletag { font-size: 10.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; background: rgba(232,197,71,.18); color: var(--gold); padding: 3px 9px; border-radius: 999px; margin-left: 2px; }\n';
  fs.writeFileSync('src/index.css', css);
}
