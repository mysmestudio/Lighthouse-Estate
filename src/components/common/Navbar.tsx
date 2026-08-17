import React, { useState } from 'react';
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
  UserPlus,
  Compass,
  Download,
  Smartphone,
  CheckCircle2,
  Vote,
  Wrench,
  ShoppingBag,
  ChevronDown
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
  const { isInstalled, isInstallable, triggerInstall, setShowInstallModal } = usePwa();

  const handleNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    setCommunityDropdownOpen(false);
  };

  const isCommunityActive = currentPath.startsWith('/community');

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

  return (
    <header className="sticky top-0 z-40 bg-[#FBF8F1]/95 backdrop-blur-md border-b border-[#E4D9BE] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Name */}
          <div 
            onClick={() => handleNav('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0F472A] flex items-center justify-center border border-[#C89B3C]/40 shadow-xs group-hover:bg-[#0A2F1C] transition-colors">
              {/* 8-point gold crest icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#E7D19C]">
                <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none"/>
                <rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#C89B3C" strokeWidth="1.5" fill="none" transform="rotate(45 12 12)"/>
                <path d="M12 7V17M7 12H17" stroke="#E7D19C" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-lg sm:text-xl text-[#0A2F1C] tracking-tight">
                  Lighthouse
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-[#E7D19C]/50 text-[#0A2F1C] border border-[#C89B3C]/30">
                  Estate
                </span>
              </div>
              <p className="text-[11px] text-[#10241A]/60 font-medium hidden sm:block">
                Access & Community Portal
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <button
              onClick={() => handleNav('/')}
              className={`text-sm transition-all pb-1 ${
                currentPath === '/'
                  ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                  : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
              }`}
            >
              Overview
            </button>

            {currentUser && (
              <>
                <button
                  onClick={() => handleNav('/dashboard')}
                  className={`text-sm transition-all pb-1 ${
                    currentPath === '/dashboard'
                      ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                      : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
                  }`}
                >
                  Dashboard
                </button>

                <button
                  onClick={() => handleNav('/passes')}
                  className={`flex items-center gap-1.5 text-sm transition-all pb-1 ${
                    currentPath === '/passes'
                      ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                      : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>Passes</span>
                </button>

                {(currentUser.role === 'resident' || currentUser.role === 'admin' || currentUser.role === 'master_admin') && (
                  <button
                    onClick={() => handleNav('/household')}
                    className={`flex items-center gap-1.5 text-sm transition-all pb-1 ${
                      currentPath === '/household'
                        ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                        : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#C89B3C]" />
                    <span>Household</span>
                  </button>
                )}

                <button
                  onClick={() => handleNav('/directory')}
                  className={`flex items-center gap-1.5 text-sm transition-all pb-1 ${
                    currentPath === '/directory'
                      ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                      : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>Directory</span>
                </button>

                <button
                  onClick={() => handleNav('/gate')}
                  className={`flex items-center gap-1.5 text-sm transition-all pb-1 ${
                    currentPath === '/gate'
                      ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                      : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C89B3C]" />
                  <span>Gate Hub</span>
                </button>
              </>
            )}

            {/* Community Features Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCommunityDropdownOpen(!communityDropdownOpen)}
                onBlur={() => setTimeout(() => setCommunityDropdownOpen(false), 250)}
                className={`flex items-center gap-1.5 text-sm transition-all pb-1 ${
                  isCommunityActive
                    ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                    : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
                }`}
              >
                <Vote className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Community</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${communityDropdownOpen ? 'rotate-180 text-[#0F472A]' : 'text-[#10241A]/40'}`} />
              </button>

              {communityDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-56 rounded-2xl bg-white border border-[#E4D9BE] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                  <button
                    onClick={() => handleNav('/community/polls')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      currentPath === '/community/polls' ? 'bg-[#F2EAD9] text-[#0A2F1C]' : 'text-[#10241A] hover:bg-[#FBF8F1]'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-[#E7D19C]/30 text-[#0F472A]">
                      <Vote className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold">Townhall Polls</p>
                      <p className="text-[10px] text-[#10241A]/50 font-normal">Vote on estate initiatives</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNav('/community/tickets')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      currentPath === '/community/tickets' ? 'bg-[#F2EAD9] text-[#0A2F1C]' : 'text-[#10241A] hover:bg-[#FBF8F1]'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-[#E7D19C]/30 text-[#0F472A]">
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold">Fix-It Tickets</p>
                      <p className="text-[10px] text-[#10241A]/50 font-normal">Report maintenance & faults</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNav('/community/marketplace')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      currentPath === '/community/marketplace' ? 'bg-[#F2EAD9] text-[#0A2F1C]' : 'text-[#10241A] hover:bg-[#FBF8F1]'
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-[#E7D19C]/30 text-[#0F472A]">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold">Marketplace</p>
                      <p className="text-[10px] text-[#10241A]/50 font-normal">Resident noticeboard</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleNav('/notices')}
              className={`flex items-center gap-1.5 text-sm transition-all pb-1 ${
                currentPath === '/notices'
                  ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                  : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-[#C89B3C]" />
              <span>Notices</span>
            </button>

            {(currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'madrasa_admin') && (
              <button
                onClick={() => handleNav('/admin')}
                className={`flex items-center gap-1.5 text-sm transition-all pb-1 ${
                  currentPath === '/admin'
                    ? 'text-[#0F472A] font-bold border-b-2 border-[#C89B3C]'
                    : 'text-[#10241A]/60 hover:text-[#10241A] font-medium'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Desktop Right Auth Actions */}
          <div className="hidden md:flex items-center gap-4">
            {!isInstalled && (
              <button
                onClick={() => setShowInstallModal(true)}
                className="px-3 py-1.5 rounded-xl border border-[#C89B3C] bg-[#F2EAD9]/60 hover:bg-[#F2EAD9] text-[#0A2F1C] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                title="Install Lighthouse Estate as Web App"
              >
                <Download className="w-3.5 h-3.5 text-[#C89B3C]" />
                <span>Install App</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-[#10241A]">
                    {currentUser.full_name}
                  </p>
                  <p className="text-[10px] text-[#C89B3C] uppercase tracking-wider font-bold">
                    {roleLabel}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#F2EAD9] border border-[#E4D9BE] flex items-center justify-center text-[#10241A] font-bold text-sm shadow-xs">
                  {currentUser.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'LH'}
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl border border-[#E4D9BE] bg-white hover:bg-[#F2EAD9] text-[#10241A]/70 hover:text-[#0A2F1C] transition-colors shadow-2xs"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleNav('/login')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#0F472A] hover:bg-[#F2EAD9] transition-colors flex items-center gap-1.5"
                >
                  <Key className="w-4 h-4 text-[#C89B3C]" />
                  <span>Portal Login</span>
                </button>
                <button
                  onClick={() => handleNav('/register')}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0F472A] text-white hover:bg-[#0A2F1C] shadow-soft hover:shadow-soft-lg transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4 text-[#E7D19C]" />
                  <span>Resident Register</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {currentUser && (
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-[#F2EAD9] text-[#0A2F1C] border border-[#E4D9BE]">
                {currentUser.role === 'resident' ? `H-${currentUser.house_number}` : currentUser.role}
              </span>
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

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E4D9BE] bg-[#FBF8F1] px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top duration-200">
          {currentUser && (
            <div className="p-3 mb-3 rounded-xl bg-[#F2EAD9] border border-[#E4D9BE]">
              <div className="font-semibold text-sm text-[#0A2F1C]">
                {currentUser.full_name}
              </div>
              <div className="text-xs text-[#0F472A] font-medium">
                {roleLabel}
              </div>
            </div>
          )}

          <button
            onClick={() => handleNav('/')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
              currentPath === '/' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
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
                  currentPath === '/dashboard' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>My Dashboard</span>
              </button>

              <button
                onClick={() => handleNav('/passes')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  currentPath === '/passes' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Visitor Passes</span>
              </button>

              {(currentUser.role === 'resident' || currentUser.role === 'admin' || currentUser.role === 'master_admin') && (
                <button
                  onClick={() => handleNav('/household')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                    currentPath === '/household' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Household Staff & KYC</span>
                </button>
              )}

              <button
                onClick={() => handleNav('/directory')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  currentPath === '/directory' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Staff Directory</span>
              </button>

              <button
                onClick={() => handleNav('/gate')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                  currentPath === '/gate' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Gate Hub Console</span>
              </button>
            </>
          )}

          {/* Community Section in Mobile Drawer */}
          <div className="pt-2 pb-1 border-t border-[#E4D9BE]/60">
            <p className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-widest text-[#0A2F1C]/50">
              Community Hub
            </p>
            <button
              onClick={() => handleNav('/community/polls')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                currentPath === '/community/polls' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
              }`}
            >
              <Vote className="w-4 h-4 text-[#C89B3C]" />
              <span>Townhall Polls</span>
            </button>

            <button
              onClick={() => handleNav('/community/tickets')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                currentPath === '/community/tickets' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
              }`}
            >
              <Wrench className="w-4 h-4 text-[#C89B3C]" />
              <span>Fix-It Tickets</span>
            </button>

            <button
              onClick={() => handleNav('/community/marketplace')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                currentPath === '/community/marketplace' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-[#C89B3C]" />
              <span>Resident Marketplace</span>
            </button>
          </div>

          <button
            onClick={() => handleNav('/notices')}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
              currentPath === '/notices' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Community Notices</span>
          </button>

          {(currentUser?.role === 'admin' || currentUser?.role === 'master_admin' || currentUser?.role === 'madrasa_admin') && (
            <button
              onClick={() => handleNav('/admin')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 ${
                currentPath === '/admin' ? 'bg-[#0F472A] text-white' : 'text-[#10241A] hover:bg-[#F2EAD9]'
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
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-[#0A2F1C] bg-[#F2EAD9] border border-[#C89B3C] flex items-center gap-3 shadow-xs"
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
