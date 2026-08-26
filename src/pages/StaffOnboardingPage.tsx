import React from 'react';
import { LoginPage } from './LoginPage';
import { AppUser } from '../types';

interface StaffOnboardingPageProps {
  navigate: (path: string) => void;
  onLoginSuccess?: (user: AppUser) => void;
}

export const StaffOnboardingPage: React.FC<StaffOnboardingPageProps> = ({ navigate, onLoginSuccess }) => {
  return (
    <LoginPage
      navigate={navigate}
      onLoginSuccess={onLoginSuccess || (() => {})}
      initialView="staff-1"
    />
  );
};
