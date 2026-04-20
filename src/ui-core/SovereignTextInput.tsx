import { InputHTMLAttributes, forwardRef } from 'react';
import { BRAND } from '../config/brand';

export interface SovereignTextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  errorMessage?: string;
}

export const SovereignTextInput = forwardRef<HTMLInputElement, SovereignTextInputProps>(
  ({ errorMessage, className = '', disabled, ...props }, ref) => {
    const hasError = !!errorMessage;
    
    const baseClasses = `w-full ${BRAND.colors.surface} ${BRAND.colors.text.heading} placeholder-${BRAND.colors.text.muted.split('-')[1]}-500 ${BRAND.sizing.borderRadius} px-5 ${BRAND.sizing.inputHeight} transition-all backdrop-blur-md`;
    
    const focusClasses = hasError ? BRAND.colors.errorFocusRing : BRAND.colors.focusRing;
    const borderClasses = hasError ? BRAND.colors.errorBorder : BRAND.colors.surfaceHover;
    
    return (
      <div className="flex flex-col w-full gap-1">
        <input
          ref={ref}
          disabled={disabled}
          className={`${baseClasses} ${borderClasses} ${focusClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        />
        {hasError && (
          <span className={`text-sm ${BRAND.colors.text.heading.replace('white', 'red-400')} px-1`}>
            {errorMessage}
          </span>
        )}
      </div>
    );
  }
);

SovereignTextInput.displayName = 'SovereignTextInput';
