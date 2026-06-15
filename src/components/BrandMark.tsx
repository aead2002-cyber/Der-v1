import React from 'react';

interface BrandMarkProps {
  className?: string;
  size?: number;
}

// Stylized DER3 brand mark: two overlapping shields (navy + olive green)
// with a calligraphic curl evoking the Arabic letter "د".
export const BrandMark: React.FC<BrandMarkProps> = ({ className, size }) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-label="DER3"
  >
    {/* Olive green back shield */}
    <path
      d="M14 12 C 14 10, 16 8, 18 8 L 36 8 C 38 8, 40 10, 40 12 L 40 38 C 40 48, 32 56, 28 58 C 24 56, 14 48, 14 38 Z"
      fill="#8ba368"
    />
    {/* Navy front shield, slightly offset */}
    <path
      d="M24 14 C 24 12, 26 10, 28 10 L 46 10 C 48 10, 50 12, 50 14 L 50 40 C 50 50, 42 58, 38 60 C 34 58, 24 50, 24 40 Z"
      fill="#1f3a5f"
    />
    {/* Calligraphic curl evoking ”د“ */}
    <path
      d="M30 22 Q 38 20, 42 26 Q 44 32, 38 36 Q 32 38, 30 32"
      fill="none"
      stroke="#8ba368"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);
