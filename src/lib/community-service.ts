import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Poll, 
  PollOption, 
  PollVote, 
  PollWithStats, 
  PollVisibility, 
  FixItTicket, 
  TicketCategory, 
  TicketStatus, 
  MarketplaceListing, 
  MarketplaceCategory,
  AppUser 
} from '../types';

// ==========================================
// LOCAL STORAGE KEYS & INITIAL SEED DATA
// ==========================================

const STORAGE_POLLS_KEY = 'lighthouse_community_polls_v2';
const STORAGE_VOTES_KEY = 'lighthouse_community_poll_votes_v2';
const STORAGE_TICKETS_KEY = 'lighthouse_community_tickets_v2';
const STORAGE_MARKETPLACE_KEY = 'lighthouse_community_marketplace_v2';

// Initial Polls
const INITIAL_DEMO_POLLS: Poll[] = [];
const INITIAL_DEMO_VOTES: PollVote[] = [];

// Initial Fix-It Tickets
const INITIAL_DEMO_TICKETS: FixItTicket[] = [];

// Initial Marketplace Listings
const INITIAL_DEMO_MARKETPLACE: MarketplaceListing[] = [];

// ==========================================
// STORAGE HELPERS (SAFE LOCAL SYNCHRONIZATION)
// ==========================================

export function getStoredPolls(): Poll[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_POLLS_KEY);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(STORAGE_POLLS_KEY, JSON.stringify(INITIAL_DEMO_POLLS));
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_DEMO_POLLS;
}

export function saveStoredPolls(polls: Poll[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_POLLS_KEY, JSON.stringify(polls));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getStoredPollVotes(): PollVote[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_VOTES_KEY);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(STORAGE_VOTES_KEY, JSON.stringify(INITIAL_DEMO_VOTES));
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_DEMO_VOTES;
}

export function saveStoredPollVotes(votes: PollVote[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_VOTES_KEY, JSON.stringify(votes));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getStoredTickets(): FixItTicket[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_TICKETS_KEY);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(INITIAL_DEMO_TICKETS));
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_DEMO_TICKETS;
}

export function saveStoredTickets(tickets: FixItTicket[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(tickets));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getStoredMarketplaceListings(): MarketplaceListing[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_MARKETPLACE_KEY);
      if (saved) return JSON.parse(saved);
      localStorage.setItem(STORAGE_MARKETPLACE_KEY, JSON.stringify(INITIAL_DEMO_MARKETPLACE));
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_DEMO_MARKETPLACE;
}

export function saveStoredMarketplaceListings(listings: MarketplaceListing[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_MARKETPLACE_KEY, JSON.stringify(listings));
    }
  } catch (e) {
    console.error(e);
  }
}

// ==========================================
// 1. TOWNHALL POLLS SERVICES
// ==========================================

export async function fetchPollsWithStats(currentUserId?: string): Promise<PollWithStats[]> {
  let polls: Poll[] = [];
  let votes: PollVote[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data: dbPolls, error: pollsErr } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: dbVotes, error: votesErr } = await supabase
        .from('poll_votes')
        .select('*');

      if (!pollsErr && dbPolls && dbPolls.length > 0) {
        polls = dbPolls as Poll[];
        votes = (dbVotes || []) as PollVote[];
      }
    } catch (e) {
      console.warn('Supabase polls fetch fallback to local:', e);
    }
  }

  if (polls.length === 0) {
    polls = getStoredPolls();
    votes = getStoredPollVotes();
  }

  // Compute live horizontal bar percentages and visibility rule
  return polls.map((poll) => {
    const pollVotes = votes.filter((v) => v.poll_id === poll.id);
    const totalVotes = pollVotes.length;

    const userVote = currentUserId 
      ? pollVotes.find((v) => v.voter_id === currentUserId)
      : null;

    const isClosed = poll.status === 'closed' || (poll.close_date && new Date(poll.close_date) <= new Date());

    let canViewResults = false;
    if (poll.results_visibility === 'always') {
      canViewResults = true;
    } else if (poll.results_visibility === 'after_vote') {
      canViewResults = Boolean(userVote) || isClosed;
    } else if (poll.results_visibility === 'after_close') {
      canViewResults = isClosed;
    }

    const optionVoteCounts: Record<string, number> = {};
    const optionVotePercentages: Record<string, number> = {};

    poll.options.forEach((opt) => {
      const count = pollVotes.filter((v) => v.option_id === opt.id).length;
      optionVoteCounts[opt.id] = count;
      optionVotePercentages[opt.id] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    });

    return {
      ...poll,
      status: isClosed ? 'closed' : poll.status,
      votesCount: totalVotes,
      userVotedOptionId: userVote?.option_id || null,
      optionVoteCounts,
      optionVotePercentages,
      canViewResults,
    };
  });
}

