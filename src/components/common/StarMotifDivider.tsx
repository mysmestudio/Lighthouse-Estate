import React from 'react';

interface StarMotifDividerProps {
  className?: string;
  variant?: 'gold' | 'forest' | 'muted';
  label?: string;
}

export const StarMotifDivider: React.FC<StarMotifDividerProps> = ({
  className = '',
  variant = 'gold',
  label,
}) => {
  const strokeColor = variant === 'gold' ? '#C89B3C' : variant === 'forest' ? '#0F472A' : '#E4D9BE';
  const lineColor = variant === 'gold' ? 'border-[#E4D9BE]' : 'border-[#E4D9BE]';

  return (
    <div className={`flex items-center justify-center my-8 ${className}`}>
      <div className={`flex-1 border-t ${lineColor} opacity-70`}></div>
      <div className="mx-4 flex items-center gap-2">
        {/* 8-point geometric star (Rub el Hizb) SVG */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#C89B3C]"
        >
          <rect
            x="5"
            y="5"
            width="14"
            height="14"
            rx="1.5"
            stroke={strokeColor}
            strokeWidth="1.5"
            fill="none"
          />
          <rect
            x="5"
            y="5"
            width="14"
            height="14"
            rx="1.5"
            stroke={strokeColor}
            strokeWidth="1.5"
            fill="none"
            transform="rotate(45 12 12)"
          />
          <circle cx="12" cy="12" r="2" fill={strokeColor} />
        </svg>
        {label && (
          <span className="text-xs tracking-wider uppercase font-semibold text-[#10241A]/70 px-1 font-sans">
            {label}
          </span>
        )}
      </div>
      <div className={`flex-1 border-t ${lineColor} opacity-70`}></div>
    </div>
  );
};
