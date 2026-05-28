import Image from 'next/image';

/**
 * SU24 Markenzeichen — wiederverwendbar in Sidebar, Login, PDF-Cover etc.
 *
 * Varianten:
 *   variant="mark"     → nur das Bildlogo (Würfel mit S) — quadratisch
 *   variant="wordmark" → Bild + Schriftzug „SICHERHEITSUNTERWEISUNG24.DE"
 *                        — querformat, eher breit
 *
 * Größen (px Höhe):
 *   sm = 32   (Sidebar, Buttons)
 *   md = 48   (Login-Header, Cards)
 *   lg = 80   (Hero / Onboarding-Start)
 *   xl = 120  (PDF-Cover)
 *
 * Aspect-Ratios sind fest definiert, sodass das Logo bei keiner Größe
 * verzerren kann. Bei wordmark wird die Breite proportional aus der Höhe
 * berechnet (Original: 1920×1080 → ratio 16:9).
 */

const SIZES = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120
} as const;

const RATIOS = {
  mark:     1,            // 2000×2000
  wordmark: 1920 / 1080   // ≈ 1.778
} as const;

export type BrandMarkProps = {
  variant?: 'mark' | 'wordmark';
  size?: keyof typeof SIZES;
  /** Override der Höhe in px, ignoriert `size` */
  height?: number;
  /** Alt-Text — Default ist semantisch sinnvoll */
  alt?: string;
  /** Optional className für Layout-Wrapper */
  className?: string;
  /** Priorität für LCP-relevante Logos (Login, Cover) */
  priority?: boolean;
};

export function BrandMark({
  variant = 'mark',
  size = 'md',
  height,
  alt,
  className,
  priority = false
}: BrandMarkProps) {
  const h = height ?? SIZES[size];
  const w = Math.round(h * RATIOS[variant]);
  const src = variant === 'mark' ? '/brand/mark.png' : '/brand/wordmark.png';
  const altDefault = variant === 'mark'
    ? 'sicherheitsunterweisung24.de — Markenzeichen'
    : 'sicherheitsunterweisung24.de';

  return (
    <Image
      src={src}
      alt={alt ?? altDefault}
      width={w}
      height={h}
      priority={priority}
      className={className}
      style={{
        height: h,
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain'
      }}
    />
  );
}