export async function createTownhallPoll(data: {
  question: string;
  description?: string;
  options: string[]; // 2 to 4 options
  results_visibility: PollVisibility;
  close_date?: string | null;
  creator: AppUser;
}): Promise<{ success: boolean; poll?: Poll; error?: string }> {
  if (data.options.length < 2 || data.options.length > 4) {
    return { success: false, error: 'Poll must have between 2 and 4 options.' };
  }

  const pollId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `poll-${Date.now()}`;

  const formattedOptions: PollOption[] = data.options
    .filter((o) => o.trim().length > 0)
    .map((optText, idx) => ({
      id: `opt-${pollId.slice(0, 6)}-${idx + 1}`,
      text: optText.trim(),
    }));

  if (formattedOptions.length < 2) {
    return { success: false, error: 'Please provide at least 2 non-empty options.' };
  }

  const newPoll: Poll = {
    id: pollId,
    question: data.question.trim(),
    description: data.description?.trim() || '',
    options: formattedOptions,
    created_by: data.creator.id || 'admin-1',
    creator_name: data.creator.full_name || 'Estate Management',
    results_visibility: data.results_visibility,
    close_date: data.close_date ? new Date(data.close_date).toISOString() : null,
    status: 'open',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data: dbData, error: dbErr } = await supabase
        .from('polls')
        .insert([newPoll])
        .select()
        .single();

      if (dbErr) {
        console.warn('Supabase poll insert notice:', dbErr);
      }
    } catch (e) {
      console.warn('Supabase poll insert failed, syncing local store:', e);
    }
  }

  const allPolls = getStoredPolls();
  allPolls.unshift(newPoll);
  saveStoredPolls(allPolls);

  return { success: true, poll: newPoll };
}

export async function castVote(params: {
  pollId: string;
  optionId: string;
  user: AppUser;
}): Promise<{ success: boolean; error?: string }> {
  const votes = getStoredPollVotes();
  
  // Enforce one vote per resident per poll
  const existingVote = votes.find(
    (v) => v.poll_id === params.pollId && v.voter_id === params.user.id
  );

  if (existingVote) {
    return { success: false, error: 'You have already cast your vote for this townhall poll.' };
  }

  const voteId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `vote-${Date.now()}`;

  const newVote: PollVote = {
    id: voteId,
    poll_id: params.pollId,
    voter_id: params.user.id,
    voter_name: params.user.full_name,
    house_number: params.user.house_number,
    house_unit: params.user.house_unit,
    option_id: params.optionId,
    voted_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { error: voteErr } = await supabase
        .from('poll_votes')
        .insert([newVote]);

      if (voteErr) {
        if (voteErr.code === '23505' || voteErr.message?.includes('duplicate') || voteErr.message?.includes('unique')) {
          return { success: false, error: 'You have already voted on this poll.' };
        }
      }
    } catch (e) {
      console.warn('Supabase vote insert fallback:', e);
    }
  }

  votes.push(newVote);
  saveStoredPollVotes(votes);

  return { success: true };
}

export async function closeTownhallPoll(pollId: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('polls')
        .update({ status: 'closed' })
        .eq('id', pollId);
    } catch (e) {
      console.warn(e);
    }
  }

  const polls = getStoredPolls();
  const idx = polls.findIndex((p) => p.id === pollId);
  if (idx >= 0) {
    polls[idx].status = 'closed';
    saveStoredPolls(polls);
  }

  return { success: true };
}

// ==========================================
// 2. FIX-IT TICKETS SERVICES
// ==========================================

export async function fetchFixItTickets(currentUser?: AppUser | null): Promise<FixItTicket[]> {
  let tickets: FixItTicket[] = [];

  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });

      // If resident, filter by resident_id / house
      const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'madrasa_admin' || currentUser?.role === 'security';
      if (!isAdmin && currentUser) {
        query = query.eq('resident_id', currentUser.id);
      }

      const { data: dbTickets, error: tktErr } = await query;
      if (!tktErr && dbTickets && dbTickets.length > 0) {
        tickets = dbTickets as FixItTicket[];
      }
    } catch (e) {
      console.warn('Supabase tickets fetch error, using local store:', e);
    }
  }

  if (tickets.length === 0) {
    const all = getStoredTickets();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'madrasa_admin' || currentUser?.role === 'security';
    if (isAdmin || !currentUser) {
      tickets = all;
    } else {
      tickets = all.filter(
        (t) => t.resident_id === currentUser.id || (t.house_number === currentUser.house_number && t.house_unit === currentUser.house_unit)
      );
    }
  }

  return tickets;
}

