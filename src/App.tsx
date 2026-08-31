import React, { useState, useEffect } from 'react';
import { PwaProvider } from './context/PwaContext';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { InstallPromptBanner } from './components/pwa/InstallPromptBanner';
import { InstallModal } from './components/pwa/InstallModal';
import { UpdateToast } from './components/pwa/UpdateToast';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { PassesPage } from './pages/PassesPage';
import { GatePage } from './pages/GatePage';
import { NoticesPage } from './pages/NoticesPage';
import { AdminPage } from './pages/AdminPage';
import { HouseholdHubPage } from './pages/HouseholdHubPage';
import { StaffOnboardingPage } from './pages/StaffOnboardingPage';
import { StaffDirectoryPage } from './pages/StaffDirectoryPage';
import { FixItTicketsPage } from './pages/FixItTicketsPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { TownhallPollsPage } from './pages/TownhallPollsPage';
import { GuardSosPanelPage } from './pages/GuardSosPanelPage';
import { MadrasaAdminPage } from './pages/MadrasaAdminPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { SettingsProfilePage } from './pages/SettingsProfilePage';
import { PersistentSOSButton } from './components/sos/PersistentSOSButton';
import { AppUser } from './types';
import { getStoredCurrentUser, setStoredCurrentUser } from './lib/auth-helpers';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredCurrentUser());
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Sync route with browser history
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    setStoredCurrentUser(user);
    if (user.role === 'admin' || user.role === 'master_admin' || user.role === 'madrasa_admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStoredCurrentUser(null);
    navigate('/login');
  };

  const renderRoute = () => {
    switch (currentPath) {
      case '/login':
        return <LoginPage navigate={navigate} onLoginSuccess={handleLoginSuccess} />;
      case '/register':
        return <RegisterPage navigate={navigate} />;
      case '/dashboard':
        return <DashboardPage currentUser={currentUser} navigate={navigate} onLogout={handleLogout} />;
      case '/passes':
        return <PassesPage currentUser={currentUser} navigate={navigate} />;
      case '/facilities':
        return <FacilitiesPage currentUser={currentUser} navigate={navigate} />;
      case '/gate':
        return <GatePage currentUser={currentUser} navigate={navigate} />;
      case '/notices':
        return <NoticesPage currentUser={currentUser} navigate={navigate} />;
      case '/community/tickets':
      case '/fix-it-tickets':
        return <FixItTicketsPage currentUser={currentUser} navigate={navigate} />;
      case '/community/marketplace':
      case '/polls':
        return <TownhallPollsPage currentUser={currentUser} navigate={navigate} />;
      case '/madrasa':
        return <MadrasaAdminPage currentUser={currentUser} navigate={navigate} onLogout={handleLogout} />;
      case '/gate/alerts':
        return <GuardSosPanelPage currentUser={currentUser} navigate={navigate} />;
      case '/marketplace':
        return <MarketplacePage currentUser={currentUser} navigate={navigate} />;
      case '/household':
        return <HouseholdHubPage currentUser={currentUser} navigate={navigate} />;
      case '/staff-onboarding':
        return <StaffOnboardingPage navigate={navigate} />;
      case '/directory':
        return <StaffDirectoryPage currentUser={currentUser} navigate={navigate} />;
      case '/settings':
      case '/profile':
        return (
          <SettingsProfilePage
            currentUser={currentUser}
            navigate={navigate}
            onUserUpdated={(updatedUser) => {
              setCurrentUser(updatedUser);
              setStoredCurrentUser(updatedUser);
            }}
            onLogout={handleLogout}
          />
        );
      case '/admin':
        return <AdminPage currentUser={currentUser} navigate={navigate} onLogout={handleLogout} />;
      case '/':
      default:
        return <LandingPage navigate={navigate} />;
    }
  };

  const isLandingPage = currentPath === '/' || currentPath === '';
  const isStandaloneMockupPage = true; // All pages now feature the unified Lighthouse Lekki design system with dedicated pillbar headers, lattice hero, floating dock, and 5s SOS button.

  return (
    <PwaProvider>
      <div className={`min-h-screen flex flex-col ${isLandingPage || currentPath === '/login' || currentPath === '/register' || currentPath === '/staff-onboarding' ? 'bg-[#123528]' : 'bg-[#FBFDF9]'} text-[#16241D]`}>
        <OfflineBanner />
        {!isStandaloneMockupPage && (
          <Navbar
            currentPath={currentPath}
            navigate={navigate}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}
        <main className={'flex-1'}>
          {renderRoute()}
        </main>
        {!isStandaloneMockupPage && <Footer />}

        {/* PWA Enhancements */}
        <InstallPromptBanner />
        <InstallModal />
        <UpdateToast />

        {/* Persistent High-Contrast Emergency SOS Button (for subpages that don't have their own built-in SOS button) */}
        {!isStandaloneMockupPage && (
          <PersistentSOSButton currentUser={currentUser} navigate={navigate} />
        )}
      </div>
    </PwaProvider>
  );
}

