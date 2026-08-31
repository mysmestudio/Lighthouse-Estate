const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

const replacement = `
            <div className="card dark">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4>Both gates</h4><span className="pill pill-live"><i className="dot"></i>Live</span>
              </div>
              <p className="tiny muted">142 movements logged today</p>
              
              {(() => {
                const logs = require('../lib/estate-data').getStoredAccessLogs().slice(0, 3);
                if (logs.length === 0) {
                  return (
                    <>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,.09)', marginTop: 12 }}>
                        <span className="sq" style={{ background: 'rgba(232,197,71,.18)', color: 'var(--gold)' }}>&#9790;</span>
                        <div className="grow">
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Night access &middot; 01:12 AM</div>
                          <p className="tiny muted">House 23 resident PIN &middot; Gate 1 &middot; flagged for the log only</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,.09)' }}>
                        <span className="sq" style={{ background: 'rgba(214,69,60,.2)', color: '#FF9A93' }}>&#10005;</span>
                        <div className="grow">
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Denied code &middot; 11:04 AM</div>
                          <p className="tiny muted">Expired delivery pass &middot; Gate 2</p>
                        </div>
                      </div>
                    </>
                  );
                }

                return logs.map((log: any, idx: number) => {
                  const hr = new Date(log.timestamp).getHours();
                  const isNight = hr >= 22 || hr < 5;
                  const isDenied = log.status === 'denied' || log.status === 'expired';
                  
                  let sqClass = 'sq';
                  let sqStyle: any = {};
                  let icon = '→';
                  let title = log.direction === 'in' ? 'Check in' : 'Check out';
                  
                  if (isNight) {
                    sqStyle = { background: 'rgba(232,197,71,.18)', color: 'var(--gold)' };
                    icon = '☾';
                    title = 'Night access';
                  } else if (isDenied) {
                    sqStyle = { background: 'rgba(214,69,60,.2)', color: '#FF9A93' };
                    icon = '✕';
                    title = 'Denied code';
                  } else {
                    sqStyle = { background: 'rgba(255,255,255,.1)', color: '#fff' };
                    icon = log.direction === 'in' ? '↓' : '↑';
                  }

                  const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  let subStr = \`\${log.visitor_name} &middot; \${log.guard_name}\`;
                  if (isNight) subStr += ' &middot; flagged for the log only';

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: idx > 0 || logs.length > 0 ? '1px solid rgba(255,255,255,.09)' : 'none', marginTop: idx === 0 ? 12 : 0 }}>
                      <span className={sqClass} style={sqStyle}>{icon}</span>
                      <div className="grow">
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{title} &middot; {timeStr}</div>
                        <p className="tiny muted" dangerouslySetInnerHTML={{ __html: subStr }}></p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
`;

code = code.replace(/<div className="card dark">[\s\S]*?<\/div>\s*<\/div>\s*<div className="section">/, replacement + '          </div>          <div className="section">');
fs.writeFileSync('src/pages/AdminPage.tsx', code);
