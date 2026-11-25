import type { SVGProps } from 'react';

export type AuthIllustrationVariant =
  | 'campus'
  | 'admin'
  | 'teacher'
  | 'accountant'
  | 'student'
  | 'parent'
  | 'recovery';

export function AuthIllustration({
  variant,
  className,
}: {
  readonly variant: AuthIllustrationVariant;
  readonly className?: string;
}) {
  const common: SVGProps<SVGSVGElement> = {
    viewBox: '0 0 360 260',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
    'aria-hidden': true,
  };

  switch (variant) {
    case 'campus':
      return (
        <svg {...common}>
          {/* Soft backdrop halo */}
          <ellipse cx="180" cy="218" rx="136" ry="16" fill="#1e293b" opacity="0.65" />
          <circle cx="180" cy="116" r="88" fill="#4f46e5" opacity="0.14" />
          {/* Left & Right Wings */}
          <rect x="52" y="114" width="68" height="96" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <rect x="240" y="114" width="68" height="96" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          {/* Wing Windows */}
          <rect x="66" y="130" width="16" height="20" rx="4" fill="#38bdf8" opacity="0.35" />
          <rect x="90" y="130" width="16" height="20" rx="4" fill="#38bdf8" opacity="0.35" />
          <rect x="66" y="162" width="16" height="20" rx="4" fill="#818cf8" opacity="0.35" />
          <rect x="90" y="162" width="16" height="20" rx="4" fill="#818cf8" opacity="0.35" />
          <rect x="254" y="130" width="16" height="20" rx="4" fill="#38bdf8" opacity="0.35" />
          <rect x="278" y="130" width="16" height="20" rx="4" fill="#38bdf8" opacity="0.35" />
          <rect x="254" y="162" width="16" height="20" rx="4" fill="#818cf8" opacity="0.35" />
          <rect x="278" y="162" width="16" height="20" rx="4" fill="#818cf8" opacity="0.35" />
          {/* Main Center Building */}
          <rect x="114" y="80" width="132" height="130" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <path d="M104 82L180 42L256 82H104Z" fill="#4f46e5" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" />
          {/* Clock / Crest */}
          <circle cx="180" cy="68" r="10" fill="#eef2ff" />
          <path d="M180 63V68L183 70" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
          {/* Center Windows & Arch Door */}
          <rect x="134" y="102" width="22" height="24" rx="5" fill="#818cf8" opacity="0.45" />
          <rect x="169" y="102" width="22" height="24" rx="5" fill="#38bdf8" opacity="0.45" />
          <rect x="204" y="102" width="22" height="24" rx="5" fill="#818cf8" opacity="0.45" />
          <path d="M158 210V162C158 149.85 167.85 140 180 140C192.15 140 202 149.85 202 162V210H158Z" fill="#4f46e5" />
          <line x1="180" y1="140" x2="180" y2="210" stroke="#a5b4fc" strokeWidth="1.5" />
          {/* Floating Check Badge */}
          <rect x="242" y="48" width="66" height="32" rx="10" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <circle cx="258" cy="64" r="7" fill="#34d399" />
          <path d="M255 64L257.5 66.5L261.5 61.5" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="271" y="60" width="26" height="4" rx="2" fill="#cbd5e1" />
          <rect x="271" y="67" width="18" height="3" rx="1.5" fill="#64748b" />
        </svg>
      );

    case 'admin':
      return (
        <svg {...common}>
          {/* Desk & Backdrop */}
          <circle cx="180" cy="118" r="88" fill="#4f46e5" opacity="0.16" />
          <rect x="46" y="196" width="268" height="14" rx="7" fill="#334155" />
          <rect x="74" y="210" width="14" height="22" rx="4" fill="#1e293b" />
          <rect x="272" y="210" width="14" height="22" rx="4" fill="#1e293b" />
          {/* Administrator Figure */}
          <circle cx="152" cy="84" r="24" fill="#fde68a" />
          <path d="M128 80C128 65 140 56 154 56C168 56 176 66 176 80C168 74 156 72 142 74C135 75 130 78 128 80Z" fill="#1e293b" />
          <path d="M110 196C110 152 128 124 152 124C176 124 194 152 194 196H110Z" fill="#4f46e5" />
          <path d="M142 124L152 146L162 124" fill="#eef2ff" />
          {/* Laptop on Desk */}
          <rect x="166" y="138" width="94" height="54" rx="8" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
          <rect x="174" y="146" width="78" height="38" rx="4" fill="#1e293b" />
          <rect x="182" y="154" width="28" height="6" rx="3" fill="#818cf8" />
          <rect x="182" y="165" width="44" height="4" rx="2" fill="#475569" />
          <rect x="182" y="173" width="32" height="4" rx="2" fill="#38bdf8" />
          <path d="M154 192H272L264 196H162L154 192Z" fill="#94a3b8" />
          {/* Floating Governance Shield Card */}
          <rect x="224" y="54" width="84" height="52" rx="12" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <circle cx="246" cy="80" r="12" fill="#4f46e5" opacity="0.25" />
          <path d="M246 72L253 75V80C253 84.5 249.8 88 246 89.2C242.2 88 239 84.5 239 80V75L246 72Z" fill="#818cf8" />
          <rect x="264" y="72" width="32" height="5" rx="2.5" fill="#f8fafc" />
          <rect x="264" y="82" width="22" height="4" rx="2" fill="#94a3b8" />
        </svg>
      );

    case 'teacher':
      return (
        <svg {...common}>
          <circle cx="180" cy="118" r="88" fill="#38bdf8" opacity="0.14" />
          {/* Classroom Chalkboard */}
          <rect x="64" y="50" width="232" height="126" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="3" />
          <rect x="76" y="62" width="208" height="102" rx="6" fill="#1e293b" />
          {/* Board Diagram */}
          <rect x="92" y="78" width="64" height="7" rx="3.5" fill="#38bdf8" />
          <rect x="92" y="94" width="92" height="5" rx="2.5" fill="#64748b" />
          <rect x="92" y="106" width="74" height="5" rx="2.5" fill="#64748b" />
          <circle cx="234" cy="108" r="24" stroke="#818cf8" strokeWidth="4" strokeDasharray="100 40" />
          <path d="M234 94V108L244 114" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          {/* Stacked Books & Apple */}
          <rect x="78" y="182" width="84" height="16" rx="5" fill="#4f46e5" />
          <rect x="86" y="198" width="92" height="16" rx="5" fill="#0284c7" />
          <rect x="94" y="186" width="38" height="4" rx="2" fill="#c7d2fe" />
          <rect x="104" y="202" width="44" height="4" rx="2" fill="#bae6fd" />
          {/* Floating Book Badge */}
          <rect x="206" y="168" width="82" height="46" rx="12" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <path d="M222 183H234C236.2 183 238 184.8 238 187V201C238 199.5 236.2 198.5 234 198.5H222V183Z" fill="#38bdf8" opacity="0.85" />
          <path d="M254 183H242C239.8 183 238 184.8 238 187V201C238 199.5 239.8 198.5 242 198.5H254V183Z" fill="#818cf8" opacity="0.85" />
          <rect x="262" y="186" width="16" height="4" rx="2" fill="#f8fafc" />
          <rect x="262" y="194" width="12" height="4" rx="2" fill="#94a3b8" />
        </svg>
      );

    case 'accountant':
      return (
        <svg {...common}>
          <circle cx="180" cy="118" r="88" fill="#fbbf24" opacity="0.12" />
          {/* Desk */}
          <rect x="46" y="200" width="268" height="12" rx="6" fill="#334155" />
          {/* Financial Document Card */}
          <rect x="72" y="64" width="112" height="136" rx="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <rect x="90" y="84" width="44" height="7" rx="3.5" fill="#fbbf24" />
          <rect x="90" y="102" width="74" height="5" rx="2.5" fill="#64748b" />
          <rect x="90" y="114" width="58" height="5" rx="2.5" fill="#64748b" />
          {/* Bar Chart inside Document */}
          <rect x="92" y="156" width="14" height="24" rx="3" fill="#4f46e5" />
          <rect x="114" y="142" width="14" height="38" rx="3" fill="#38bdf8" />
          <rect x="136" y="132" width="14" height="48" rx="3" fill="#34d399" />
          <rect x="158" y="148" width="14" height="32" rx="3" fill="#fbbf24" />
          {/* Laptop */}
          <rect x="172" y="128" width="112" height="66" rx="9" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
          <rect x="180" y="136" width="96" height="50" rx="5" fill="#1e293b" />
          <circle cx="204" cy="160" r="14" fill="#fbbf24" opacity="0.2" />
          <path d="M204 152V168M200 156H207C208.7 156 210 157.3 210 159C210 160.7 208.7 162 207 162H201C199.3 162 198 163.3 198 165C198 166.7 199.3 168 201 168H208" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <rect x="226" y="152" width="38" height="5" rx="2.5" fill="#f8fafc" />
          <rect x="226" y="163" width="28" height="4" rx="2" fill="#94a3b8" />
          <path d="M162 194H294L286 200H170L162 194Z" fill="#94a3b8" />
        </svg>
      );

    case 'student':
      return (
        <svg {...common}>
          <circle cx="180" cy="118" r="88" fill="#60a5fa" opacity="0.15" />
          {/* Study Desk */}
          <rect x="46" y="198" width="268" height="12" rx="6" fill="#334155" />
          {/* Books Stack */}
          <rect x="64" y="166" width="74" height="15" rx="4" fill="#4f46e5" />
          <rect x="58" y="181" width="84" height="17" rx="4" fill="#2563eb" />
          <rect x="74" y="171" width="32" height="4" rx="2" fill="#c7d2fe" />
          <rect x="70" y="187" width="42" height="4" rx="2" fill="#bfdbfe" />
          {/* Student Laptop */}
          <rect x="136" y="114" width="132" height="78" rx="10" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
          <rect x="145" y="123" width="114" height="60" rx="5" fill="#1e293b" />
          {/* Graduation Cap on Screen */}
          <path d="M202 135L224 145L202 155L180 145L202 135Z" fill="#60a5fa" />
          <path d="M189 150V161C189 164 195 167 202 167C209 167 215 164 215 161V150" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
          <path d="M126 192H278L270 198H134L126 192Z" fill="#94a3b8" />
          {/* Floating Assignment Pill */}
          <rect x="218" y="54" width="88" height="44" rx="12" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <circle cx="238" cy="76" r="9" fill="#34d399" />
          <path d="M234.5 76L237 78.5L242 73.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="254" y="70" width="38" height="5" rx="2.5" fill="#f8fafc" />
          <rect x="254" y="79" width="26" height="4" rx="2" fill="#94a3b8" />
        </svg>
      );

    case 'parent':
      return (
        <svg {...common}>
          <circle cx="180" cy="118" r="88" fill="#34d399" opacity="0.14" />
          {/* Parent & Child Support Card */}
          <rect x="74" y="64" width="212" height="142" rx="16" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          {/* Parent Figure */}
          <circle cx="136" cy="114" r="18" fill="#fde68a" />
          <path d="M118 110C118 98 128 91 138 91C148 91 154 99 154 110C147 105 135 104 118 110Z" fill="#0f172a" />
          <path d="M106 184C106 156 118 140 136 140C154 140 166 156 166 184H106Z" fill="#059669" />
          {/* Student / Child Figure */}
          <circle cx="184" cy="132" r="14" fill="#fed7aa" />
          <path d="M162 184C162 162 171 150 184 150C197 150 206 162 206 184H162Z" fill="#4f46e5" />
          {/* Progress Mini-Widgets */}
          <rect x="218" y="92" width="50" height="36" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
          <path d="M230 112L236 105L242 110L254 99" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="218" y="138" width="50" height="36" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
          <rect x="228" y="150" width="30" height="4" rx="2" fill="#34d399" />
          <rect x="228" y="159" width="20" height="4" rx="2" fill="#64748b" />
        </svg>
      );

    case 'recovery':
    default:
      return (
        <svg {...common}>
          <circle cx="180" cy="124" r="88" fill="#a78bfa" opacity="0.15" />
          {/* Security Shield */}
          <path
            d="M180 54L246 80V128C246 168 218 196 180 210C142 196 114 168 114 128V80L180 54Z"
            fill="#1e293b"
            stroke="#818cf8"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M180 70L230 90V128C230 158 209 181 180 193C151 181 130 158 130 128V90L180 70Z"
            fill="#0f172a"
          />
          {/* Padlock inside Shield */}
          <rect x="158" y="122" width="44" height="34" rx="8" fill="#4f46e5" />
          <path
            d="M167 122V112C167 104.8 172.8 99 180 99C187.2 99 193 104.8 193 112V122"
            stroke="#c7d2fe"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="180" cy="138" r="4" fill="#ffffff" />
          {/* Verified Badge */}
          <circle cx="242" cy="76" r="16" fill="#34d399" />
          <path d="M236 76L240 80L248 72" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
