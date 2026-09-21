import React from "react";

interface LogoIconProps {
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-7 h-7" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Folded Corner Triangle (Top Right Background) */}
      <polygon points="53,16 53,37 73,37" fill="#00bca4" />
      
      {/* Crisp white border along the fold edge */}
      <line x1="53" y1="36" x2="73" y2="36" stroke="#ffffff" strokeWidth="2.5" />
      <line x1="53" y1="16" x2="53" y2="36" stroke="#ffffff" strokeWidth="2.5" />

      {/* Main Navy Blue Resume Document with Tailored Hourglass Curve */}
      <path 
        d="
          M 34 16
          L 53 16
          L 53 37
          C 53 37, 68 37, 73.5 37.5
          C 62 44, 57 50, 56.5 54
          C 56.5 55, 61 68, 71 84
          L 34 84
          C 29.5 84, 26.5 81, 26.5 76.5
          L 26.5 23.5
          C 26.5 19, 29.5 16, 34 16
          Z
        " 
        fill="#002b49" 
      />

      {/* Tailored Sewing Dash Line along the concave waist cut */}
      <path 
        d="
          M 66 40
          C 58.5 45, 55 51, 55 54.5
          C 55 58, 59 70, 68 83
        " 
        fill="none" 
        stroke="#00bca4" 
        strokeWidth="2.4" 
        strokeDasharray="3.2 2.2" 
        strokeLinecap="round" 
      />

      {/* Target Pinpoint Marker at the tailor pinch point */}
      <line x1="47.5" y1="55" x2="51.5" y2="55" stroke="#00bca4" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="58.5" y1="55" x2="62.5" y2="55" stroke="#00bca4" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="55" cy="55" r="4.2" fill="#00bca4" stroke="#002b49" strokeWidth="1.2" />
      <circle cx="55" cy="55" r="1.6" fill="#ffffff" />
    </svg>
  );
};
