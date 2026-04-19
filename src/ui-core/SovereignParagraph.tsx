import { ReactNode } from 'react';
import { BRAND } from '../config/brand';

interface SovereignParagraphProps {
  children: ReactNode;
  className?: string;
}

export function SovereignParagraph({ children, className = '' }: SovereignParagraphProps) {
  return (
    <p className={`text-base leading-relaxed ${BRAND.colors.text.body} ${className}`}>
      {children}
    </p>
  );
}
