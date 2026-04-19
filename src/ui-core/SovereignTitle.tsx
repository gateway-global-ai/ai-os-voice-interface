import { ReactNode } from 'react';
import { BRAND } from '../config/brand';

interface SovereignTitleProps {
  children: ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4;
}

export function SovereignTitle({ children, className = '', level = 2 }: SovereignTitleProps) {
  const baseClasses = `${BRAND.colors.text.heading} font-bold tracking-tight ${className}`;

  switch (level) {
    case 1:
      return <h1 className={`text-4xl md:text-5xl ${baseClasses}`}>{children}</h1>;
    case 2:
      return <h2 className={`text-2xl md:text-3xl ${baseClasses}`}>{children}</h2>;
    case 3:
      return <h3 className={`text-xl md:text-2xl ${baseClasses}`}>{children}</h3>;
    case 4:
      return <h4 className={`text-lg md:text-xl ${baseClasses}`}>{children}</h4>;
    default:
      return <h2 className={`text-2xl md:text-3xl ${baseClasses}`}>{children}</h2>;
  }
}
