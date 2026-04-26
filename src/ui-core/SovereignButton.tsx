import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { BRAND } from '../config/brand';

interface SovereignButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  intent?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export function SovereignButton({
  children,
  intent,
  variant,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: SovereignButtonProps) {
  const resolvedVariant = variant ?? intent ?? 'primary';

  const getVariantClasses = () => {
    switch (resolvedVariant) {
      case 'primary':
        return `${BRAND.colors.primary} ${BRAND.colors.primaryBorder} ${BRAND.colors.primaryHover} ${BRAND.colors.primaryActive} border`;
      case 'secondary':
        return `${BRAND.colors.secondary} ${BRAND.colors.secondaryBorder} ${BRAND.colors.secondaryHover} border`;
      case 'ghost':
        return `${BRAND.colors.ghost} ${BRAND.colors.ghostHover}`;
      default:
        return `${BRAND.colors.primary} ${BRAND.colors.primaryBorder} ${BRAND.colors.primaryHover} ${BRAND.colors.primaryActive} border`;
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileHover={!isDisabled ? BRAND.animation.motionHover : undefined}
      whileTap={!isDisabled ? BRAND.animation.motionTap : undefined}
      disabled={isDisabled}
      className={`relative flex items-center justify-center ${BRAND.spacing.gapSmall} ${BRAND.sizing.buttonHeight} px-6 font-semibold ${BRAND.sizing.borderRadius} ${getVariantClasses()} transition-colors ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      {...props}
      type={props.type ?? 'button'}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
}
