import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0A2F1C] text-[#FBF8F1] border-t border-[#C89B3C]/30 py-6 mt-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#E7D19C]/80">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-[#FBF8F1]">Lighthouse Estate</span>
            <span className="text-[#C89B3C]">•</span>
            <span>Resident Access Portal</span>
          </div>
          <p>© {new Date().getFullYear()} Lighthouse Estate Residents Association. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

