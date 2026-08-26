import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const MergeIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* 4 Corner brackets with side and top/bottom cutouts */}
    <path d="M3 7.5V5a2 2 0 0 1 2-2h3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v2.5" />
    <path d="M21 16.5V19a2 2 0 0 1-2 2h-3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-2.5" />

    {/* Left inward arrow */}
    <path d="M2 12h8" />
    <path d="M6.5 8.5L10 12l-3.5 3.5" />

    {/* Right inward arrow */}
    <path d="M22 12h-8" />
    <path d="M17.5 8.5L14 12l3.5 3.5" />
  </svg>
);

export const UnmergeIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Vertical dividing center line */}
    <path d="M12 3v18" />

    {/* Left outer bracket: top-left & bottom-left */}
    <path d="M12 3H5a2 2 0 0 0-2 2v2.5" />
    <path d="M3 16.5V19a2 2 0 0 0 2 2h7" />

    {/* Right outer bracket: top-right & bottom-right */}
    <path d="M12 3h7a2 2 0 0 1 2 2v2.5" />
    <path d="M21 16.5V19a2 2 0 0 1-2 2h-7" />

    {/* Left outward arrow */}
    <path d="M12 12H4" />
    <path d="M7.5 8.5L4 12l3.5 3.5" />

    {/* Right outward arrow */}
    <path d="M12 12h8" />
    <path d="M16.5 8.5L20 12l-3.5 3.5" />
  </svg>
);

export const CanvasIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Row 1 - Left bar */}
    <rect x="3.5" y="5.8" width="7.2" height="2.8" rx="0.4" />

    {/* Row 1 - Right T/step: vertical stem + right horizontal bar */}
    <rect x="12.2" y="3.2" width="2.8" height="7.6" rx="0.4" />
    <rect x="15" y="5.8" width="5.5" height="2.8" rx="0.4" />

    {/* Row 2 - Left T/step: left horizontal bar + vertical stem */}
    <rect x="3.5" y="11.8" width="5.5" height="2.8" rx="0.4" />
    <rect x="9" y="9.2" width="2.8" height="7.6" rx="0.4" />

    {/* Row 2 - Right bar */}
    <rect x="13.3" y="11.8" width="7.2" height="2.8" rx="0.4" />

    {/* Row 3 - Left bar */}
    <rect x="3.5" y="17.8" width="7.2" height="2.8" rx="0.4" />

    {/* Row 3 - Right T/step: vertical stem + right horizontal bar */}
    <rect x="12.2" y="15.2" width="2.8" height="7.6" rx="0.4" />
    <rect x="15" y="17.8" width="5.5" height="2.8" rx="0.4" />
  </svg>
);

