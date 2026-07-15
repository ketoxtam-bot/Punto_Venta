/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-14", showText = true }) => {
  return (
    <div id="jjm-logo-wrapper" className={`flex items-center gap-3 select-none ${className}`}>
      {/* High-fidelity Vector SVG replicating the chrome metallic J²M logo */}
      <svg
        id="jjm-svg-logo"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 520 140"
        className="h-full w-auto filter drop-shadow-xl"
      >
        <defs>
          {/* Main 3D Metallic Gradient representing purple/cyan/chrome reflections */}
          <linearGradient id="metallicChrome" x1="0%" y1="0%" x2="100%" y2="85%">
            <stop offset="0%" stopColor="#2c1e5a" /> {/* Deep Purple Shadow */}
            <stop offset="15%" stopColor="#5130a4" /> {/* Royal Purple */}
            <stop offset="35%" stopColor="#7cbef0" /> {/* Vibrant Cyan Reflection */}
            <stop offset="50%" stopColor="#f5faff" /> {/* Pure White Highlight */}
            <stop offset="65%" stopColor="#a3e3fc" /> {/* Pastel Blue */}
            <stop offset="85%" stopColor="#6337b5" /> {/* Purple sheen */}
            <stop offset="100%" stopColor="#12102a" /> {/* Deep Base Shadow */}
          </linearGradient>

          {/* Stroke Chrome Gradient for 3D bevel borders */}
          <linearGradient id="strokeChrome" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="30%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>

          {/* Core Deep Blue Metallic for Subtext */}
          <linearGradient id="textChrome" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3a2a7a" />
            <stop offset="50%" stopColor="#6359b0" />
            <stop offset="100%" stopColor="#2b3b7a" />
          </linearGradient>

          {/* Subtle Outer Glow Filter for high-end feel */}
          <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComponentTransfer in="blur" result="glow1">
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="glow1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 3D Drop Shadow Backing */}
        <g transform="translate(4, 5)" opacity="0.35">
          <path
            d="M 25,100 L 25,50 C 25,50 35,50 45,50 L 45,85 C 45,85 75,85 98,85 L 98,35 L 122,35 L 122,85 L 152,50 L 178,50 L 140,100 Z"
            fill="#050510"
          />
          <path
            d="M 122,35 L 144,35 L 144,85 L 122,85 Z"
            fill="#050510"
          />
          <path
            d="M 144,35 L 166,35 L 166,85 L 144,85 Z"
            fill="#050510"
          />
        </g>

        {/* Remastered J²M Icon with Chrome Gradients */}
        <g filter="url(#subtleGlow)">
          {/* Main J Shape and bottom curve */}
          <path
            d="M 25,100 
               L 25,48 
               C 25,48 36,48 45,48 
               L 45,82 
               C 45,82 78,82 100,82 
               L 100,30 
               L 122,30 
               L 122,82 
               L 156,48 
               L 178,48 
               L 140,100 
               Z"
            fill="url(#metallicChrome)"
            stroke="url(#strokeChrome)"
            strokeWidth="1"
          />

          {/* M Left Stem Overlap */}
          <path
            d="M 122,30 
               L 144,30 
               L 144,82 
               L 122,82 
               Z"
            fill="url(#metallicChrome)"
            stroke="url(#strokeChrome)"
            strokeWidth="1"
            opacity="0.95"
          />

          {/* M Right Stem / Diagonals */}
          <path
            d="M 144,30 
               L 166,30 
               L 166,82 
               L 144,82 
               Z"
            fill="url(#metallicChrome)"
            stroke="url(#strokeChrome)"
            strokeWidth="1"
            opacity="0.85"
          />

          {/* Superscript 2 Exponent */}
          <path
            d="M 104,22 
               C 104,15 117,15 117,20 
               C 117,24 106,26 104,29 
               L 104,31 
               L 119,31 
               L 119,29 
               L 109,29 
               C 111,26 119,24 119,20 
               C 119,13 102,13 102,20 
               Z"
            fill="url(#metallicChrome)"
            stroke="url(#strokeChrome)"
            strokeWidth="0.5"
          />
        </g>

        {/* Corporate Vector Typography below / next to the logo */}
        {showText && (
          <g>
            {/* Main brand line */}
            <text
              x="195"
              y="62"
              fontFamily="'Inter', 'Space Grotesk', sans-serif"
              fontSize="34"
              fontWeight="900"
              letterSpacing="3.5"
              fill="url(#textChrome)"
              filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.1))"
            >
              JJM TECNOLOGÍAS
            </text>

            {/* Business type and corporation descriptor */}
            <text
              x="196"
              y="94"
              fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              fontSize="16"
              fontWeight="800"
              letterSpacing="5.5"
              fill="#5c5a70"
            >
              INNOVADORAS, S.A. DE C.V.
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
