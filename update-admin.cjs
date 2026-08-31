const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

content = content.replace(
  /import \{ getStoredPasses \} from '\.\.\/lib\/estate-data';/,
  `import { getStoredPasses } from '../lib/estate-data';\nimport { getDailyHadith } from '../lib/hadith-service';`
);

content = content.replace(
  /<div className="hadith">\s*<p className="q" style={{ fontSize: 15 }}>.*?<\/p>\s*<p className="src">.*?<\/p>\s*<\/div>/s,
  `<div className="hadith">
              <p className="q" style={{ fontSize: 15 }}>{getDailyHadith().quote}</p>
              <p className="src">{getDailyHadith().source}</p>
            </div>`
);

fs.writeFileSync('src/pages/AdminPage.tsx', content);
