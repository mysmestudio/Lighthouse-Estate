const fs = require('fs');
let code = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

code = code.replace("navigate('/admin')} style={{ cursor: 'pointer' }}><i>✓</i>Approvals</a>", "document.getElementById('sec-approvals')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}><i>✓</i>Approvals</a>");
code = code.replace("navigate('/admin')} style={{ cursor: 'pointer' }}><i>₦</i>Dues</a>", "document.getElementById('sec-dues')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}><i>₦</i>Dues</a>");
code = code.replace("navigate('/admin')} style={{ cursor: 'pointer' }}><i>≡</i>Logs</a>", "document.getElementById('sec-audit')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}><i>≡</i>Logs</a>");
code = code.replace("navigate('/admin')} style={{ cursor: 'pointer' }}><i>⚑</i>Notices</a>", "navigate('/notices')} style={{ cursor: 'pointer' }}><i>⚑</i>Notices</a>");

code = code.replace("navigate('/dashboard')} style={{ cursor: 'pointer' }}><i>▤</i>Passes</a>", "document.getElementById('sec-passes')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}><i>▤</i>Passes</a>");
code = code.replace("navigate('/dashboard')} style={{ cursor: 'pointer' }}><i>▦</i>Facilities</a>", "navigate('/facilities')} style={{ cursor: 'pointer' }}><i>▦</i>Facilities</a>");
code = code.replace("navigate('/dashboard')} style={{ cursor: 'pointer' }}><i>⚑</i>Notices</a>", "navigate('/notices')} style={{ cursor: 'pointer' }}><i>⚑</i>Notices</a>");

fs.writeFileSync('src/components/BottomNav.tsx', code);
