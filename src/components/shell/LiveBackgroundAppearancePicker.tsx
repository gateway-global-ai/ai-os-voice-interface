/**
 * Catalog picker for governed canvas (shadcn.io) live backgrounds — used from Appearance menu.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  SHADCN_BACKGROUND_CATEGORIES,
  SHADCN_BACKGROUND_ITEMS,
} from '../background/shadcnBackgroundCatalog';

type Props = {
  activeId: string;
  onPick: (id: string) => void;
};

export function LiveBackgroundAppearancePicker({ activeId, onPick }: Props) {
  return (
    <div className="mt-4 flex max-h-[min(56vh,28rem)] flex-col gap-5 overflow-y-auto pr-1">
      {SHADCN_BACKGROUND_CATEGORIES.map((cat) => {
        const items = SHADCN_BACKGROUND_ITEMS.filter((i) => i.categoryId === cat.id);
        if (items.length === 0) return null;
        return (
          <section key={cat.id}>
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--panel-heading)' }}>
              {cat.title}
            </h3>
            <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--panel-text-muted)' }}>
              {cat.blurb}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {items.map((item) => {
                const active = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPick(item.id)}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                    style={{
                      background: active ? 'var(--panel-accent-bg)' : 'var(--panel-surface)',
                      border: `1px solid ${active ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
                      color: active ? 'var(--panel-accent-text)' : 'var(--panel-text)',
                    }}
                  >
                    <span className="font-semibold" style={{ color: active ? 'var(--panel-accent-text)' : 'var(--panel-heading)' }}>
                      {item.label}
                    </span>
                    <span
                      className="mt-0.5 block text-xs leading-snug"
                      style={{ color: active ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)' }}
                    >
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
