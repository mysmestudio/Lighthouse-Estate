import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  UserCheck, 
  Users,
  Bell, 
  Ticket, 
  Menu, 
  X, 
  LogOut, 
  Building2, 
  Home, 
  Compass,
  Download,
  Vote,
  Wrench,
  ShoppingBag,
  ChevronDown,
  User,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { AppUser } from '../../types';
import { usePwa } from '../../context/PwaContext';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  navigate,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [communityDropdownOpen, setCommunityDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { isInstalled, setShowInstallModal } = usePwa();

  const communityRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (communityRef.current && !communityRef.current.contains(event.target as Node)) {
        setCommunityDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    setCommunityDropdownOpen(false);
    setUserDropdownOpen(false);
  };

  const isCommunityActive = currentPath.startsWith('/community') || currentPath === '/directory';

  const roleLabel = currentUser?.role === 'resident'
    ? `House ${currentUser.house_number} (${currentUser.house_unit})`
    : currentUser?.role === 'security'
    ? 'Main Gate Security'
    : currentUser?.role === 'staff'
    ? 'House Staff'
    : currentUser?.role === 'madrasa_admin'
    ? 'Al-Noor Madrasa Admin'
    : currentUser?.role === 'admin' || currentUser?.role === 'master_admin'
    ? 'Estate Management'
    : '';

  const shortName = currentUser?.full_name
    ? currentUser.full_name.split(' ')[0]
    : 'Resident';

  const initials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'LH';

  return (
    <header className="sticky top-0 z-40 bg-[#FBF8F1]/95 backdrop-blur-md border-b border-[#E4D9BE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Logo */}
          <div 
            onClick={() => handleNav('/')}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0F472A] flex items-center justify-center border border-[#C89B3C]/40 shadow-xs group-hover:bg-[#0A2F1C] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#E7D19C]">
                <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none"/>
                <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none" transform="rotate(45 12 12)"/>
                <path d="M12 7V17M7 12H17" stroke="#E7D19C" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-lg text-[#0A2F1C] tracking-tight">
                Lighthouse
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-[#E7D19C]/40 text-[#0A2F1C] border border-[#C89B3C]/30">
                Estate
              </span>
            </div>
          </div>

          {/* Center: Clean Desktop Navigation */}
          {currentUser ? (
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              <button
                onClick={() => handleNav('/dashboard')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentPath === '/dashboard'
                    ? 'bg-[#0F472A] text-white shadow-xs font-semibold'
                    : 'text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/60'
                }`}
              >
                Dashboard
              </button>

              <button
                onClick={() => handleNav('/passes')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentPath === '/passes'
                    ? 'bg-[#0F472A] text-white shadow-xs font-semibold'
                    : 'text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/60'
                }`}
              >
                Passes
              </button>

              <button
                onClick={() => handleNav('/facilities')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentPath === '/facilities'
                    ? 'bg-[#0F472A] text-white shadow-xs font-semibold'
                    : 'text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/60'
                }`}
              >
                Facilities
              </button>

              {(currentUser.role === 'resident' || currentUser.role === 'admin' || currentUser.role === 'master_admin') && (
                <button
                  onClick={() => handleNav('/household')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentPath === '/household'
                      ? 'bg-[#0F472A] text-white shadow-xs font-semibold'
                      : 'text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/60'
                  }`}
                >
                  Household
                </button>
              )}

              <button
                onClick={() => handleNav('/gate')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentPath === '/gate'
                    ? 'bg-[#0F472A] text-white shadow-xs font-semibold'
                    : 'text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/60'
                }`}
              >
                Gate Hub
              </button>

              {/* Consolidated Community Dropdown */}
              <div className="relative" ref={communityRef}>
                <button
                  onClick={() => setCommunityDropdownOpen(!communityDropdownOpen)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                    isCommunityActive
                      ? 'bg-[#0F472A] text-white shadow-xs font-semibold'
                      : 'text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/60'
                  }`}
                >
                  <span>Community</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${communityDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {communityDropdownOpen && (
                  <div className="absolute top-full mt-1.5 left-0 w-60 rounded-xl bg-white border border-[#E4D9BE] shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-0.5">
                    <button
                      onClick={() => handleNav('/community/polls')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                        currentPath === '/community/polls' ? 'bg-[#F2EAD9] text-[#0A2F1C]' : 'text-[#10241A] hover:bg-[#FBF8F1]'
                      }`}
                    >
                      <Vote className="w-4 h-4 text-[#C89B3C]" />
                      <div>
                        <p className="font-semibold text-xs text-[#0A2F1C]">Townhall Polls</p>
                        <p className="text-[10px] text-[#10241A]/50 font-normal">Vote on estate decisions</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNav('/community/tickets')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                        currentPath === '/community/tickets' ? 'bg-[#F2EAD9] text-[#0A2F1C]' : 'text-[#10241A] hover:bg-[#FBF8F1]'
                      }`}
                    >
                      <Wrench className="w-4 h-4 text-[#C89B3C]" />
                      <div>
                        <p className="font-semibold text-xs text-[#0A2F1C]">Fix-It Requests</p>
                        <p className="text-[10px] text-[#10241A]/50 font-normal">Report estate faults</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNav('/community/marketplace')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                        currentPath === '/community/marketplace' ? 'bg-[#F2EAD9] text-[#0A2F1C]' : 'text-[#10241A] hover:bg-[#FBF8F1]'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-[#C89B3C]" />
                      <div>
                        <p className="font-semibold text-xs text-[#0A2F1C]">Marketplace</p>
                        <p className="text-[10px] text-[#10241A]/50 font-normal">Resident bulletin & trades</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleNav('/directory')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                        currentPath === '/directory' ? 'bg-[#F2EAD9] text-[#0A2F1C]' : 'text-[#10241A] hover:bg-[#FBF8F1]'
                      }`}
                    >
                      <Users className="w-4 h-4 text-[#C89B3C]" />
                      <div>
                        <p className="font-semibold text-xs text-[#0A2F1C]">Staff Directory</p>
                        <p className="text-[10px] text-[#10241A]/50 font-normal">Verified estate workers</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {(currentUser.role === 'admin' || currentUser.role === 'master_admin' || currentUser.role === 'madrasa_admin') && (
                <button
                  onClick={() => handleNav('/admin')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentPath === '/admin'
                      ? 'bg-[#0F472A] text-white shadow-xs font-semibold'
                      : 'text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/60'
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>
          ) : (
            <nav className="hidden md:flex items-center space-x-2">
              <button
                onClick={() => handleNav('/')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/60 transition-all"
              >
                Overview
              </button>
            </nav>
          )}

          {/* Right: Actions & User Profile */}
          <div className="hidden md:flex items-center gap-2.5">
            {currentUser ? (
              <>
                {/* Notices Bell */}
                <button
                  onClick={() => handleNav('/notices')}
                  className={`relative p-2 rounded-xl border transition-colors ${
                    currentPath === '/notices'
                      ? 'bg-[#0F472A] text-white border-[#0F472A]'
                      : 'bg-white border-[#E4D9BE] text-[#10241A]/70 hover:text-[#0A2F1C] hover:bg-[#F2EAD9]/50'
                  }`}
                  title="Estate Notices"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C89B3C]" />
                </button>

                {/* Compact User Menu Pill */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 py-1 pl-1.5 pr-2.5 rounded-full bg-white border border-[#E4D9BE] hover:border-[#C89B3C]/50 hover:bg-[#F2EAD9]/30 transition-all shadow-xs"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0F472A] text-[#E7D19C] font-bold text-xs flex items-center justify-center">
                      {initials}
                    </div>
                    <span className="text-xs font-semibold text-[#0A2F1C] max-w-[120px] truncate">
                      {currentUser.role === 'resident' ? `H-${currentUser.house_number} • ${shortName}` : shortName}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#10241A]/50 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Rich User Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-[#E4D9BE] shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User Info Header */}
                      <div className="pb-3 mb-2 border-b border-[#E4D9BE]/60">
                        <p className="font-bold text-sm text-[#0A2F1C] truncate">
                          {currentUser.full_name}
                        </p>
                        <p className="text-xs text-[#C89B3C] font-semibold mt-0.5">
                          {roleLabel}
                        </p>
                        <p className="text-[11px] text-[#10241A]/50 truncate mt-0.5">
                          {currentUser.email}
                        </p>
                      </div>

                      {/* Dropdown Links */}
                      <div className="space-y-1">
                        <button
                          onClick={() => handleNav('/dashboard')}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[#10241A] hover:bg-[#FBF8F1] flex items-center gap-2.5 transition-colors"
                        >
                          <Compass className="w-4 h-4 text-[#0F472A]" />
                          <span>My Resident Hub</span>
                        </button>

                        <button
                          onClick={() => handleNav('/passes')}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[#10241A] hover:bg-[#FBF8F1] flex items-center gap-2.5 transition-colors"
                        >
                          <Ticket className="w-4 h-4 text-[#0F472A]" />
                          <span>Visitor Passes</span>
                        </button>

                        <button
                          onClick={() => handleNav('/facilities')}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[#10241A] hover:bg-[#FBF8F1] flex items-center gap-2.5 transition-colors"
                        >
                          <Calendar className="w-4 h-4 text-[#0F472A]" />
                          <span>Facility Booking</span>
                        </button>

                        {(currentUser.role === 'resident' || currentUser.role === 'admin') && (
                          <button
                            onClick={() => handleNav('/household')}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[#10241A] hover:bg-[#FBF8F1] flex items-center gap-2.5 transition-colors"
                          >
                            <UserCheck className="w-4 h-4 text-[#0F472A]" />
                            <span>Household Members</span>
                          </button>
                        )}

                        {!isInstalled && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              setShowInstallModal(true);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[#0A2F1C] bg-[#F2EAD9]/60 hover:bg-[#F2EAD9] flex items-center gap-2.5 transition-colors border border-[#C89B3C]/30"
                          >
                            <Download className="w-4 h-4 text-[#C89B3C]" />
                            <span>Install Web App (PWA)</span>
                          </button>
                        )}
                      </div>

                      {/* Sign Out Button */}
                      <div className="pt-2 mt-2 border-t border-[#E4D9BE]/60">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-red-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('/login')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0F472A] text-white hover:bg-[#0A2F1C] shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-[#E7D19C]" />
                  <span>Resident Login</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {currentUser && (
              <button
                onClick={() => handleNav('/notices')}
                className="p-1.5 rounded-lg border border-[#E4D9BE] bg-white text-[#10241A]"
                title="Notices"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-[#E4D9BE] bg-white text-[#10241A]"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E4D9BE] bg-[#FBF8F1] px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top duration-200">
          {currentUser && (
            <div className="p-3 mb-3 rounded-xl bg-white border border-[#E4D9BE]">
              <div className="font-semibold text-sm text-[#0A2F1C]">
                {currentUser.full_name}
              </div>
              <div className="text-xs text-[#C89B3C] font-semibold">
                {roleLabel}
              </div>
            </div>
          )}

          <button
            onClick={() => handleNav('/')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
              currentPath === '/' ? 'bg-[#0F472A] text-white font-semibold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Overview & Amenities</span>
          </button>

          {currentUser && (
            <>
              <button
                onClick={() => handleNav('/dashboard')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  currentPath === '/dashboard' ? 'bg-[#0F472A] text-white font-semibold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>My Dashboard</span>
              </button>

              <button
                onClick={() => handleNav('/passes')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  currentPath === '/passes' ? 'bg-[#0F472A] text-white font-semibold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Visitor Passes</span>
              </button>

              <button
                onClick={() => handleNav('/facilities')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  currentPath === '/facilities' ? 'bg-[#0F472A] text-white font-semibold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Facility Bookings</span>
              </button>

              {(currentUser.role === 'resident' || currentUser.role === 'admin' || currentUser.role === 'master_admin') && (
                <button
                  onClick={() => handleNav('/household')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                    currentPath === '/household' ? 'bg-[#0F472A] text-white font-semibold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Household Staff & KYC</span>
                </button>
              )}

              <button
                onClick={() => handleNav('/gate')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  currentPath === '/gate' ? 'bg-[#0F472A] text-white font-semibold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Gate Hub Console</span>
              </button>

              {/* Community Sub-items */}
              <div className="pt-2 pb-1 border-t border-[#E4D9BE]/60">
                <p className="px-3 pb-1 text-[10px] uppercase font-bold tracking-widest text-[#0A2F1C]/50">
                  Community Hub
                </p>
                <button
                  onClick={() => handleNav('/community/polls')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                    currentPath === '/community/polls' ? 'bg-[#F2EAD9] text-[#0A2F1C] font-bold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                  }`}
                >
                  <Vote className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>Townhall Polls</span>
                </button>

                <button
                  onClick={() => handleNav('/community/tickets')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                    currentPath === '/community/tickets' ? 'bg-[#F2EAD9] text-[#0A2F1C] font-bold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>Fix-It Tickets</span>
                </button>

                <button
                  onClick={() => handleNav('/community/marketplace')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                    currentPath === '/community/marketplace' ? 'bg-[#F2EAD9] text-[#0A2F1C] font-bold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>Resident Marketplace</span>
                </button>

                <button
                  onClick={() => handleNav('/directory')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                    currentPath === '/directory' ? 'bg-[#F2EAD9] text-[#0A2F1C] font-bold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>Staff Directory</span>
                </button>
              </div>

              <button
                onClick={() => handleNav('/notices')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  currentPath === '/notices' ? 'bg-[#0F472A] text-white font-semibold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Community Notices</span>
              </button>
            </>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'madrasa_admin') && (
            <button
              onClick={() => handleNav('/admin')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                currentPath === '/admin' ? 'bg-[#0F472A] text-white font-semibold' : 'text-[#10241A] hover:bg-[#F2EAD9]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Admin Management</span>
            </button>
          )}

          <div className="pt-2 border-t border-[#E4D9BE] flex flex-col gap-2">
            {!isInstalled && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowInstallModal(true);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-[#0A2F1C] bg-[#F2EAD9] border border-[#C89B3C]/60 flex items-center gap-3 shadow-xs"
              >
                <Download className="w-4 h-4 text-[#C89B3C]" />
                <span>Install Lighthouse App</span>
              </button>
            )}

            {currentUser ? (
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 flex items-center gap-3"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleNav('/login')}
                  className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#0F472A] text-[#0F472A] bg-white"
                >
                  Portal Login
                </button>
                <button
                  onClick={() => handleNav('/register')}
                  className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#0F472A] text-white shadow-xs"
                >
                  Resident Registration
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
