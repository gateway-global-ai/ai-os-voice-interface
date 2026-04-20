import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  BookOpen,
  Building2,
  ChevronRight,
  Eye,
  HardDrive,
  Mic,
  Palette,
  Radio,
  Settings,
  User,
  UserRound,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  isValidShellMenuRecord,
  type ShellMenuDetailSurfaceDefinition,
  type ShellMenuIcon,
  type ShellMenuRecord,
} from '../../shell/shellMenuContract';

type Props = {
  record: ShellMenuRecord;
  onSelect: (actionId: string) => void;
  className?: string;
  variant?: 'popover' | 'shell-layer';
  activeLevelId?: string;
  onActiveLevelChange?: (levelId: string) => void;
  selectedActionId?: string;
  onClearSelectedAction?: () => void;
  onBackMenu?: () => void;
  renderDetailSurface?: (
    surface: ShellMenuDetailSurfaceDefinition,
    selectedActionId: string,
  ) => ReactNode;
};

function menuIcon(icon: ShellMenuIcon | undefined) {
  switch (icon) {
    case 'workspace':
      return Building2;
    case 'storage':
      return HardDrive;
    case 'voice':
      return Mic;
    case 'appearance':
      return Palette;
    case 'podcasts':
      return Radio;
    case 'knowledge':
      return BookOpen;
    case 'transparency':
      return Eye;
    case 'profile':
      return UserRound;
    case 'diagnostics':
      return Activity;
    case 'disc':
      return User;
    case 'system':
    default:
      return Settings;
  }
}

function itemClass(templateFamily: ShellMenuRecord['template_family']) {
  if (templateFamily === 'thumbnail') {
    return 'min-h-[5.5rem] rounded-2xl p-3';
  }
  return 'rounded-xl px-3 py-2.5';
}

type MenuItemButtonProps = {
  label: string;
  description?: string;
  badge?: string;
  icon?: ShellMenuIcon;
  disabled?: boolean;
  onClick: () => void;
  templateFamily: ShellMenuRecord['template_family'];
  active?: boolean;
  trailing?: 'chevron';
};

function MenuItemButton({
  label,
  description,
  badge,
  icon,
  disabled,
  onClick,
  templateFamily,
  active = false,
  trailing,
}: MenuItemButtonProps) {
  const Icon = menuIcon(icon);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50',
        itemClass(templateFamily),
      )}
      style={{
        background: active ? 'var(--panel-bg-hover)' : 'var(--panel-surface)',
        border: `1px solid ${active ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: active ? 'var(--panel-accent-bg)' : 'var(--panel-bg)',
            border: `1px solid ${active ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
            color: active ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)',
          }}
        >
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="block text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
              {label}
            </span>
            {badge ? (
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
              >
                {badge}
              </span>
            ) : null}
          </span>
          {description ? (
            <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
              {description}
            </span>
          ) : null}
        </span>
        {trailing === 'chevron' ? (
          <span className="mt-1 shrink-0" style={{ color: active ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)' }}>
            <ChevronRight size={15} />
          </span>
        ) : null}
      </div>
    </button>
  );
}

function menuZoneLabel(record: ShellMenuRecord) {
  switch (record.menu_zone) {
    case 'header_system':
      return 'System shell menu';
    case 'footer_user':
      return 'User surface menu';
    case 'voice_control':
      return 'Voice control menu';
    case 'voice_box':
      return 'Voice Box menu';
    case 'appearance':
      return 'Appearance menu';
    case 'agent_identity':
      return 'Agent identity menu';
    default:
      return 'Shell menu';
  }
}

