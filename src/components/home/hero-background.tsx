/**
 * HeroBackground — Full-screen ambient decorative backdrop for BRIGHTCAMP.
 * 
 * Recreates the deep midnight navy sky and flowing cyan/blue wave ribbons
 * from the approved 3D reference design.
 * 
 * Scalable, lightweight SVG. Pointer-events none, 100% accessible.
 */

import React from 'react';

export function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        style={{
          width: '100%',
          maxWidth: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          {/* Deep celestial sky background matching approved 3D reference */}
          <radialGradient id="sky-deep" cx="30%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#051538" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#03102a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#020817" stopOpacity="1" />
          </radialGradient>

          {/* Celestial dome background behind 3D campus on the right matching #041845 */}
          <radialGradient id="campus-sky-glow" cx="74%" cy="30%" r="52%">
            <stop offset="0%" stopColor="#051b47" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#04163b" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#03102a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#020817" stopOpacity="0" />
          </radialGradient>

          {/* Left Ribbon Glow 1 */}
          <linearGradient id="ribbon-glow-cyan" x1="0%" y1="30%" x2="60%" y2="70%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.65" />
            <stop offset="35%" stopColor="#00b4d8" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#0077b6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>

          {/* Left Ribbon Glow 2 */}
          <linearGradient id="ribbon-glow-blue" x1="10%" y1="20%" x2="70%" y2="90%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#8b5cf6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>

          {/* Highlight Edge Gradient */}
          <linearGradient id="ribbon-edge-highlight" x1="0%" y1="40%" x2="65%" y2="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="30%" stopColor="#67e8f9" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>

          {/* Bottom Card Area Gradient */}
          <linearGradient id="terrain-ground" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#081426" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#050e1c" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#030812" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Base dark celestial background */}
        <rect width="1440" height="900" fill="url(#sky-deep)" />

        {/* Soft celestial sky lighting behind 3D campus */}
        <ellipse cx="1040" cy="270" rx="460" ry="260" fill="url(#campus-sky-glow)" />

        {/* Ambient starry speckles */}
        <g opacity="0.45">
          <circle cx="120" cy="90" r="1.2" fill="#ffffff" />
          <circle cx="280" cy="140" r="1.5" fill="#38bdf8" />
          <circle cx="420" cy="80" r="1.2" fill="#ffffff" />
          <circle cx="210" cy="230" r="1.0" fill="#a855f7" />
          <circle cx="360" cy="290" r="1.4" fill="#38bdf8" />
          <circle cx="580" cy="120" r="1.2" fill="#ffffff" />
          <circle cx="680" cy="70" r="1.5" fill="#38bdf8" />
        </g>

        {/* Glowing flowing ribbon waves on the left */}
        <g>
          {/* Broad diffuse background wave ribbon */}
          <path
            d="M -60 180 C 140 120, 260 380, 480 340 C 640 310, 720 220, 780 200 C 720 300, 520 440, 320 420 C 120 400, -20 280, -60 180 Z"
            fill="url(#ribbon-glow-cyan)"
            filter="blur(16px)"
          />

          {/* Core vivid sweeping ribbon */}
          <path
            d="M -40 220 C 120 180, 220 370, 440 330 C 580 300, 680 230, 720 220 C 660 290, 500 400, 300 390 C 100 380, 0 300, -40 220 Z"
            fill="url(#ribbon-glow-blue)"
            filter="blur(8px)"
          />

          {/* Sharp glowing edge crest */}
          <path
            d="M -40 220 C 120 180, 220 370, 440 330 C 560 305, 650 245, 710 225"
            stroke="url(#ribbon-edge-highlight)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            filter="drop-shadow(0 0 8px #38bdf8)"
          />

          {/* Secondary subtle lower ribbon trailing behind CTA */}
          <path
            d="M -80 360 C 80 320, 180 430, 380 410 C 520 390, 620 360, 680 340"
            stroke="url(#ribbon-edge-highlight)"
            strokeWidth="1.6"
            strokeOpacity="0.5"
            fill="none"
          />
        </g>

        {/* Gentle ground plane gradient at the bottom behind the workspace cards */}
        <rect y="580" width="1440" height="320" fill="url(#terrain-ground)" />
      </svg>
    </div>
  );
}
