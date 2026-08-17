import React, { useState, useEffect } from 'react';
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
  Vote,
  Wrench,
  Share2,
  Copy,
  Check,
  PackageCheck
} from 'lucide-react';
import { AppUser, MarketplaceListing, MarketplaceCategory } from '../types';
import { fetchMarketplaceListings, createMarketplaceListing, updateMarketplaceStatus } from '../lib/community-service';
import { StarMotifDivider } from '../components/common/StarMotifDivider';

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
        contactMethod: contactMethod.trim() || undefined,
      });

      if (res.error) {
        setCreateError(res.error);
      } else {
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        setCategory('Household');
        setPrice('');
        setPriceType('fixed');
        setContactMethod('');
        setCreateSuccess('Listing published to the Community Marketplace Noticeboard.');
        await loadListings();
        setTimeout(() => setCreateSuccess(null), 5000);
      }
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to publish listing.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleMarkAsSold = async (listingId: string) => {
    if (!confirm('Mark this listing as Sold / Concluded?')) return;
    await updateMarketplaceStatus(listingId, 'sold');
    await loadListings();
  };

  const handleCopyContact = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
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

  return (
    <div className="min-h-screen bg-[#FBF8F1] py-8 sm:py-12 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb & Community Sub-nav */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E4D9BE]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#10241A]/60">
            <button onClick={() => navigate('/dashboard')} className="hover:text-[#0F472A]">Dashboard</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#0F472A] font-bold">Resident Marketplace</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F2EAD9] border border-[#E4D9BE] text-xs font-semibold">
            <button
              onClick={() => navigate('/community/polls')}
              className="px-3 py-1.5 rounded-lg text-[#10241A]/70 hover:text-[#0F472A] hover:bg-white/60 transition-colors flex items-center gap-1.5"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Townhall Polls</span>
            </button>
            <button
              onClick={() => navigate('/community/tickets')}
              className="px-3 py-1.5 rounded-lg text-[#10241A]/70 hover:text-[#0F472A] hover:bg-white/60 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Fix-It Tickets</span>
            </button>
            <button
              onClick={() => navigate('/community/marketplace')}
              className="px-3 py-1.5 rounded-lg bg-[#0F472A] text-white shadow-2xs flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </button>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7D19C]/40 border border-[#C89B3C]/30 text-[#0A2F1C] text-xs font-bold uppercase tracking-wider mb-2">
              <ShoppingBag className="w-3.5 h-3.5 text-[#C89B3C]" />
              <span>Estate Resident Noticeboard</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#0A2F1C] tracking-tight">
              Community Marketplace
            </h1>
            <p className="text-sm sm:text-base text-[#10241A]/70 mt-1 max-w-2xl">
              Buy, sell, giveaway household items, and discover trusted resident services within Lighthouse Estate. Contact neighbors directly.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-all shadow-soft flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#E7D19C]" />
            <span>Post Listing</span>
          </button>
        </div>

        <StarMotifDivider className="py-2" />

        {/* Success Banner */}
        {createSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-medium flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{createSuccess}</span>
          </div>
        )}

        {/* Search & Category Filter Pills */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#C89B3C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search listings by keyword, item, or neighbor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4D9BE] bg-white text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none shadow-2xs"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                selectedCategory === 'All'
                  ? 'bg-[#0F472A] text-white border-[#0F472A] shadow-xs'
                  : 'bg-white text-[#10241A]/70 border-[#E4D9BE] hover:bg-[#F2EAD9]'
              }`}
            >
              All Items
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                  selectedCategory === cat
                    ? 'bg-[#0F472A] text-white border-[#0F472A] shadow-xs'
                    : 'bg-white text-[#10241A]/70 border-[#E4D9BE] hover:bg-[#F2EAD9]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 mx-auto border-3 border-[#0F472A] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#10241A]/60">Loading marketplace notices...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="card-estate p-12 text-center space-y-3 bg-white">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#C89B3C]/70" />
            <h3 className="font-serif text-lg font-bold text-[#0A2F1C]">No Listings in this Category</h3>
            <p className="text-xs text-[#10241A]/60 max-w-md mx-auto">
              Be the first neighbor to post a notice in this category. Click &quot;Post Listing&quot; to publish items for sale, giveaways, or services.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item) => {
              const isOwner = currentUser?.id === item.seller_id;
              const formattedPrice = item.price_type === 'free'
                ? 'FREE Giveaway'
                : item.price
                ? `₦${item.price.toLocaleString()}`
                : 'Negotiable / Contact';

              return (
                <div 
                  key={item.id}
                  className="card-estate p-6 bg-white border border-[#E4D9BE] hover:border-[#C89B3C] shadow-soft hover:shadow-soft-lg transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F2EAD9] text-[#0A2F1C] border border-[#E4D9BE]">
                        {item.category}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        item.price_type === 'free' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-[#0F472A]/10 text-[#0F472A] border border-[#0F472A]/20'
                      }`}>
                        {formattedPrice}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#0A2F1C] leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#10241A]/70 mt-2 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Seller Info & Contact */}
                  <div className="pt-4 mt-4 border-t border-[#E4D9BE]/60 space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#10241A]/70">
                      <div className="flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-[#C89B3C]" />
                        <span className="font-medium">House {item.house_number} ({item.house_unit})</span>
                      </div>
                      <span className="text-[11px] text-[#10241A]/50">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FBF8F1] border border-[#E4D9BE] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs truncate">
                        <Phone className="w-3.5 h-3.5 text-[#0F472A] shrink-0" />
                        <span className="truncate font-medium text-[#0A2F1C]">
                          {item.contact_method}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyContact(item.id, item.contact_method)}
                        className="p-1.5 rounded-lg bg-white border border-[#E4D9BE] text-[#0F472A] hover:bg-[#F2EAD9] transition-colors shrink-0"
                        title="Copy Contact Method"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {(isOwner || isAdmin) && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleMarkAsSold(item.id)}
                          className="text-xs font-semibold text-neutral-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Mark as Sold / Remove</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resident Post Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#C89B3C] shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4D9BE]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#0F472A]" />
                <h3 className="font-serif text-xl font-bold text-[#0A2F1C]">
                  Post Marketplace Notice
                </h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Listing Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3.5kVA Pure Sine Wave Inverter with Rack"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                    Price Type
                  </label>
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="negotiable">Negotiable</option>
                    <option value="free">Free / Giveaway</option>
                  </select>
                </div>
              </div>

              {priceType !== 'free' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                    Price (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="e.g. 85000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe condition, features, reason for sale or schedule details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A2F1C]">
                  Contact Method (Defaults to your phone & house)
                </label>
                <input
                  type="text"
                  placeholder={`Phone: ${currentUser?.phone || '+234...'} (House ${currentUser?.house_number || ''})`}
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4D9BE] bg-[#FBF8F1]/40 text-sm focus:ring-2 focus:ring-[#0F472A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4D9BE]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 rounded-xl bg-[#0F472A] text-white font-bold text-sm hover:bg-[#0A2F1C] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {createLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#E7D19C]" />
                  )}
                  <span>Publish Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
