/**
 * shellMenuLoader.ts — Supabase-backed shell menu registry loader.
 *
 * This module provides an async loader that queries `shell_menus` + `shell_menu_items`
 * from Supabase and reconstructs the same `ShellMenuRegistryEntry` shape used by the
 * existing static registry. Components continue to use the same type contract.
 *
 * Usage (in a React component):
 *   const { registry, loading } = useShellMenuRegistry();
 *
 * Fallback: If Supabase is unavailable, falls back to the hardcoded
 * CENTRAL_SHELL_MENU_REGISTRY from shellMenuRegistry.ts.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../lib/tauriRuntime';
import { aiOsSupabase } from '../lib/supabaseClient';
import type { ShellMenuId, ShellMenuRecord } from './shellMenuContract';
import type { ShellMenuRegistryEntry } from './shellMenuStoreTypes';
import { CENTRAL_SHELL_MENU_REGISTRY } from './shellMenuRegistry';

const SHELL_MENU_INVALIDATED_EVENT = 'aios:shell-menu-registry-invalidated';

// ─── Row types from Supabase ──────────────────────────────────────────────────

interface MenuRow {
  menu_id: string;
  menu_zone: string | null;
  permission_class: string | null;
  parent_menu_id: string | null;
  launch_mode: string | null;
  desktop_sub_path: string | null;
  data_source_ref: string | null;
  launched_from_action_id: string | null;
}

interface MenuItemRow {
  item_id: string;
  menu_id: string;
  level: number;
  action_id: string;
  label: string;
  icon: string | null;
  auth_required: boolean;
  sort_order: number;
  metadata: Record<string, unknown> | null;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

function itemMetadata(item: MenuItemRow): Record<string, unknown> {
  return item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
}

function metadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function buildRegistry(
  menus: MenuRow[],
  items: MenuItemRow[],
): Record<ShellMenuId, ShellMenuRegistryEntry> {
  const itemsByMenu = new Map<string, MenuItemRow[]>();
  for (const item of items) {
    const list = itemsByMenu.get(item.menu_id) ?? [];
    list.push(item);
    itemsByMenu.set(item.menu_id, list);
  }

  const registry: Partial<Record<ShellMenuId, ShellMenuRegistryEntry>> = {};

  for (const menu of menus) {
    const menuItems = itemsByMenu.get(menu.menu_id) ?? [];
    menuItems.sort((a, b) => a.sort_order - b.sort_order);

    // Group items into levels
    const levelMap = new Map<number, MenuItemRow[]>();
    for (const item of menuItems) {
      const list = levelMap.get(item.level) ?? [];
      list.push(item);
      levelMap.set(item.level, list);
    }

    const levels = Array.from(levelMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([levelIdx, levelItems]) => {
        const firstMetadata = itemMetadata(levelItems[0]);
        return {
          level_id: metadataString(firstMetadata, 'level_id') ?? `${menu.menu_id}-level-${levelIdx}`,
          level_label: metadataString(firstMetadata, 'level_label') ?? `Menu Group ${levelIdx + 1}`,
          items: levelItems.map((i) => {
            const metadata = itemMetadata(i);
            return {
              ...metadata,
              item_id: metadataString(metadata, 'item_id') ?? i.item_id,
              label: i.label,
              action_id: i.action_id,
              icon: (i.icon ?? undefined) as ShellMenuRecord['levels'][number]['items'][number]['icon'],
            };
          }),
        };
      });

    const record: ShellMenuRecord = {
      menu_id: menu.menu_id as ShellMenuId,
      menu_zone: (menu.menu_zone ?? 'header_system') as ShellMenuRecord['menu_zone'],
      content_type: 'system',
      level_count: levels.length,
      levels,
      template_family: 'list',
      permission_class: (menu.permission_class ?? 'shell_system') as ShellMenuRecord['permission_class'],
      data_source_ref: menu.data_source_ref ?? `shell.menu.${menu.menu_id}.db`,
      selection_behavior: 'open_surface',
      disclosure_requirements: ['header_attached', 'shell_owned', 'deterministic_levels', 'intent_first'],
    };

    registry[menu.menu_id as ShellMenuId] = {
      menu_id: menu.menu_id as ShellMenuId,
      menu_zone: (menu.menu_zone ?? 'header_system') as ShellMenuRegistryEntry['menu_zone'],
      permission_class: (menu.permission_class ?? 'shell_system') as ShellMenuRegistryEntry['permission_class'],
      data_source_ref: menu.data_source_ref ?? `shell.menu.${menu.menu_id}.db`,
      record,
      parent_menu_id: (menu.parent_menu_id ?? null) as ShellMenuId | null,
      launched_from_action_id: menu.launched_from_action_id ?? null,
      launch_mode: (menu.launch_mode ?? 'replace_active') as ShellMenuRegistryEntry['launch_mode'],
    };
  }

  return registry as Record<ShellMenuId, ShellMenuRegistryEntry>;
}

// ─── Async loader ─────────────────────────────────────────────────────────────

let _cachedRegistry: Record<ShellMenuId, ShellMenuRegistryEntry> | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function loadShellMenuRegistry(): Promise<Record<ShellMenuId, ShellMenuRegistryEntry>> {
  // Return cached if fresh
  if (_cachedRegistry && Date.now() < _cacheExpiry) return _cachedRegistry;

  // Desktop source of truth: Rust owns the SQLite-migrated shell menu snapshot
  // through `resolve_intent_menu`. Supabase/static remains the browser fallback.
  if (isTauri) {
    try {
      const desktopRegistry = await invoke<Record<ShellMenuId, ShellMenuRegistryEntry>>('resolve_intent_menu');
      if (desktopRegistry && Object.keys(desktopRegistry).length > 0) {
        const merged = { ...CENTRAL_SHELL_MENU_REGISTRY, ...desktopRegistry };
        _cachedRegistry = merged;
        _cacheExpiry = Date.now() + CACHE_TTL_MS;
        return merged;
      }
    } catch (e) {
      console.warn('[shellMenuLoader] Rust menu snapshot unavailable, falling back:', e);
    }
  }

  if (!aiOsSupabase) return CENTRAL_SHELL_MENU_REGISTRY;

  try {
    const [menusRes, itemsRes] = await Promise.all([
      aiOsSupabase.from('shell_menus').select('*'),
      aiOsSupabase.from('shell_menu_items').select('*').order('sort_order'),
    ]);

    if (menusRes.error || itemsRes.error || !menusRes.data?.length) {
      console.warn('[shellMenuLoader] Supabase fetch failed or empty, using static registry');
      return CENTRAL_SHELL_MENU_REGISTRY;
    }

    const built = buildRegistry(
      menusRes.data as MenuRow[],
      (itemsRes.data ?? []) as MenuItemRow[],
    );

    // Merge with static registry: DB wins for known menus, static fills unknown ones
    const merged = { ...CENTRAL_SHELL_MENU_REGISTRY, ...built };
    _cachedRegistry = merged;
    _cacheExpiry = Date.now() + CACHE_TTL_MS;
    return merged;
  } catch (e) {
    console.warn('[shellMenuLoader] Supabase error, falling back to static registry:', e);
    return CENTRAL_SHELL_MENU_REGISTRY;
  }
}

/** Invalidate the in-memory cache (call after admin edits). */
export function invalidateShellMenuCache(notify = true): void {
  _cachedRegistry = null;
  _cacheExpiry = 0;
  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SHELL_MENU_INVALIDATED_EVENT));
  }
}

// ─── React hook ───────────────────────────────────────────────────────────────

export interface UseShellMenuRegistryResult {
  registry: Record<ShellMenuId, ShellMenuRegistryEntry>;
  loading: boolean;
  reload: () => void;
}

export function useShellMenuRegistry(): UseShellMenuRegistryResult {
  const [registry, setRegistry] = useState<Record<ShellMenuId, ShellMenuRegistryEntry>>(
    CENTRAL_SHELL_MENU_REGISTRY,
  );
  const [loading, setLoading] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadShellMenuRegistry()
      .then((reg) => { if (!cancelled) setRegistry(reg); })
      .catch(() => { /* fallback already returned */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [rev]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleInvalidated = () => {
      invalidateShellMenuCache(false);
      setRev((v) => v + 1);
    };
    window.addEventListener(SHELL_MENU_INVALIDATED_EVENT, handleInvalidated);
    return () => window.removeEventListener(SHELL_MENU_INVALIDATED_EVENT, handleInvalidated);
  }, []);

  return {
    registry,
    loading,
    reload: () => {
      invalidateShellMenuCache();
      setRev((v) => v + 1);
    },
  };
}
