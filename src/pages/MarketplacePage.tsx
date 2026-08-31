import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { getStoredMarketplaceListings, saveStoredMarketplaceListings } from '../lib/estate-data';

interface MarketplacePageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'services', label: 'Services' },
  { id: 'giveaways', label: 'Giveaways' }
];

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ currentUser, navigate }) => {
  const [filter, setFilter] = useState('all');
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    setListings(getStoredMarketplaceListings());
  }, []);

  const filtered = listings.filter(l => filter === 'all' || l.category === filter);

  const getIcon = (cat: string) => {
    if (cat === 'furniture') return '🛋️';
    if (cat === 'electronics') return '🔌';
    if (cat === 'giveaways') return '🎁';
    if (cat === 'services') return '🧹';
    return '📦';
  };

  const handleMessage = (phone: string) => {
    // Requirements: "Message" should open a real contact flow (in-app message or a masked-number call, whichever the rest of the app uses for resident-to-resident contact) — don't expose raw phone numbers directly on listing cards.
    // Using tel link for now to simulate contact flow.
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="shell">
      <div className="hero">
        <div className="topbar">
          <div className="brand"><span className="mark">&#9737;</span>Lighthouse Lekki</div>
          <button onClick={() => navigate('/dashboard')} className="icon-btn">&#8592;</button>
        </div>
        <h1>Marketplace</h1>
        <p className="muted" style={{ marginTop: 8 }}>{listings.length} active listings from your neighbours.</p>
      </div>

      <div className="sheet pad">
        <div className="chips" id="filterChips">
          {CHIPS.map(chip => (
            <button 
              key={chip.id} 
              className={`chip ${filter === chip.id ? 'on' : ''}`}
              onClick={() => setFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="grid" id="listings">
          {filtered.map(l => (
            <div className={`listing ${l.price === 0 ? 'free' : ''}`} key={l.id}>
              <div className="thumb">{getIcon(l.category)}</div>
              <h4>{l.title}</h4>
              <div className="price">{l.price === 0 ? 'Free' : `₦${l.price.toLocaleString()}`}</div>
              <div className="seller">House {l.house_number}</div>
              <button className="msgbtn" onClick={() => handleMessage(l.seller_phone)}>Message</button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="tiny muted">No listings found.</p>
        )}

        <p className="footer-note">Listings are visible to Lighthouse Lekki residents only.</p>
      </div>
      <button className="fab" id="postBtn" onClick={() => alert('New listing feature coming soon!')}>+ Post a listing</button>
    </div>
  );
};
