import React from 'react';
import { LoginPage } from './LoginPage';
import { AppUser } from '../types';

interface RegisterPageProps {
  navigate: (path: string) => void;
  onLoginSuccess?: (user: AppUser) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate, onLoginSuccess }) => {
  return (
    <LoginPage
      navigate={navigate}
      onLoginSuccess={onLoginSuccess || (() => {})}
      initialView="register"
    />
  );
};
