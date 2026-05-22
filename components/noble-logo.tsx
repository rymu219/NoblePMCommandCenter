/*
 * Brand-faithful rendering of the Noble Plastics shield + lion + wordmark.
 * Based on the official Noble Plastics Brand Guidelines logo package
 * (vertical primary and horizontal variants). The lion is a stylized
 * heraldic left-facing profile.
 *
 * NOTE: This is a hand-crafted SVG approximation. The brand guide says
 * "DO NOT recreate" the logo, so when the official SVG/PNG files from the
 * Noble Plastics Logo Package land in /public/brand/, swap the body of
 * <NobleLogo /> for an <Image src="/brand/horizontal-black.svg" />.
 */

const SHIELD_RED = "#cf202f";
const LION_GOLD = "#ffcf01";
const NOBLE_BLACK = "#111921";

export function NobleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      role="img"
      aria-label="Noble Plastics"
    >
      <ShieldAndLion />
    </svg>
  );
}

export function NobleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 70"
      className={className}
      role="img"
      aria-label="Noble Plastics"
    >
      <g transform="translate(-2 -3) scale(0.62)">
        <ShieldAndLion />
      </g>
      <g fill={NOBLE_BLACK} fontFamily="var(--font-montserrat), sans-serif">
        <text
          x="78"
          y="40"
          fontWeight="900"
          fontSize="34"
          letterSpacing="-1.4"
        >
          NOBLE
        </text>
        <text
          x="80"
          y="60"
          fontWeight="800"
          fontSize="13"
          letterSpacing="5"
        >
          PLASTICS
        </text>
      </g>
    </svg>
  );
}

export function NobleLogoVertical({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 250"
      className={className}
      role="img"
      aria-label="Noble Plastics"
    >
      <g transform="translate(50 0)">
        <ShieldAndLion />
      </g>
      <g
        fill={NOBLE_BLACK}
        fontFamily="var(--font-montserrat), sans-serif"
        textAnchor="middle"
      >
        <text
          x="100"
          y="180"
          fontWeight="900"
          fontSize="46"
          letterSpacing="-1.8"
        >
          NOBLE
        </text>
        <text
          x="100"
          y="212"
          fontWeight="800"
          fontSize="18"
          letterSpacing="7"
        >
          PLASTICS
        </text>
      </g>
    </svg>
  );
}

/*
 * Shield + heraldic lion-head profile in gold on red. Coord box 100x120.
 * The lion is built from three layered shapes (mane, head, jaw) so the
 * silhouette reads as an animal head rather than a blob.
 */
function ShieldAndLion() {
  return (
    <g>
      {/* Shield (heraldic, flat top, rounded bottom) */}
      <path
        d="M5 5 H95 V60 C95 88 50 116 50 116 C50 116 5 88 5 60 Z"
        fill={SHIELD_RED}
      />

      {/* Mane — broad rounded mass spanning most of the shield interior */}
      <path
        fill={LION_GOLD}
        d="
          M 28 30
          C 22 30 17 35 17 42
          L 17 56
          C 17 64 21 71 27 75
          L 25 84
          C 25 88 28 90 32 89
          L 41 86
          L 47 92
          L 53 87
          L 62 92
          C 67 92 71 88 73 84
          L 75 76
          C 81 72 86 65 86 56
          L 86 38
          C 86 33 81 28 75 28
          L 70 24
          C 65 21 58 21 53 24
          L 50 26
          L 47 24
          C 42 21 35 21 30 24
          Z
        "
      />

      {/* Mane tufts on the bottom curve (a few notches to break the silhouette) */}
      <g fill={LION_GOLD}>
        <path d="M 22 78 C 24 84 28 87 32 86 C 30 82 27 80 22 78 Z" />
        <path d="M 78 78 C 76 84 72 87 68 86 C 70 82 73 80 78 78 Z" />
        <path d="M 45 90 C 48 95 52 95 55 90 C 52 92 48 92 45 90 Z" />
      </g>

      {/* Head — distinct lighter contour breaking out of the mane to the left */}
      <path
        fill={LION_GOLD}
        d="
          M 60 32
          C 53 32 47 36 44 41
          L 36 41
          C 32 41 29 44 29 48
          L 29 56
          C 29 60 32 63 36 64
          L 40 66
          C 44 67 48 67 52 65
          L 55 63
          C 60 63 64 60 66 56
          L 68 50
          L 68 42
          C 68 36 64 32 60 32
          Z
        "
      />

      {/* Eye */}
      <circle cx="48" cy="50" r="1.6" fill={SHIELD_RED} />
      {/* Brow ridge */}
      <path
        fill={SHIELD_RED}
        d="M 44 46 C 46 45 50 45 52 46 L 52 47 C 50 46 46 46 44 47 Z"
      />

      {/* Open mouth / muzzle */}
      <path
        fill={SHIELD_RED}
        d="
          M 36 56
          C 33 56 31 58 31 60
          C 31 62 33 64 36 64
          L 41 64
          C 43 64 44 63 44 61
          L 44 59
          C 44 57 43 56 41 56
          Z
        "
      />
      {/* Tongue */}
      <path
        fill={LION_GOLD}
        d="
          M 32 60
          C 31 61 31 62 32 63
          L 36 63
          C 37 62 37 61 36 60
          Z
        "
      />

      {/* Pointed ear top-right of head */}
      <path
        fill={LION_GOLD}
        d="M 64 30 L 70 24 L 71 32 Z"
      />

      {/* Nose bridge highlight */}
      <path
        fill={LION_GOLD}
        d="M 33 52 C 34 52 36 52 38 53 L 38 56 C 36 55 34 55 33 56 Z"
      />
    </g>
  );
}
