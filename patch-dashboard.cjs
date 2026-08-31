const fs = require('fs');
let code = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

code = code.replace('<div className="section">\n            <div className="section-head"><h3>Visitor passes</h3>', '<div className="section" id="sec-passes">\n            <div className="section-head"><h3>Visitor passes</h3>');

const oldTiles = `<div className="tiles">
              <button className="tile"><span className="ico green">&#8853;</span><span className="n">Fix-it tickets</span><span className="d">Report issue</span></button>
              <button className="tile"><span className="ico">&#9733;</span><span className="n">Directory</span><span className="d">Find neighbors</span></button>
              <button className="tile"><span className="ico">&#8358;</span><span className="n">Marketplace</span><span className="d">Buy &amp; sell</span></button>
              <button className="tile"><span className="ico blue">&#9873;</span><span className="n">Polls &amp; surveys</span><span className="d">Cast vote</span></button>
              <button className="tile"><span className="ico">&#9998;</span><span className="n">Madrasa</span><span className="d">View calendar</span></button>
              <button className="tile"><span className="ico">&#9881;</span><span className="n">Settings</span><span className="d">Profile &amp; pref</span></button>
            </div>`;

const newTiles = `<div className="tiles">
              <button className="tile" onClick={() => navigate('/fix-it-tickets')}><span className="ico green">&#8853;</span><span className="n">Fix-it tickets</span><span className="d">Report issue</span></button>
              <button className="tile" onClick={() => navigate('/directory')}><span className="ico">&#9733;</span><span className="n">Directory</span><span className="d">Find neighbors</span></button>
              <button className="tile" onClick={() => navigate('/marketplace')}><span className="ico">&#8358;</span><span className="n">Marketplace</span><span className="d">Buy &amp; sell</span></button>
              <button className="tile" onClick={() => navigate('/polls')}><span className="ico blue">&#9873;</span><span className="n">Polls &amp; surveys</span><span className="d">Cast vote</span></button>
              <button className="tile" onClick={() => navigate('/madrasa')}><span className="ico">&#9998;</span><span className="n">Madrasa</span><span className="d">View calendar</span></button>
              <button className="tile" onClick={() => navigate('/settings')}><span className="ico">&#9881;</span><span className="n">Settings</span><span className="d">Profile &amp; pref</span></button>
            </div>`;

code = code.replace(oldTiles, newTiles);

fs.writeFileSync('src/pages/DashboardPage.tsx', code);
