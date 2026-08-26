import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  Home, 
  Tag, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  ChevronRight, 
  Share2, 
  Copy, 
  Check, 
  PackageCheck, 
  Bell, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AppUser, MarketplaceListing, MarketplaceCategory } from '../types';
import { fetchMarketplaceListings, createMarketplaceListing, updateMarketplaceStatus } from '../lib/community-service';
import { triggerSOSEvent } from '../lib/sos-service';

interface MarketplacePageProps {
  currentUser: AppUser | null;
  navigate: (path: string) => void;
}

const CATEGORIES: MarketplaceCategory[] = [
  'Household', 
  'Electronics', 
  'Furniture', 
  'Services', 
  'Vehicles', 
  'Kids & Baby', 
  'Other'
];

const SOS_RING_LENGTH = 194.8;
const SOS_HOLD_MS = 5000;

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ currentUser, navigate }) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Listing Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('Household');
  const [priceType, setPriceType] = useState<'fixed' | 'free' | 'negotiable'>('fixed');
  const [price, setPrice] = useState<string>('');
  const [contactMethod, setContactMethod] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Copied contact notification
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // SOS state
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [showSosToast, setShowSosToast] = useState(false);
  const [sosProgressOffset, setSosProgressOffset] = useState(SOS_RING_LENGTH);
  const [sosTransition, setSosTransition] = useState<string>('none');
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'madrasa_admin';

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await fetchMarketplaceListings(selectedCategory);
      setListings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [selectedCategory]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!currentUser) {
      setCreateError('Please sign in to post a marketplace notice.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setCreateError('Please fill in both the title and description.');
      return;
    }

    const numericPrice = priceType === 'free' ? 0 : price ? parseFloat(price) : null;

    setCreateLoading(true);

    try {
      const res = await createMarketplaceListing({
        seller: currentUser,
        title,
        description,
        category,
        price: numericPrice,
        price_type: priceType,
        contactMethod: contactMethod.trim() || currentUser.phone || undefined,
      });

      if (res.error) {
        setCreateError(res.error);
      } else {
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        setPrice('');
        setPriceType('fixed');
        setCreateSuccess('Listing published to the estate marketplace!');
        loadListings();
        setTimeout(() => setCreateSuccess(null), 4000);
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create listing');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleMarkSold = async (listingId: string) => {
    try {
      await updateMarketplaceStatus(listingId, 'sold');
      loadListings();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyContact = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.seller_name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // SOS Press & Hold
  const handleSOSStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (sosActivated) return;

    setIsHoldingSOS(true);
    setSosTransition(`stroke-dashoffset ${SOS_HOLD_MS / 1000}s linear`);
    setSosProgressOffset(0);

    sosTimerRef.current = setTimeout(async () => {
      setSosActivated(true);
      setIsHoldingSOS(false);
      setShowSosToast(true);

      if (currentUser) {
        try {
          await triggerSOSEvent(currentUser);
        } catch (err) {
          console.error(err);
        }
      }

      setTimeout(() => {
        setSosActivated(false);
        setShowSosToast(false);
        setSosTransition('none');
        setSosProgressOffset(SOS_RING_LENGTH);
      }, 4000);
    }, SOS_HOLD_MS);
  };

  const handleSOSCancel = () => {
    if (sosActivated) return;
    if (sosTimerRef.current) {
      clearTimeout(sosTimerRef.current);
      sosTimerRef.current = null;
    }
    setIsHoldingSOS(false);
    setSosTransition('none');
    setSosProgressOffset(SOS_RING_LENGTH);
  };

  const initials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TA';

  return (
    <div className="min-h-screen bg-[#FBFDF9] text-[#16241D] font-sans pb-32">
      {/* SVG Pattern Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="lattice-market" width="56" height="56" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="10" y="10" width="36" height="36" transform="rotate(45 28 28)" />
              <rect x="15" y="15" width="26" height="26" />
            </g>
          </pattern>
        </defs>
      </svg>

      {/* Floating Pillbar Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-6 py-4 bg-[#123528]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-xs">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-7 h-7 rounded-[9px] bg-[#3FAE7A] flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
            title="Light House Estate, Lekki"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#0D2A1F]">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-['Sora'] font-bold text-xs sm:text-sm text-white tracking-tight">
            {currentUser?.role === 'resident'
              ? `House ${currentUser.house_number} · ${currentUser.house_unit || 'Main House'}`
              : 'Resident Market'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/14 border border-white/16 backdrop-blur-md rounded-full px-2.5 py-1 shadow-xs">
          <button
            onClick={() => navigate('/notices')}
            className="relative w-8 h-8 rounded-full bg-white/14 border border-white/16 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            aria-label="Notifications"
          >
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E8C547] border border-[#123528]" />
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-[#E8C547] text-[#4A3B0A] flex items-center justify-center font-['Sora'] font-bold text-xs hover:opacity-90 transition-opacity"
            title="Account Settings"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Hero Header with SVG Lattice Pattern */}
      <div className="bg-gradient-to-br from-[#123528] to-[#0D2A1F] text-white px-4 sm:px-6 pt-6 pb-12 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.13] pointer-events-none text-white">
          <rect width="100%" height="100%" fill="url(#lattice-market)" />
        </svg>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-[#3FAE7A]/25 text-[#76dfa8] text-[10.5px] font-['Sora'] font-bold uppercase tracking-wider border border-[#3FAE7A]/30">
                  Resident Classifieds
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-[10.5px] font-bold">
                  {listings.length} Active Listings
                </span>
              </div>
              <h1 className="font-['Sora'] font-bold text-xl sm:text-2xl tracking-tight text-white">
                Marketplace & Classifieds
              </h1>
              <p className="text-xs text-white/70">
                Buy, sell, giveaway, and discover verified goods & services from neighbours in Light House Estate, Lekki
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#E8C547] hover:bg-[#DDB63A] text-[#4A3B0A] font-['Sora'] font-bold text-xs flex items-center gap-2 shadow-md transition-all self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Post Listing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rounded Sheet Container */}
      <div className="-mt-6 bg-[#FBFDF9] rounded-t-[26px] relative z-20 pt-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Success Toast */}
          {createSuccess && (
            <div className="p-4 rounded-2xl bg-[#EAF7EE] border border-[#3FAE7A]/30 text-[#257A54] text-xs font-semibold flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{createSuccess}</span>
            </div>
          )}

          {/* Filters & Search Bar */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E3EFE7] shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8AA096] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search furniture, electronics, services, household items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-['Sora'] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-[#123528] text-white shadow-xs'
                    : 'bg-[#FBFDF9] text-[#516459] hover:bg-[#EAF7EE] hover:text-[#123528]'
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-['Sora'] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#123528] text-white shadow-xs'
                      : 'bg-[#FBFDF9] text-[#516459] hover:bg-[#EAF7EE] hover:text-[#123528]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="py-16 text-center text-xs font-semibold text-[#8AA096]">
              Loading marketplace listings...
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-white border border-[#E3EFE7] rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="font-['Sora'] font-bold text-sm text-[#16241D]">No listings found</h3>
              <p className="text-xs text-[#8AA096] max-w-sm mx-auto">
                Be the first to list an item or service for your neighbours in the estate.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#123528] text-white font-['Sora'] font-bold text-xs hover:bg-[#0D2A1F] transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#E8C547]" />
                <span>Post New Notice</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((item) => {
                const isSeller = currentUser && item.seller_id === currentUser.id;
                const isSold = item.status === 'sold';

                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                      isSold ? 'border-[#E3EFE7] opacity-60' : 'border-[#E3EFE7] hover:border-[#3FAE7A]/40'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-[#EAF7EE] text-[#257A54] text-[10.5px] font-['Sora'] font-bold">
                          {item.category}
                        </span>
                        {isSold ? (
                          <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-[10.5px] font-bold">
                            Sold / Taken
                          </span>
                        ) : (
                          <span className="font-['Sora'] font-bold text-xs text-[#123528]">
                            {item.price_type === 'free'
                              ? '🎁 FREE'
                              : item.price_type === 'negotiable'
                              ? `₦${(item.price || 0).toLocaleString()} (Negotiable)`
                              : `₦${(item.price || 0).toLocaleString()}`}
                          </span>
                        )}
                      </div>

                      <h3 className="font-['Sora'] font-bold text-sm text-[#16241D] leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs text-[#516459] leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E3EFE7] space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#8AA096]">
                        <span>Resident · House {item.house_number || 14}</span>
                        <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {item.contact_method ? (
                          <button
                            onClick={() => handleCopyContact(item.id, item.contact_method!)}
                            className="flex-1 py-2 rounded-xl bg-[#EAF7EE] hover:bg-[#3FAE7A] hover:text-white text-[#257A54] font-['Sora'] font-bold text-xs border border-[#3FAE7A]/30 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Phone className="w-3.5 h-3.5" />
                                <span>Contact ({item.contact_method})</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#8AA096]">No phone listed</span>
                        )}

                        {(isSeller || isAdmin) && !isSold && (
                          <button
                            onClick={() => handleMarkSold(item.id)}
                            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors shrink-0"
                            title="Mark as Sold"
                          >
                            Mark Sold
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* CREATE LISTING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-[#E3EFE7]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EFE7]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF7EE] text-[#257A54] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="font-['Sora'] font-bold text-base text-[#16241D]">
                  Post Marketplace Notice
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-[#FBFDF9] hover:bg-[#EAF7EE] text-[#516459] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-[#FCEBEB] text-[#A32D2D] text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                  Listing Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 65-inch 4K Samsung TV, Baby Cot, Piano Lessons..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
                    className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-bold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Pricing Type
                  </label>
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(e.target.value as any)}
                    className="w-full h-10 px-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-bold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="negotiable">Negotiable</option>
                    <option value="free">Giveaway / Free</option>
                  </select>
                </div>
              </div>

              {priceType !== 'free' && (
                <div>
                  <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                    Price (₦ Naira) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="e.g. 85000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                  Description & Condition *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe condition, specifications, pickup details inside the estate..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#516459] uppercase tracking-wider mb-1.5 text-[10.5px]">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder={currentUser?.phone || '+234 803 123 4567'}
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#FBFDF9] border border-[#E3EFE7] rounded-xl text-xs font-semibold text-[#16241D] focus:outline-none focus:border-[#3FAE7A]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#FBFDF9] border border-[#E3EFE7] font-['Sora'] font-bold text-xs text-[#516459] hover:bg-[#EAF7EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-3 rounded-xl bg-[#123528] text-white font-['Sora'] font-bold text-xs hover:bg-[#0D2A1F] transition-colors disabled:opacity-50"
                >
                  {createLoading ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Dock */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-[#0D2A1F]/92 backdrop-blur-md border border-white/10 p-2 rounded-full shadow-2xl">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11l8-7 8 7" />
            <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
          </svg>
          <span className="text-[8.5px] font-bold">Home</span>
        </button>
        <button
          onClick={() => navigate('/passes')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 013-3h14a3 3 0 013 3v10a3 3 0 01-3 3H5a3 3 0 01-3-3V9z" />
            <path d="M9 14h6" />
          </svg>
          <span className="text-[8.5px] font-bold">Passes</span>
        </button>
        <button
          onClick={() => navigate('/facilities')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 7v14M21 7v14M6 3h12v4H6z" />
          </svg>
          <span className="text-[8.5px] font-bold">Facilities</span>
        </button>
        <button
          onClick={() => navigate('/household')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M15 20c0-2.4 1-4 3.5-4.3" />
          </svg>
          <span className="text-[8.5px] font-bold">Staff</span>
        </button>
        <button
          onClick={() => navigate('/notices')}
          className="w-12 h-11 border-none bg-transparent rounded-full flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 1112 0c0 4 1.5 6 2 6H4c0.5 0 2-2 2-6z" />
            <path d="M10 20a2 2 0 004 0" />
          </svg>
          <span className="text-[8.5px] font-bold">Notices</span>
        </button>
      </nav>

      {/* Floating Emergency SOS Button */}
      <div className="fixed right-4 bottom-5 w-[70px] h-[70px] z-50">
        <svg className="absolute inset-0 w-[70px] h-[70px] -rotate-90 pointer-events-none" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="31" stroke="rgba(18,53,40,0.12)" strokeWidth="4" fill="none" />
          <circle
            cx="35"
            cy="35"
            r="31"
            stroke="#C23A38"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={SOS_RING_LENGTH}
            strokeDashoffset={sosProgressOffset}
            style={{ transition: sosTransition }}
          />
        </svg>

        <button
          onMouseDown={handleSOSStart}
          onMouseUp={handleSOSCancel}
          onMouseLeave={handleSOSCancel}
          onTouchStart={handleSOSStart}
          onTouchEnd={handleSOSCancel}
          onTouchCancel={handleSOSCancel}
          className={`absolute top-[7px] left-[7px] w-14 h-14 rounded-full border-none bg-gradient-to-br from-[#F0645F] to-[#C23A38] flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg select-none touch-none ${
            isHoldingSOS ? 'scale-95' : 'animate-pulse'
          } ${sosActivated ? 'bg-gradient-to-br from-[#FF6E68] to-[#D2413F] scale-105' : ''}`}
          aria-label="Hold for 5 seconds for SOS"
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l9 16H3L12 3z" />
            <line x1="12" y1="9" x2="12" y2="14" />
            <circle cx="12" cy="17" r="0.6" fill="white" stroke="none" />
          </svg>
          <span className="font-['Sora'] font-extrabold text-[8.5px] tracking-wider text-white">SOS</span>
        </button>

        {showSosToast && (
          <div className="absolute bottom-20 right-0 bg-[#0D2A1F] border border-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
            Alert sent to gate security
          </div>
        )}
      </div>
    </div>
  );
};