export function ShellMenuController({
  record,
  onSelect,
  className,
  variant = 'popover',
  activeLevelId: controlledActiveLevelId,
  onActiveLevelChange,
  selectedActionId,
  onClearSelectedAction,
  onBackMenu,
  renderDetailSurface,
}: Props) {
  if (!isValidShellMenuRecord(record)) {
    return null;
  }

  const [internalActiveLevelId, setInternalActiveLevelId] = useState(record.levels[0]?.level_id ?? '');

  useEffect(() => {
    if (controlledActiveLevelId) {
      return;
    }
    setInternalActiveLevelId(record.levels[0]?.level_id ?? '');
  }, [controlledActiveLevelId, record]);

  const activeLevelId = controlledActiveLevelId ?? internalActiveLevelId;
  const setActiveLevelId = (levelId: string) => {
    onActiveLevelChange?.(levelId);
    if (!controlledActiveLevelId) {
      setInternalActiveLevelId(levelId);
    }
  };

  const activeLevel = record.levels.find((level) => level.level_id === activeLevelId) ?? record.levels[0];
  const selectedDetailItem = activeLevel?.items.find(
    (item) => item.action_id === selectedActionId && item.detail_surface,
  );
  const selectedDetailSurface = selectedDetailItem?.detail_surface
    ? record.detail_surfaces?.find((surface) => surface.surface_id === selectedDetailItem.detail_surface)
    : undefined;
  const detailSurfaceNode =
    selectedDetailSurface && selectedActionId && renderDetailSurface
      ? renderDetailSurface(selectedDetailSurface, selectedActionId)
      : null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl',
        variant === 'shell-layer' && 'flex h-full min-h-0 flex-col rounded-none border-x-0 border-b-0',
        className,
      )}
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        boxShadow: '0 24px 80px rgba(2,6,23,0.45)',
      }}
      data-menu-id={record.menu_id}
      data-menu-zone={record.menu_zone}
      data-template-family={record.template_family}
    >
      <div className="border-b px-4 py-3 flex justify-between items-center" style={{ borderColor: 'var(--panel-border)' }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--panel-text-muted)' }}>
            {menuZoneLabel(record)}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--panel-text-muted)' }}>
            Source: {record.data_source_ref}
          </p>
        </div>
        {onBackMenu && (
          <button onClick={onBackMenu} style={{ background: 'transparent', border: 'none', color: 'var(--panel-text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>
            &larr; Back
          </button>
        )}
      </div>

      {variant === 'shell-layer' ? (
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div
            className="flex min-h-0 flex-col gap-3 border-b p-4 lg:border-b-0 lg:border-r"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
              Level 1
            </p>
            <div className="space-y-2 overflow-y-auto">
              {record.levels.map((level) => (
                <div key={level.level_id}>
                  <MenuItemButton
                    label={level.level_label}
                    description={`${level.items.length} routed items`}
                    templateFamily="list"
                    active={level.level_id === activeLevel?.level_id}
                    trailing="chevron"
                    onClick={() => setActiveLevelId(level.level_id)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-col p-4">
            {activeLevel ? (
              <>
                <div className="shrink-0 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                    Level 2
                  </p>
                  <h3 className="mt-2 text-lg font-semibold" style={{ color: 'var(--panel-heading)' }}>
                    {selectedDetailSurface?.title ?? activeLevel.level_label}
                  </h3>
                  {selectedDetailSurface?.description ? (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                      {selectedDetailSurface.description}
                    </p>
                  ) : null}
                  {detailSurfaceNode && onClearSelectedAction ? (
                    <button
                      type="button"
                      onClick={onClearSelectedAction}
                      className="mt-3 inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
                      style={{
                        background: 'var(--panel-surface)',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--panel-text)',
                      }}
                    >
                      Back to routed items
                    </button>
                  ) : null}
                </div>
                {detailSurfaceNode ? (
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">{detailSurfaceNode}</div>
                ) : (
                  <div
                    className={cn(
                      'min-h-0 flex-1 overflow-y-auto pr-1',
                      record.template_family === 'thumbnail' ? 'grid auto-rows-min grid-cols-1 gap-3 md:grid-cols-2' : 'space-y-3',
                    )}
                  >
                    {activeLevel.items.map((item) => (
                      <div key={item.item_id}>
                        <MenuItemButton
                          label={item.label}
                          description={item.description}
                          badge={item.badge}
                          icon={item.icon}
                          disabled={item.disabled}
                          onClick={() => onSelect(item.action_id)}
                          templateFamily={record.template_family}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {record.levels.map((level) => (
            <section key={level.level_id} className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                {level.level_label}
              </p>
              <div className={cn(record.template_family === 'thumbnail' ? 'grid grid-cols-2 gap-2' : 'space-y-2')}>
                {level.items.map((item) => (
                  <div key={item.item_id}>
                    <MenuItemButton
                      label={item.label}
                      description={item.description}
                      badge={item.badge}
                      icon={item.icon}
                      disabled={item.disabled}
                      onClick={() => onSelect(item.action_id)}
                      templateFamily={record.template_family}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
