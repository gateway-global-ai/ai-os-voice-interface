import { ReactNode } from 'react';
import { BRAND } from '../config/brand';

interface SovereignGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function SovereignGrid({ children, className = '', columns = 3 }: SovereignGridProps) {
  const getGridCols = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className={`grid w-full ${getGridCols()} ${BRAND.spacing.gapMedium} md:${BRAND.spacing.gapLarge} ${className}`}>
      {children}
    </div>
  );
}
