const fs = require('fs');
let content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

content = content.replace(
  /<p className="tiny" style={{ color: 'var(--gold)', fontWeight: 700 }}>Assalamu Alaikum<\/p>/g,
  `<p className="tiny" style={{ color: 'var(--gold)', fontWeight: 700 }}>&#1575;&#1604;&#1587;&#1617;&#1604;&#1575;&#1605; &#1593;&#1604;&#1610;&#1603;&#1605; &#183; Assalam Alaekum Waramotullahi Wabarakatu</p>`
);

content = content.replace(
  /import \{ getStoredNotices \} from '\.\.\/lib\/estate-data';/,
  `import { getStoredNotices } from '../lib/estate-data';\nimport { getDailyHadith } from '../lib/hadith-service';`
);

content = content.replace(
  /<div className="hadith" style={{ marginTop: 20 }}>\s*<p className="q" style={{ fontSize: 15 }}>.*?<\/p>\s*<p className="src">.*?<\/p>\s*<\/div>/s,
  `<div className="hadith" style={{ marginTop: 20 }}>
          <p className="q" style={{ fontSize: 15 }}>{getDailyHadith().quote}</p>
          <p className="src">{getDailyHadith().source}</p>
        </div>`
);

fs.writeFileSync('src/pages/DashboardPage.tsx', content);
