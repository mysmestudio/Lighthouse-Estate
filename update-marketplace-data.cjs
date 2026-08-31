const fs = require('fs');

let code = fs.readFileSync('src/lib/estate-data.ts', 'utf8');

const newData = `
const MARKETPLACE_KEY = 'lighthouse_marketplace_v3';
export function getStoredMarketplaceListings(): any[] {
  try {
    const data = localStorage.getItem(MARKETPLACE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: '1', seller_id: 'r1', seller_name: 'Resident', seller_phone: '08012345678', house_number: 23, title: '3-seater sofa set', price: 45000, category: 'furniture'
    },
    {
      id: '2', seller_id: 'r2', seller_name: 'Neighbor', seller_phone: '08087654321', house_number: 61, title: 'iPhone charger, new', price: 3500, category: 'electronics'
    },
    {
      id: '3', seller_id: 'r3', seller_name: 'Neighbor 2', seller_phone: '08099998888', house_number: 88, title: 'Kids bicycle', price: 0, category: 'giveaways'
    },
    {
      id: '4', seller_id: 'r4', seller_name: 'Neighbor 3', seller_phone: '08044445555', house_number: 14, title: 'Home cleaning service', price: 8000, category: 'services'
    },
    {
      id: '5', seller_id: 'r5', seller_name: 'Neighbor 4', seller_phone: '08011112222', house_number: 42, title: 'Dining table, 6-seater', price: 60000, category: 'furniture'
    },
    {
      id: '6', seller_id: 'r6', seller_name: 'Neighbor 5', seller_phone: '08033334444', house_number: 61, title: 'Baby clothes bundle', price: 0, category: 'giveaways'
    }
  ];
}
export function saveStoredMarketplaceListings(listings: any[]) {
  try {
    localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(listings));
  } catch(e) {}
}

const POLLS_KEY = 'lighthouse_polls_v3';
export function getStoredPolls(): any[] {
  try {
    const data = localStorage.getItem(POLLS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: 'p1',
      title: 'Automated barriers at Gate 2?',
      closesIn: '3d',
      status: 'open',
      description: 'Proposal to install automatic rising barriers at the secondary gate, reducing manual gatehouse staffing at night.',
      options: [
        { id: 'o1', label: 'Yes, install them', pct: 61 },
        { id: 'o2', label: 'No, keep it manual', pct: 24 },
        { id: 'o3', label: 'Need more information', pct: 15 }
      ],
      turnout: 68
    },
    {
      id: 'p2',
      title: 'Clubhouse renovation contractor',
      closesIn: '6d',
      status: 'open',
      description: 'Choose which shortlisted contractor should renovate the clubhouse lounge and rooftop.',
      options: [
        { id: 'o1', label: 'Adekunle Interiors', pct: 47 },
        { id: 'o2', label: 'Lekki Build Co.', pct: 33 },
        { id: 'o3', label: 'Prestige Fit-Out', pct: 20 }
      ],
      turnout: 52
    },
    {
      id: 'p3',
      title: 'Increase monthly security levy by ₦2,000',
      closesIn: 'closed Aug 3',
      status: 'closed',
      passed: true,
      turnout: 74
    },
    {
      id: 'p4',
      title: 'Switch estate waste vendor',
      closesIn: 'closed Jul 21',
      status: 'closed',
      passed: false,
      turnout: 58
    }
  ];
}
export function saveStoredPolls(polls: any[]) {
  try {
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
  } catch(e) {}
}

const POLL_VOTES_KEY = 'lighthouse_poll_votes_v3';
export function getStoredPollVotes(): any[] {
  try {
    const data = localStorage.getItem(POLL_VOTES_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}
export function saveStoredPollVotes(votes: any[]) {
  try {
    localStorage.setItem(POLL_VOTES_KEY, JSON.stringify(votes));
  } catch(e) {}
}

const SOS_EVENTS_KEY = 'lighthouse_sos_events_v3';
export function getStoredSosEvents(): any[] {
  try {
    const data = localStorage.getItem(SOS_EVENTS_KEY);
    if (data) return JSON.parse(data);
  } catch(e) {}
  return [
    {
      id: 's1',
      resident_name: 'Dr. Tariq Al-Mansoor',
      house_number: 14,
      resident_phone: '0803 555 0142',
      triggered_at: new Date(Date.now() - 14 * 1000).toISOString(),
      status: 'triggered'
    },
    {
      id: 's2',
      resident_name: 'Fatima Bello',
      house_number: 61,
      triggered_at: new Date(Date.now() - 8 * 3600000).toISOString(),
      status: 'acknowledged',
      acknowledged_by: 'Chinedu A.',
      notes: 'acknowledged by you, 2 min response'
    },
    {
      id: 's3',
      resident_name: 'David Okonkwo',
      house_number: 23,
      triggered_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      status: 'resolved',
      notes: 'false alarm, confirmed by resident'
    },
    {
      id: 's4',
      resident_name: 'Musa I., Gate 2',
      is_guard: true,
      triggered_at: new Date(Date.now() - 28 * 3600000).toISOString(),
      status: 'resolved',
      notes: 'backup dispatched, resolved'
    }
  ];
}
export function saveStoredSosEvents(events: any[]) {
  try {
    localStorage.setItem(SOS_EVENTS_KEY, JSON.stringify(events));
  } catch(e) {}
}
`;

fs.writeFileSync('src/lib/estate-data.ts', code + '\n' + newData);
