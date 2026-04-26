import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ShellMenuId } from './shellMenuContract';
import type { ShellMenuStoreState } from './shellMenuStoreTypes';

export function useShellMenuRuntime(
  shellMenuStore: ShellMenuStoreState,
  setShellMenuStore: Dispatch<SetStateAction<ShellMenuStoreState>>,
) {
  const openShellMenuById = useCallback((menuId: ShellMenuId) => {
    setShellMenuStore((prev) => {
      const entry = prev.registry_by_id[menuId];
      if (!entry) {
        return prev;
      }
      const nextLevelId =
        prev.ui.active_level_id_by_menu_id[menuId] ?? entry.record.levels[0]?.level_id ?? '';
      return {
        ...prev,
        ui: {
          ...prev.ui,
          active_menu_id: menuId,
          menu_stack:
            entry.parent_menu_id && entry.launch_mode === 'push_child'
              ? [...prev.ui.menu_stack.filter((id) => id !== menuId), menuId]
              : [menuId],
          is_open_by_menu_id: { [menuId]: true },
          active_level_id_by_menu_id: {
            ...prev.ui.active_level_id_by_menu_id,
            [menuId]: nextLevelId,
          },
        },
        revision: prev.revision + 1,
      };
    });
  }, [setShellMenuStore]);

  const closeShellMenus = useCallback(() => {
    setShellMenuStore((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        active_menu_id: null,
        menu_stack: [],
        is_open_by_menu_id: {},
      },
      recording:
        prev.recording.capture_status === 'recording'
          ? prev.recording
          : {
              ...prev.recording,
              capture_status: 'idle',
              ptt_binding_enabled: false,
            },
      revision: prev.revision + 1,
    }));
  }, [setShellMenuStore]);

  const setHeaderMenuOpen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const current = shellMenuStore.ui.is_open_by_menu_id['shell-header-system'] === true;
      const value = typeof next === 'function' ? next(current) : next;
      if (value) {
        openShellMenuById('shell-header-system');
        return;
      }
      closeShellMenus();
    },
    [closeShellMenus, openShellMenuById, shellMenuStore.ui.is_open_by_menu_id],
  );

  const setFooterMenuOpen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const current = shellMenuStore.ui.is_open_by_menu_id['shell-footer-user'] === true;
      const value = typeof next === 'function' ? next(current) : next;
      if (value) {
        openShellMenuById('shell-footer-user');
        return;
      }
      closeShellMenus();
    },
    [closeShellMenus, openShellMenuById, shellMenuStore.ui.is_open_by_menu_id],
  );

  const setShellMenuRecordingState = useCallback(
    (
      updater:
        | Partial<ShellMenuStoreState['recording']>
        | ((recording: ShellMenuStoreState['recording']) => ShellMenuStoreState['recording']),
    ) => {
      setShellMenuStore((prev) => ({
        ...prev,
        recording:
          typeof updater === 'function'
            ? updater(prev.recording)
            : { ...prev.recording, ...updater },
        revision: prev.revision + 1,
      }));
    },
    [setShellMenuStore],
  );

  const setShellMenuLevel = useCallback((menuId: ShellMenuId, levelId: string) => {
    setShellMenuStore((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        active_level_id_by_menu_id: {
          ...prev.ui.active_level_id_by_menu_id,
          [menuId]: levelId,
        },
        selected_action_id_by_menu_id: {
          ...prev.ui.selected_action_id_by_menu_id,
          [menuId]: undefined,
        },
      },
      revision: prev.revision + 1,
    }));
  }, [setShellMenuStore]);

  const clearShellMenuSelectedAction = useCallback((menuId: ShellMenuId) => {
    setShellMenuStore((prev) => {
      const nextSelectedActions = { ...prev.ui.selected_action_id_by_menu_id };
      delete nextSelectedActions[menuId];
      return {
        ...prev,
        ui: {
          ...prev.ui,
          selected_action_id_by_menu_id: nextSelectedActions,
        },
        recording:
          menuId === 'voice-box'
            ? {
                ...prev.recording,
                capture_status:
                  prev.recording.capture_status === 'recording' ? prev.recording.capture_status : 'idle',
                ptt_binding_enabled:
                  prev.recording.capture_status === 'recording' ? prev.recording.ptt_binding_enabled : false,
              }
            : prev.recording,
        revision: prev.revision + 1,
      };
    });
  }, [setShellMenuStore]);

  const markShellMenuActionSelected = useCallback((menuId: ShellMenuId | null, actionId: string) => {
    if (!menuId) {
      return;
    }
    setShellMenuStore((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        selected_action_id_by_menu_id: {
          ...prev.ui.selected_action_id_by_menu_id,
          [menuId]: actionId,
        },
      },
      revision: prev.revision + 1,
    }));
  }, [setShellMenuStore]);

  const headerMenuOpen = shellMenuStore.ui.is_open_by_menu_id['shell-header-system'] === true;
  const footerMenuOpen = shellMenuStore.ui.is_open_by_menu_id['shell-footer-user'] === true;
  const activeShellMenuId = shellMenuStore.ui.active_menu_id;
  const activeShellMenuEntry = activeShellMenuId
    ? shellMenuStore.registry_by_id[activeShellMenuId]
    : null;

  return {
    activeShellMenuEntry,
    activeShellMenuId,
    clearShellMenuSelectedAction,
    closeShellMenus,
    footerMenuOpen,
    headerMenuOpen,
    markShellMenuActionSelected,
    openShellMenuById,
    setFooterMenuOpen,
    setHeaderMenuOpen,
    setShellMenuLevel,
    setShellMenuRecordingState,
  };
}
