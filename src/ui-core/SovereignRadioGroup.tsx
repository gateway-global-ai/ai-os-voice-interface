import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BRAND } from '../config/brand';

export interface SovereignRadioOption {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
}

interface SovereignRadioGroupProps {
  options: SovereignRadioOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  columns?: 1 | 2 | 3;
}

export function SovereignRadioGroup({
  options,
  value,
  onChange,
  className = '',
  columns = 2,
}: SovereignRadioGroupProps) {
  const getGridCols = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  return (
    <div className={`grid w-full ${getGridCols()} ${BRAND.spacing.gapMedium} ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const activeClasses = isSelected
          ? `${BRAND.colors.primary} ${BRAND.colors.primaryBorder}`
          : `${BRAND.colors.surface} ${BRAND.colors.surfaceHover} border-white/10`;

        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            whileHover={BRAND.animation.motionHover}
            whileTap={BRAND.animation.motionTap}
            className={`flex flex-col items-center justify-center ${BRAND.spacing.gapSmall} p-6 border ${BRAND.sizing.borderRadius} ${activeClasses} transition-all cursor-pointer text-center backdrop-blur-md`}
          >
            {option.icon && (
              <div className={`mb-2 ${isSelected ? 'text-cyan-100' : BRAND.colors.text.accent}`}>
                {option.icon}
              </div>
            )}
            <span className={`text-lg font-semibold ${isSelected ? 'text-white' : BRAND.colors.text.heading}`}>
              {option.label}
            </span>
            {option.description && (
              <span className={`text-xs ${isSelected ? 'text-cyan-100/80' : BRAND.colors.text.muted}`}>
                {option.description}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