export async function submitFixItTicket(params: {
  resident: AppUser;
  category: TicketCategory;
  description: string;
  photoUrl?: string;
}): Promise<{ success: boolean; ticket?: FixItTicket; error?: string }> {
  if (!params.description.trim()) {
    return { success: false, error: 'Please enter a description of the issue.' };
  }

  const ticketId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `tkt-${Date.now()}`;

  const nowIso = new Date().toISOString();

  const newTicket: FixItTicket = {
    id: ticketId,
    resident_id: params.resident.id,
    resident_name: params.resident.full_name,
    resident_phone: params.resident.phone,
    house_number: params.resident.house_number,
    house_unit: params.resident.house_unit,
    category: params.category,
    description: params.description.trim(),
    photo_url: params.photoUrl || undefined,
    status: 'pending',
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (isSupabaseConfigured) {
    try {
      const { data: dbData, error: dbErr } = await supabase
        .from('tickets')
        .insert([newTicket])
        .select()
        .single();

      if (dbErr) console.warn('Supabase ticket insert warning:', dbErr);
    } catch (e) {
      console.warn('Supabase ticket sync fallback:', e);
    }
  }

  const allTickets = getStoredTickets();
  allTickets.unshift(newTicket);
  saveStoredTickets(allTickets);

  return { success: true, ticket: newTicket };
}

export async function updateTicketStatusAndResolution(params: {
  ticketId: string;
  status: TicketStatus;
  resolutionNotes?: string;
  adminName: string;
}): Promise<{ success: boolean; ticket?: FixItTicket }> {
  const nowIso = new Date().toISOString();
  const updatePayload: Partial<FixItTicket> = {
    status: params.status,
    resolution_notes: params.resolutionNotes?.trim() || undefined,
    resolved_by: params.adminName,
    resolved_at: params.status === 'resolved' ? nowIso : undefined,
    updated_at: nowIso,
  };

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('tickets')
        .update(updatePayload)
        .eq('id', params.ticketId);
    } catch (e) {
      console.warn('Supabase ticket update fallback:', e);
    }
  }

  const allTickets = getStoredTickets();
  const idx = allTickets.findIndex((t) => t.id === params.ticketId);
  if (idx >= 0) {
    allTickets[idx] = {
      ...allTickets[idx],
      ...updatePayload,
    };
    saveStoredTickets(allTickets);
    return { success: true, ticket: allTickets[idx] };
  }

  return { success: true };
}

// ==========================================
// 3. MARKETPLACE NOTICEBOARD SERVICES
// ==========================================

export async function fetchMarketplaceListings(categoryFilter?: string): Promise<MarketplaceListing[]> {
  let listings: MarketplaceListing[] = [];

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (categoryFilter && categoryFilter !== 'All') {
        query = query.eq('category', categoryFilter);
      }

      const { data: dbData, error: mktErr } = await query;
      if (!mktErr && dbData && dbData.length > 0) {
        listings = dbData as MarketplaceListing[];
      }
    } catch (e) {
      console.warn('Supabase marketplace fetch fallback:', e);
    }
  }

  if (listings.length === 0) {
    const all = getStoredMarketplaceListings();
    listings = all.filter((l) => l.status === 'active');
    if (categoryFilter && categoryFilter !== 'All') {
      listings = listings.filter((l) => l.category === categoryFilter);
    }
  }

  return listings;
}

export async function createMarketplaceListing(params: {
  seller: AppUser;
  title: string;
  description: string;
  category: MarketplaceCategory;
  price?: number | null;
  price_type?: 'fixed' | 'free' | 'negotiable';
  contactMethod?: string;
}): Promise<{ success: boolean; listing?: MarketplaceListing; error?: string }> {
  if (!params.title.trim()) {
    return { success: false, error: 'Please enter a listing title.' };
  }
  if (!params.description.trim()) {
    return { success: false, error: 'Please provide a brief description.' };
  }

  const defaultContact = params.contactMethod?.trim() 
    || `Phone: ${params.seller.phone} (House ${params.seller.house_number}, ${params.seller.house_unit})`;

  const listingId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `mkt-${Date.now()}`;

  const newListing: MarketplaceListing = {
    id: listingId,
    seller_id: params.seller.id,
    seller_name: params.seller.full_name,
    seller_phone: params.seller.phone,
    house_number: params.seller.house_number,
    house_unit: params.seller.house_unit,
    title: params.title.trim(),
    description: params.description.trim(),
    category: params.category,
    price: params.price_type === 'free' ? 0 : params.price || null,
    price_type: params.price_type || 'fixed',
    contact_method: defaultContact,
    status: 'active',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data: dbData, error: dbErr } = await supabase
        .from('marketplace_listings')
        .insert([newListing])
        .select()
        .single();

      if (dbErr) console.warn('Supabase marketplace insert warning:', dbErr);
    } catch (e) {
      console.warn('Supabase marketplace sync fallback:', e);
    }
  }

  const allListings = getStoredMarketplaceListings();
  allListings.unshift(newListing);
  saveStoredMarketplaceListings(allListings);

  return { success: true, listing: newListing };
}

export async function updateMarketplaceStatus(
  listingId: string, 
  status: 'active' | 'sold' | 'archived'
): Promise<{ success: boolean }> {
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('marketplace_listings')
        .update({ status })
        .eq('id', listingId);
    } catch (e) {
      console.warn('Supabase marketplace update fallback:', e);
    }
  }

  const all = getStoredMarketplaceListings();
  const idx = all.findIndex((l) => l.id === listingId);
  if (idx >= 0) {
    all[idx].status = status;
    saveStoredMarketplaceListings(all);
  }

  return { success: true };
}
