const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

const targetButtons = `<div className="tiles">
              <button className="tile"><span className="ico">&#10003;</span><span className="n">Approvals</span><span className="d">Residents &amp; staff</span></button>
              <button className="tile"><span className="ico gold">&#8358;</span><span className="n">Reconcile dues</span><span className="d">Levies &amp; exemptions</span></button>
              <button className="tile"><span className="ico">&#8801;</span><span className="n">Audit logs</span><span className="d">Gate history</span></button>
              <button className="tile"><span className="ico">&#2691;</span><span className="n">Post notice</span><span className="d">Broadcast</span></button>
              <button className="tile"><span className="ico red">&#9888;</span><span className="n">Alerts</span><span className="d">SOS &amp; overstay</span></button>
              <button className="tile"><span className="ico">&#9919;</span><span className="n">Guard accounts</span><span className="d">Issue gate PINs</span></button>
            </div>`;

const newButtons = `<div className="tiles">
              <button className="tile" onClick={() => { document.getElementById('sec-approvals')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="ico">&#10003;</span><span className="n">Approvals</span><span className="d">Residents &amp; staff</span></button>
              <button className="tile" onClick={() => { document.getElementById('sec-dues')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="ico gold">&#8358;</span><span className="n">Reconcile dues</span><span className="d">Levies &amp; exemptions</span></button>
              <button className="tile" onClick={() => { document.getElementById('sec-audit')?.scrollIntoView({ behavior: 'smooth' }); }}><span className="ico">&#8801;</span><span className="n">Audit logs</span><span className="d">Gate history</span></button>
              <button className="tile" onClick={() => navigate('/notices')}><span className="ico">&#2691;</span><span className="n">Post notice</span><span className="d">Broadcast</span></button>
              <button className="tile" onClick={() => navigate('/gate/alerts')}><span className="ico red">&#9888;</span><span className="n">Alerts</span><span className="d">SOS &amp; overstay</span></button>
              <button className="tile" onClick={() => alert('Guard Accounts management coming soon. Guards are currently pre-populated.')}><span className="ico">&#9919;</span><span className="n">Guard accounts</span><span className="d">Issue gate PINs</span></button>
            </div>`;

code = code.replace(targetButtons, newButtons);

code = code.replace('<div className="section">\n            <div className="section-head"><h3>Pending approvals</h3>', '<div className="section" id="sec-approvals">\n            <div className="section-head"><h3>Pending approvals</h3>');
code = code.replace('<div className="section">\n            <div className="section-head"><h3>Estate-wide gate activity</h3>', '<div className="section" id="sec-audit">\n            <div className="section-head"><h3>Estate-wide gate activity</h3>');
code = code.replace('<div className="section">\n            <div className="section-head"><h3>Dues &amp; levies</h3>', '<div className="section" id="sec-dues">\n            <div className="section-head"><h3>Dues &amp; levies</h3>');

fs.writeFileSync('src/pages/AdminPage.tsx', code);
