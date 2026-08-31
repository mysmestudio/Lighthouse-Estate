const fs = require('fs');
let content = fs.readFileSync('src/lib/estate-data.ts', 'utf8');

const newNotices = `export const INITIAL_NOTICES: EstateNotice[] = [
  {
    id: 'n1',
    title: 'Mandatory visitor pass pre-registration for Friday Jumu’ah',
    body: 'All non-resident Friday congregants must be issued digital visitor passes via the portal before 11:30 AM. Walk-ins without a pre-registered pass may be turned away at peak hours.',
    category: 'emergency',
    author_name: 'Estate Admin',
    author_role: 'admin',
    created_at: '2026-08-12T00:00:00.000Z'
  },
  {
    id: 'n2',
    title: 'Perimeter solar inverter upgrade & night illumination',
    body: 'The Central Infrastructure Committee has scheduled routine maintenance and battery replacement on the West wing perimeter lighting from Aug 16–18.',
    category: 'maintenance',
    author_name: 'Estate Admin',
    author_role: 'admin',
    created_at: '2026-08-10T00:00:00.000Z'
  },
  {
    id: 'n3',
    title: 'Estate levy reminder cycle begins September 1',
    body: 'Households with outstanding levies will receive a reminder notice. Contact the estate office to arrange a payment plan before the next reconciliation cycle.',
    category: 'info',
    author_name: 'Estate Admin',
    author_role: 'admin',
    created_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'n4',
    title: 'Madrasa registration open for the new term',
    body: 'Enrol resident or external learners via the registration form. Classes resume the second week of September at the estate mosque hall.',
    category: 'info',
    author_name: 'Madrasa Admin',
    author_role: 'madrasa_admin',
    created_at: '2026-08-05T00:00:00.000Z'
  }
];`;

content = content.replace(/export const INITIAL_NOTICES: EstateNotice\[\] = \[\];/, newNotices);
fs.writeFileSync('src/lib/estate-data.ts', content);
