import React from 'react';
import { cn } from '../../lib/utils';

export const getInitials = (name = 'Agency') => {
  if (!name) return 'QS';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

/**
 * Agency / Partner Logo Component
 * - If `logo` (or `agent.avatar` / `agent.logo`) is provided, displays the company logo image.
 * - Otherwise falls back to the exact default gradient lettermark:
 *   <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#042C53] to-[#0A4E8C] flex items-center justify-center text-white text-xl font-bold font-['Outfit'] shadow-md shrink-0">
 *     {initials}
 *   </div>
 */
export const AgencyLogo = ({
  agent,
  name,
  logo,
  size = 'md', // 'xs' (28px), 'sm' (36px), 'md' (48px), 'lg' (64px), 'xl' (80px)
  className,
  rounded = 'rounded-2xl',
}) => {
  const effectiveName = name || agent?.agencyName || agent?.name || 'Agency';
  const effectiveLogo = logo || agent?.avatar || agent?.logo || null;
  const initials = getInitials(effectiveName);

  const sizeStyles = {
    xs: 'w-7 h-7 text-[10px] rounded-lg',
    sm: 'w-9 h-9 text-xs rounded-xl',
    md: 'w-12 h-12 text-sm rounded-xl',
    lg: 'w-16 h-16 text-xl rounded-2xl',
    xl: 'w-20 h-20 text-2xl rounded-2xl',
  };

  const selectedSize = sizeStyles[size] || sizeStyles.md;

  if (effectiveLogo) {
    return (
      <div
        className={cn(
          'bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-sm shrink-0',
          selectedSize,
          rounded,
          className
        )}
      >
        <img
          src={effectiveLogo}
          alt={effectiveName}
          className="w-full h-full object-contain rounded-lg"
          onError={(e) => {
            // If image fails to load, fallback to initials display
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.parentElement) {
              e.currentTarget.parentElement.innerHTML = `<span class="font-bold text-[#042C53]">${initials}</span>`;
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-[#042C53] to-[#0A4E8C] flex items-center justify-center text-white font-bold font-['Outfit'] shadow-md shrink-0 select-none",
        selectedSize,
        rounded,
        className
      )}
    >
      {initials}
    </div>
  );
};

export default AgencyLogo;

