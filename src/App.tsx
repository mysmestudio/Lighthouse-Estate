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
import { TownhallPollsPage } from './pages/TownhallPollsPage';
import { FixItTicketsPage } from './pages/FixItTicketsPage';
import { MarketplacePage } from './pages/MarketplacePage';
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
        return <DashboardPage currentUser={currentUser} navigate={navigate} />;
      case '/passes':
        return <PassesPage currentUser={currentUser} navigate={navigate} />;
      case '/gate':
        return <GatePage currentUser={currentUser} navigate={navigate} />;
      case '/notices':
        return <NoticesPage currentUser={currentUser} navigate={navigate} />;
      case '/community/polls':
        return <TownhallPollsPage currentUser={currentUser} navigate={navigate} />;
      case '/community/tickets':
        return <FixItTicketsPage currentUser={currentUser} navigate={navigate} />;
      case '/community/marketplace':
        return <MarketplacePage currentUser={currentUser} navigate={navigate} />;
      case '/household':
        return <HouseholdHubPage currentUser={currentUser} navigate={navigate} />;
      case '/staff-onboarding':
        return <StaffOnboardingPage navigate={navigate} />;
      case '/directory':
        return <StaffDirectoryPage currentUser={currentUser} navigate={navigate} />;
      case '/admin':
        return <AdminPage currentUser={currentUser} navigate={navigate} />;
      case '/':
      default:
        return <LandingPage navigate={navigate} currentUser={currentUser} />;
    }
  };

  return (
    <PwaProvider>
      <div className="min-h-screen flex flex-col bg-[#FBF8F1] text-[#10241A]">
        <OfflineBanner />
        <Navbar
          currentPath={currentPath}
          navigate={navigate}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="flex-1">
          {renderRoute()}
        </main>
        <Footer />

        {/* PWA Enhancements */}
        <InstallPromptBanner />
        <InstallModal />
        <UpdateToast />

        {/* Persistent High-Contrast Emergency SOS Button (Always on screen for authenticated users) */}
        <PersistentSOSButton currentUser={currentUser} navigate={navigate} />
      </div>
    </PwaProvider>
  );
}

