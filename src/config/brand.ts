/**
 * Sovereign UI Brand Tokens
 * 
 * This file acts as the single source of truth for all spacing, sizing, and color
 * tokens used by the Sovereign UI artifacts (src/ui-core/*).
 * 
 * DO NOT hardcode hex values or arbitrary Tailwind spacing in governed components.
 */

export const BRAND = {
  colors: {
    primary: 'bg-cyan-500 text-cyan-50',
    primaryBorder: 'border-cyan-500/50',
    primaryHover: 'hover:bg-cyan-500/40',
    primaryActive: 'active:bg-cyan-500/60',
    
    secondary: 'bg-blue-500/20 text-blue-300',
    secondaryBorder: 'border-blue-500/40',
    secondaryHover: 'hover:bg-blue-500/30',
    
    success: 'bg-green-500/20 text-green-300',
    successBorder: 'border-green-500/40',

    error: 'bg-red-500/20 text-red-400',
    errorBorder: 'border-red-500/50',
    
    surface: 'bg-[rgb(2,6,23)] border border-white/10',
    surfaceHover: 'hover:bg-white/8',
    surfaceActive: 'bg-white/10',

    ghost: 'bg-transparent text-gray-300',
    ghostHover: 'hover:bg-white/5 hover:text-white',

    focusRing: 'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60',
    errorFocusRing: 'focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/60',
    
    text: {
      heading: 'text-white',
      body: 'text-gray-300',
      muted: 'text-gray-500',
      accent: 'text-cyan-400',
    }
  },
  spacing: {
    cardPadding: 'p-6 sm:p-8',
    gapSmall: 'gap-2',
    gapMedium: 'gap-4',
    gapLarge: 'gap-8',
  },
  sizing: {
    borderRadius: 'rounded-xl',
    inputHeight: 'py-4',
    buttonHeight: 'py-4',
  },
  animation: {
    hoverScale: 'transition-all hover:scale-105 active:scale-95',
    motionHover: { scale: 1.02 },
    motionTap: { scale: 0.98 },
  }
};
