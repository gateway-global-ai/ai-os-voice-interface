import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BRAND } from '../config/brand';

interface SovereignCardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  /** Merged onto the root; use for dynamic backgrounds (e.g. opacity slider). */
  style?: CSSProperties;
  /** When true, skip default `backdrop-blur-xl` so callers can set `backdropFilter` via `style`. */
  omitDefaultBackdropBlur?: boolean;
  /** When true, skip default `shadow-lg` so callers can set `boxShadow` via `style`. */
  omitDefaultShadow?: boolean;
}

export function SovereignCard({
  children,
  className = '',
  animate = true,
  style,
  omitDefaultBackdropBlur = false,
  omitDefaultShadow = false,
}: SovereignCardProps) {
  const blur = omitDefaultBackdropBlur ? '' : 'backdrop-blur-xl';
  const shadow = omitDefaultShadow ? '' : 'shadow-lg';
  const baseClasses = `relative w-full overflow-hidden ${BRAND.colors.surface} ${BRAND.sizing.borderRadius} ${BRAND.spacing.cardPadding} ${shadow} ${blur} ${className}`;

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={baseClasses}
        style={style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses} style={style}>
      {children}
    </div>
  );
}
