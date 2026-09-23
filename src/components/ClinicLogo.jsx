export default function ClinicLogo({
  size = 40,
  iconOnly = false,
  className = '',
  subtitle = 'Clinic Administration',
  collapsed = false,
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Premium Emerald Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_4px_12px_rgba(16,185,129,0.28)] transition-transform hover:scale-105"
      >
        <defs>
          <linearGradient id="emblemBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#073b37" />
            <stop offset="50%" stopColor="#0b4f49" />
            <stop offset="100%" stopColor="#042623" />
          </linearGradient>

          <linearGradient id="emblemGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient id="emblemGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="emblemCross" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e6fffa" />
          </linearGradient>

          <filter id="emblemShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#10b981" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Base Squircle */}
        <rect x="24" y="24" width="464" height="464" rx="116" fill="url(#emblemBg)" />
        <rect x="24" y="24" width="464" height="464" rx="116" stroke="url(#emblemGlow)" strokeWidth="6" strokeOpacity="0.6" />
        <rect x="36" y="36" width="440" height="440" rx="104" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />

        {/* Protective Care Shield Arc */}
        <path
          d="M256 128 C204 84, 116 112, 116 198 C116 276, 194 346, 256 394 C318 346, 396 276, 396 198 C396 112, 308 84, 256 128 Z"
          fill="none"
          stroke="url(#emblemGlow)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.35"
        />

        {/* Medical Cross */}
        <g filter="url(#emblemShadow)">
          <rect x="220" y="142" width="72" height="228" rx="20" fill="url(#emblemCross)" />
          <rect x="142" y="220" width="228" height="72" rx="20" fill="url(#emblemCross)" />
        </g>

        {/* Vitality Lifeline Pulse */}
        <path
          d="M152 256 L196 256 L220 206 L244 306 L272 234 L292 270 L312 256 L360 256"
          fill="none"
          stroke="#0b4f49"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M152 256 L196 256 L220 206 L244 306 L272 234 L292 270 L312 256 L360 256"
          fill="none"
          stroke="url(#emblemGlow)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Luxury Gold Sparkle Accent */}
        <path
          d="M370 134 Q382 146 394 146 Q382 146 370 158 Q358 146 346 146 Q358 146 370 134 Z"
          fill="url(#emblemGold)"
        />
        <circle cx="370" cy="146" r="3.2" fill="#fffbeb" />
      </svg>

      {/* Typography */}
      {!iconOnly && (
        <div className={collapsed ? 'desktop:hidden' : ''}>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[17px] font-black tracking-tight text-white">TMC</span>
            <span className="text-[17px] font-extrabold tracking-tight text-[#34d399]">CareLink</span>
          </div>
          {subtitle && (
            <span className="mt-1 block text-[11px] font-medium tracking-wide text-[#9bd1c8]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
