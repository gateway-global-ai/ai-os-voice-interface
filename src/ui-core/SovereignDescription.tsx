import { ReactNode } from 'react';
import { BRAND } from '../config/brand';

interface SovereignDescriptionProps {
  children: ReactNode;
  className?: string;
  variant?: 'muted' | 'accent';
}

export function SovereignDescription({ children, className = '', variant = 'muted' }: SovereignDescriptionProps) {
  const colorClass = variant === 'accent' ? BRAND.colors.text.accent : BRAND.colors.text.muted;
  return (
    <p className={`text-sm md:text-base ${colorClass} ${className}`}>
      {children}
    </p>
  );
}
