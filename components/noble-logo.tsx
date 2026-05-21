/*
 * Placeholder mark in the spirit of the Noble Plastics shield identity:
 * a red shield with a gold left-facing lion silhouette and the wordmark.
 * Replace with the official approved SVG from the Noble Plastics Logo
 * Package before any external use.
 */
export function NobleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 64"
      className={className}
      role="img"
      aria-label="Noble Plastics"
    >
      <defs>
        <clipPath id="shield-clip">
          <path d="M8 6 H56 V32 C56 46 32 58 32 58 C32 58 8 46 8 32 Z" />
        </clipPath>
      </defs>
      {/* Shield */}
      <path
        d="M8 6 H56 V32 C56 46 32 58 32 58 C32 58 8 46 8 32 Z"
        fill="#cf202f"
      />
      {/* Stylized lion (left-facing silhouette placeholder) */}
      <g clipPath="url(#shield-clip)" fill="#ffcf01">
        <path d="M44 22 C42 19 39 17 36 17 C33 17 31 19 30 21 L28 21 C25 21 23 23 23 25 L19 25 C17 25 15 27 15 29 L15 36 C15 39 17 41 20 41 L20 44 L23 44 L23 41 L29 41 L29 44 L32 44 L32 41 L36 41 C40 41 43 38 43 34 L43 31 L46 30 L46 26 C46 24 45 23 44 22 Z M37 25 C37 26 36 27 35 27 C34 27 33 26 33 25 C33 24 34 23 35 23 C36 23 37 24 37 25 Z" />
      </g>
      {/* Wordmark */}
      <text
        x="68"
        y="30"
        fill="#111921"
        fontFamily="var(--font-montserrat), sans-serif"
        fontWeight="800"
        fontSize="18"
        letterSpacing="1"
      >
        NOBLE
      </text>
      <text
        x="68"
        y="48"
        fill="#111921"
        fontFamily="var(--font-montserrat), sans-serif"
        fontWeight="500"
        fontSize="11"
        letterSpacing="3"
      >
        PLASTICS
      </text>
    </svg>
  );
}
