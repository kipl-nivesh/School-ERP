/**
 * HeroBackground — Vector-accurate decorative backdrop for the BRIGHTCAMP homepage.
 * 
 * Recreates the AI concept reference image:
 *  - Left: Ethereal glowing cyan and electric-blue flowing wave ribbons.
 *  - Right: Neoclassical miniature illuminated schoolhouse on a gentle rolling hill
 *    with a clock tower, waving pennant flag, warm glowing windows, and lush trees.
 * 
 * Scalable, lightweight SVG (zero raster image assets, zero network latency).
 * Fully non-interactive (pointer-events: none) and high contrast preserved for all text.
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
        viewBox="0 0 1440 820"
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
          {/* Deep ambient background gradient */}
          <radialGradient id="sky-ambient" cx="80%" cy="30%" r="55%">
            <stop offset="0%" stopColor="#13274f" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#0a152e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#050a17" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="school-glow" cx="82%" cy="40%" r="35%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
            <stop offset="45%" stopColor="#a855f7" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#070d1c" stopOpacity="0" />
          </radialGradient>

          {/* Left Ribbon Gradients */}
          <linearGradient id="ribbon-grad-1" x1="0%" y1="20%" x2="45%" y2="60%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#0284c7" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="ribbon-grad-2" x1="0%" y1="40%" x2="50%" y2="80%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="ribbon-edge" x1="0%" y1="30%" x2="60%" y2="70%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>

          {/* Hill Gradients */}
          <linearGradient id="hill-front" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#0d2542" />
            <stop offset="35%" stopColor="#091b30" />
            <stop offset="100%" stopColor="#050d18" />
          </linearGradient>

          <linearGradient id="hill-back" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#071b2d" />
            <stop offset="100%" stopColor="#030b13" />
          </linearGradient>

          <linearGradient id="hill-rim" x1="60%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
            <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
          </linearGradient>

          {/* School Building Gradients */}
          <linearGradient id="school-wall" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#283e63" />
            <stop offset="50%" stopColor="#1e3252" />
            <stop offset="100%" stopColor="#14243d" />
          </linearGradient>

          <linearGradient id="school-roof" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#314e7a" />
            <stop offset="60%" stopColor="#1e3454" />
            <stop offset="100%" stopColor="#132239" />
          </linearGradient>

          <linearGradient id="clock-face" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          <radialGradient id="window-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#fde047" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0.6" />
          </radialGradient>

          <radialGradient id="door-glow" cx="50%" cy="80%" r="70%">
            <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#facc15" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.4" />
          </radialGradient>

          {/* Tree Gradients */}
          <linearGradient id="tree-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d5248" />
            <stop offset="60%" stopColor="#083832" />
            <stop offset="100%" stopColor="#04201c" />
          </linearGradient>

          <linearGradient id="tree-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#115e59" />
            <stop offset="60%" stopColor="#094541" />
            <stop offset="100%" stopColor="#042725" />
          </linearGradient>
        </defs>

        {/* Ambient Sky Glow on Right */}
        <rect width="1440" height="820" fill="url(#sky-ambient)" />
        <rect width="1440" height="820" fill="url(#school-glow)" />

        {/* ============================================================== */}
        {/* LEFT ETHEREAL GLOWING WAVE RIBBONS                             */}
        {/* ============================================================== */}
        <g opacity="0.85">
          {/* Broad luminous ribbon body */}
          <path
            d="M-80 320 C120 220, 240 380, 390 290 C510 220, 580 360, 720 310 C620 380, 460 300, 320 420 C180 540, -20 460, -80 430 Z"
            fill="url(#ribbon-grad-1)"
          />

          {/* Secondary upper crest wave */}
          <path
            d="M-60 210 C140 140, 280 290, 420 200 C520 140, 590 240, 680 190 C560 260, 430 180, 290 310 C170 420, -10 330, -60 310 Z"
            fill="url(#ribbon-grad-2)"
            opacity="0.6"
          />

          {/* Sharp glowing top edge line */}
          <path
            d="M-80 260 C120 170, 260 330, 400 240 C520 160, 610 290, 750 230"
            stroke="url(#ribbon-edge)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Delicate faint lower accent line */}
          <path
            d="M-40 380 C150 320, 280 440, 440 370 C540 330, 640 400, 740 360"
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
        </g>

        {/* ============================================================== */}
        {/* RIGHT ROLLING HILLS & HORIZON                                  */}
        {/* ============================================================== */}
        {/* Rear subtle hill */}
        <path
          d="M820 470 Q1060 380 1440 370 L1440 820 L820 820 Z"
          fill="url(#hill-back)"
        />

        {/* Front rolling hill holding the school */}
        <path
          d="M740 520 Q1050 380 1440 350 L1440 820 L740 820 Z"
          fill="url(#hill-front)"
        />
        {/* Glowing crest of the hill */}
        <path
          d="M740 520 Q1050 380 1440 350"
          stroke="url(#hill-rim)"
          strokeWidth="3"
        />

        {/* ============================================================== */}
        {/* ROLLING HILL FLANKING TREES                                    */}
        {/* ============================================================== */}
        {/* Left trees */}
        <g>
          {/* Background darker tree */}
          <ellipse cx="1065" cy="425" rx="34" ry="42" fill="url(#tree-grad-1)" />
          {/* Midground trees */}
          <ellipse cx="1090" cy="435" rx="38" ry="44" fill="url(#tree-grad-2)" />
          <ellipse cx="1115" cy="450" rx="30" ry="34" fill="url(#tree-grad-1)" />
          {/* Subtle cyan rim light on trees */}
          <path
            d="M1035 425 Q1065 385 1090 415 Q1120 405 1145 450"
            stroke="#2dd4bf"
            strokeWidth="1.5"
            strokeOpacity="0.45"
            fill="none"
          />
        </g>

        {/* Right trees */}
        <g>
          <ellipse cx="1370" cy="405" rx="38" ry="46" fill="url(#tree-grad-2)" />
          <ellipse cx="1405" cy="415" rx="32" ry="38" fill="url(#tree-grad-1)" />
          <path
            d="M1335 405 Q1370 365 1405 395"
            stroke="#2dd4bf"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            fill="none"
          />
        </g>

        {/* ============================================================== */}
        {/* NEOCLASSICAL 3D MINIATURE SCHOOLHOUSE                           */}
        {/* Building bounds: X: 1120 to 1350, Y: 220 to 450                */}
        {/* ============================================================== */}
        <g id="school-building">
          {/* Ambient illumination behind building */}
          <circle cx="1235" cy="330" r="140" fill="#38bdf8" opacity="0.1" />

          {/* Main central podium / foundation steps */}
          <path d="M1125 440 L1345 440 L1350 448 L1120 448 Z" fill="#1b283d" />
          <path d="M1135 434 L1335 434 L1340 440 L1130 440 Z" fill="#253754" />

          {/* Left Wing Facade */}
          <rect x="1135" y="325" width="65" height="108" fill="url(#school-wall)" rx="2" />
          {/* Right Wing Facade */}
          <rect x="1270" y="325" width="65" height="108" fill="url(#school-wall)" rx="2" />

          {/* Left Wing Roof */}
          <polygon points="1130,325 1205,325 1195,285 1140,285" fill="url(#school-roof)" />
          <line x1="1140" y1="285" x2="1195" y2="285" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5" />

          {/* Right Wing Roof */}
          <polygon points="1265,325 1340,325 1330,285 1275,285" fill="url(#school-roof)" />
          <line x1="1275" y1="285" x2="1330" y2="285" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5" />

          {/* Central Main Pavilion Facade (Projecting slightly forward) */}
          <rect x="1195" y="300" width="80" height="134" fill="#243b5e" rx="3" />
          {/* Cornice trim */}
          <rect x="1190" y="297" width="90" height="5" fill="#3a5682" rx="1" />
          <line x1="1190" y1="297" x2="1280" y2="297" stroke="#7dd3fc" strokeWidth="1.2" strokeOpacity="0.7" />

          {/* Central Clock Tower (Upper Section) */}
          <rect x="1208" y="245" width="54" height="55" fill="#203452" rx="2" />
          <rect x="1204" y="243" width="62" height="4" fill="#3a5682" />

          {/* Pediment / Triangular Gable on Tower */}
          <polygon points="1202,243 1268,243 1235,212" fill="url(#school-roof)" />
          {/* Gable rim highlight */}
          <line x1="1202" y1="243" x2="1235" y2="212" stroke="#67e8f9" strokeWidth="2" strokeOpacity="0.8" />
          <line x1="1235" y1="212" x2="1268" y2="243" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.6" />

          {/* Flagpole and Waving Flag at Apex */}
          <line x1="1235" y1="212" x2="1235" y2="185" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Pennant / Flag */}
          <path
            d="M1236 186 C1246 182, 1254 192, 1264 187 L1264 198 C1254 203, 1246 193, 1236 197 Z"
            fill="#d946ef"
            filter="drop-shadow(0 0 6px rgba(217, 70, 239, 0.6))"
          />

          {/* Circular Illuminated Clock Tower Face */}
          <circle cx="1235" cy="272" r="14" fill="#1e293b" stroke="#7dd3fc" strokeWidth="2" />
          <circle cx="1235" cy="272" r="12" fill="url(#clock-face)" />
          {/* Clock hands pointing at 10:10 */}
          <line x1="1235" y1="272" x2="1228" y2="266" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="1235" y1="272" x2="1242" y2="267" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="1235" cy="272" r="1.5" fill="#0f172a" />

          {/* Double Entrance Doors at Center Base */}
          <path d="M1223 434 L1223 388 Q1235 382 1247 388 L1247 434 Z" fill="#132136" />
          <path d="M1225 434 L1225 390 Q1235 385 1245 390 L1245 434 Z" fill="url(#door-glow)" />
          {/* Door divider */}
          <line x1="1235" y1="386" x2="1235" y2="434" stroke="#713f12" strokeWidth="1.2" />

          {/* Pillars flanking the central door */}
          <rect x="1215" y="380" width="5" height="54" fill="#3b5278" />
          <rect x="1250" y="380" width="5" height="54" fill="#3b5278" />

          {/* Transom window over door */}
          <rect x="1225" y="350" width="20" height="22" rx="2" fill="url(#window-glow)" />
          <line x1="1235" y1="350" x2="1235" y2="372" stroke="#451a03" strokeWidth="1" />
          <line x1="1225" y1="361" x2="1245" y2="361" stroke="#451a03" strokeWidth="1" />

          {/* ============================================================ */}
          {/* WARM GLOWING WINDOWS (4 ON LEFT WING, 4 ON RIGHT WING)        */}
          {/* ============================================================ */}
          {/* Left Wing - Upper Floor */}
          <g>
            <rect x="1146" y="342" width="16" height="22" rx="2" fill="url(#window-glow)" />
            <line x1="1154" y1="342" x2="1154" y2="364" stroke="#451a03" strokeWidth="1" />
            <line x1="1146" y1="353" x2="1162" y2="353" stroke="#451a03" strokeWidth="1" />

            <rect x="1172" y="342" width="16" height="22" rx="2" fill="url(#window-glow)" />
            <line x1="1180" y1="342" x2="1180" y2="364" stroke="#451a03" strokeWidth="1" />
            <line x1="1172" y1="353" x2="1188" y2="353" stroke="#451a03" strokeWidth="1" />
          </g>

          {/* Left Wing - Ground Floor */}
          <g>
            <rect x="1146" y="385" width="16" height="24" rx="2" fill="url(#window-glow)" />
            <line x1="1154" y1="385" x2="1154" y2="409" stroke="#451a03" strokeWidth="1" />
            <line x1="1146" y1="397" x2="1162" y2="397" stroke="#451a03" strokeWidth="1" />

            <rect x="1172" y="385" width="16" height="24" rx="2" fill="url(#window-glow)" />
            <line x1="1180" y1="385" x2="1180" y2="409" stroke="#451a03" strokeWidth="1" />
            <line x1="1172" y1="397" x2="1188" y2="397" stroke="#451a03" strokeWidth="1" />
          </g>

          {/* Right Wing - Upper Floor */}
          <g>
            <rect x="1282" y="342" width="16" height="22" rx="2" fill="url(#window-glow)" />
            <line x1="1290" y1="342" x2="1290" y2="364" stroke="#451a03" strokeWidth="1" />
            <line x1="1282" y1="353" x2="1298" y2="353" stroke="#451a03" strokeWidth="1" />

            <rect x="1308" y="342" width="16" height="22" rx="2" fill="url(#window-glow)" />
            <line x1="1316" y1="342" x2="1316" y2="364" stroke="#451a03" strokeWidth="1" />
            <line x1="1308" y1="353" x2="1324" y2="353" stroke="#451a03" strokeWidth="1" />
          </g>

          {/* Right Wing - Ground Floor */}
          <g>
            <rect x="1282" y="385" width="16" height="24" rx="2" fill="url(#window-glow)" />
            <line x1="1290" y1="385" x2="1290" y2="409" stroke="#451a03" strokeWidth="1" />
            <line x1="1282" y1="397" x2="1298" y2="397" stroke="#451a03" strokeWidth="1" />

            <rect x="1308" y="385" width="16" height="24" rx="2" fill="url(#window-glow)" />
            <line x1="1316" y1="385" x2="1316" y2="409" stroke="#451a03" strokeWidth="1" />
            <line x1="1308" y1="397" x2="1324" y2="397" stroke="#451a03" strokeWidth="1" />
          </g>
        </g>
      </svg>
    </div>
  );
}
