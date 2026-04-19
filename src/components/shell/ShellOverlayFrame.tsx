import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';

type ShellOverlayFrameProps = {
  overlayKey: string;
  onClose?: () => void;
  children: ReactNode;
  align?: 'center' | 'top';
  backdropClassName?: string;
  frameClassName?: string;
  reserveFooterSpace?: boolean;
  fullScreen?: boolean;
};

export const shellOverlayFrameStyle: CSSProperties = {
  width: 'min(var(--shell-overlay-width), calc(100vw - (var(--shell-overlay-padding) * 2)))',
  maxWidth: 'var(--shell-overlay-max-width)',
  minWidth: 'min(var(--shell-overlay-min-width), calc(100vw - (var(--shell-overlay-padding) * 2)))',
  boxSizing: 'border-box',
};

export function ShellOverlayFrame({
  overlayKey,
  onClose,
  children,
  align = 'center',
  backdropClassName,
  frameClassName,
  reserveFooterSpace = true,
  fullScreen = false,
}: ShellOverlayFrameProps) {
  return (
    <motion.div
      key={overlayKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-0 z-[var(--z-shell-chrome)] flex justify-center bg-black/40 backdrop-blur-md',
        align === 'top'
          ? 'items-start pt-[calc(var(--shell-header-height)+var(--shell-overlay-padding))]'
          : 'items-center',
        backdropClassName,
      )}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full',
          fullScreen
            ? 'h-[calc(100%-var(--shell-header-height)-var(--shell-footer-height))] mt-[var(--shell-header-height)] mb-[var(--shell-footer-height)]'
            : reserveFooterSpace && 'pb-[var(--shell-footer-height)]',
          frameClassName,
        )}
        style={
          fullScreen
            ? undefined
            : {
                ...shellOverlayFrameStyle,
                paddingLeft: 'var(--shell-overlay-padding)',
                paddingRight: 'var(--shell-overlay-padding)',
              }
        }
      >
        {children}
      </div>
    </motion.div>
  );
}
