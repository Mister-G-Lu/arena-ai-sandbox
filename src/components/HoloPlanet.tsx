export function HoloPlanet() {
  return (
    <svg viewBox="0 0 640 340" role="img" aria-label="Holographic projection of Meridian">
      <defs>
        <radialGradient id="void" cx="50%" cy="42%" r="70%">
          <stop offset="0" stopColor="#0c1230" />
          <stop offset="1" stopColor="#05060f" />
        </radialGradient>
        <radialGradient id="planet" cx="38%" cy="34%" r="62%">
          <stop offset="0" stopColor="#3a1a6a" />
          <stop offset="45%" stopColor="#1a2a78" />
          <stop offset="100%" stopColor="#06101c" />
        </radialGradient>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff2bd6" stopOpacity="0" />
          <stop offset="0.25" stopColor="#ff2bd6" />
          <stop offset="0.5" stopColor="#00f0ff" />
          <stop offset="0.75" stopColor="#9b5cff" />
          <stop offset="1" stopColor="#00f0ff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="disc">
          <circle cx="320" cy="168" r="92" />
        </clipPath>
      </defs>
      <rect width="640" height="340" fill="url(#void)" />
      <g fill="#8adfff" opacity="0.7">
        <circle cx="60" cy="42" r="1.2" />
        <circle cx="130" cy="80" r="0.9" />
        <circle cx="205" cy="30" r="1.1" />
        <circle cx="480" cy="48" r="0.9" />
        <circle cx="555" cy="38" r="1.1" />
        <circle cx="620" cy="90" r="0.8" />
        <circle cx="95" cy="120" r="0.8" />
        <circle cx="580" cy="140" r="0.9" />
      </g>
      <ellipse cx="320" cy="168" rx="168" ry="36" fill="none" stroke="url(#ring)" strokeWidth="2" opacity="0.55" />
      <circle cx="320" cy="168" r="92" fill="url(#planet)" stroke="#00f0ff" strokeWidth="1.2" opacity="0.98" />
      <g clipPath="url(#disc)" className="planet-spin">
        <ellipse cx="320" cy="168" rx="40" ry="92" fill="none" stroke="#00f0ff" strokeWidth="0.7" opacity="0.35" />
        <ellipse cx="320" cy="168" rx="70" ry="92" fill="none" stroke="#9b5cff" strokeWidth="0.6" opacity="0.3" />
        <path d="M228 168 Q320 148 412 168 Q320 188 228 168" fill="none" stroke="#00f0ff" strokeWidth="0.8" opacity="0.45" />
        <path d="M232 130 Q320 110 408 130" fill="none" stroke="#ff2bd6" strokeWidth="0.6" opacity="0.4" />
        <path d="M236 210 Q320 228 404 210" fill="none" stroke="#00f0ff" strokeWidth="0.6" opacity="0.35" />
        <circle cx="286" cy="150" r="10" fill="#00f0ff" opacity="0.12" />
        <circle cx="354" cy="188" r="16" fill="#ff2bd6" opacity="0.1" />
      </g>
      <circle cx="320" cy="168" r="92" fill="none" stroke="#00f0ff" strokeWidth="0.6" opacity="0.5" />
      <ellipse cx="320" cy="176" rx="176" ry="40" fill="none" stroke="url(#ring)" strokeWidth="2.4" />
      <circle className="blink-red" cx="402" cy="118" r="3" fill="#ff4d6d" />
      <g stroke="#00f0ff" strokeWidth="1" opacity="0.5" fill="none">
        <path d="M40 40 h24" />
        <path d="M40 40 v24" />
        <path d="M600 40 h-24" />
        <path d="M600 40 v24" />
        <path d="M40 300 h24" />
        <path d="M40 300 v-24" />
        <path d="M600 300 h-24" />
        <path d="M600 300 v-24" />
      </g>
    </svg>
  );
}
