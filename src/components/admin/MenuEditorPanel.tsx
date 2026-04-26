/**
 * Menu Editor Panel — CRUD for shell_menus + shell_menu_items.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { invalidateShellMenuCache } from '../../shell/shellMenuLoader';
import {
  AdminSection, Card, LoadingSpinner, ErrorBox, DataTable,
  AdminButton, AdminInput, Badge, EmptyState, confirmAdminDestructiveAction, formatAdminMutationError,
} from './adminShared';

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

type MenuEdit = Partial<MenuRow> & { original_menu_id?: string };

interface MenuItemRow {
  item_id: string;
  menu_id: string;
  level: number;
  action_id: string;
  label: string;
  icon: string | null;
  auth_required: boolean;
  sort_order: number;
}

export function MenuEditorPanel() {
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMenu, setEditMenu] = useState<MenuEdit | null>(null);
  const [editItem, setEditItem] = useState<Partial<MenuItemRow> | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchMenus = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured'); return; }
    setError(null);
    setLoading(true);
    try {
      const [menusRes, itemsRes] = await Promise.all([
        supabase.from('shell_menus').select('*').order('menu_id'),
        supabase.from('shell_menu_items').select('*').order('sort_order'),
      ]);
      if (menusRes.error) throw menusRes.error;
      if (itemsRes.error) throw itemsRes.error;
      setMenus((menusRes.data as MenuRow[]) ?? []);
      setItems((itemsRes.data as MenuItemRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMenus(); }, [fetchMenus]);

  const menuCols = [
    { key: 'menu_id',        header: 'Menu ID',         render: (r: MenuRow) => <code style={{ fontSize: '0.75rem' }}>{r.menu_id}</code> },
    { key: 'menu_zone',      header: 'Zone',            render: (r: MenuRow) => r.menu_zone ?? '—' },
    { key: 'permission_class', header: 'Permission',    render: (r: MenuRow) => <Badge label={r.permission_class ?? 'unknown'} color="gray" /> },
    { key: 'desktop_sub_path', header: 'Sub Path',      render: (r: MenuRow) => r.desktop_sub_path ?? '—' },
    { key: 'parent_menu_id', header: 'Parent',          render: (r: MenuRow) => r.parent_menu_id ?? '—' },
  ];

  const selectedItems = items.filter((i) => i.menu_id === selectedMenu);

  const saveMenu = async () => {
    if (!supabase || !editMenu) return;
    const menuId = editMenu.menu_id?.trim();
    if (!menuId) {
      setError('Menu ID is required.');
      return;
    }
    setError(null);
    setSaveMsg('Saving menu…');
    const row = {
      menu_id: menuId,
      menu_zone: editMenu.menu_zone?.trim() || null,
      permission_class: editMenu.permission_class?.trim() || null,
      parent_menu_id: editMenu.parent_menu_id?.trim() || null,
      launch_mode: editMenu.launch_mode?.trim() || 'replace_active',
      desktop_sub_path: editMenu.desktop_sub_path?.trim() || null,
      data_source_ref: editMenu.data_source_ref?.trim() || null,
      launched_from_action_id: editMenu.launched_from_action_id?.trim() || null,
    };
    try {
      if (editMenu.original_menu_id) {
        const { error: updateError } = await supabase
          .from('shell_menus')
          .update({
            menu_zone: row.menu_zone,
            permission_class: row.permission_class,
            parent_menu_id: row.parent_menu_id,
            launch_mode: row.launch_mode,
            desktop_sub_path: row.desktop_sub_path,
            data_source_ref: row.data_source_ref,
            launched_from_action_id: row.launched_from_action_id,
          } as never)
          .eq('menu_id', editMenu.original_menu_id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('shell_menus').insert(row as never);
        if (insertError) throw insertError;
      }
      setSaveMsg('Menu saved ✓');
      setEditMenu(null);
      invalidateShellMenuCache();
      await fetchMenus();
    } catch (e: unknown) {
      setSaveMsg('');
      setError(formatAdminMutationError(e, 'Unable to save shell menu.'));
    }
  };

  const deleteMenu = async (menu: MenuRow) => {
    if (
      !supabase ||
      !confirmAdminDestructiveAction(
        `Delete menu "${menu.menu_id}" and all of its menu items?`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('shell_menus').delete().eq('menu_id', menu.menu_id);
      if (deleteError) throw deleteError;
      if (selectedMenu === menu.menu_id) setSelectedMenu(null);
      invalidateShellMenuCache();
      await fetchMenus();
    } catch (e: unknown) {
      setError(formatAdminMutationError(e, `Unable to delete menu "${menu.menu_id}".`));
    }
  };

  const itemCols = [
    { key: 'sort_order', header: 'Order', width: '4rem' },
    { key: 'level',      header: 'Level', width: '4rem' },
    { key: 'action_id',  header: 'Action ID', render: (r: MenuItemRow) => <code style={{ fontSize: '0.75rem' }}>{r.action_id}</code> },
    { key: 'label',      header: 'Label' },
    { key: 'icon',       header: 'Icon', render: (r: MenuItemRow) => r.icon ?? '—' },
    { key: 'auth_required', header: 'Auth', render: (r: MenuItemRow) => <Badge label={r.auth_required ? 'Required' : 'Guest'} color={r.auth_required ? 'red' : 'green'} /> },
  ];

  const saveItem = async () => {
    if (!supabase || !editItem) return;
    setError(null);
    setSaveMsg('Saving…');
    try {
      if (editItem.item_id) {
        const { error: e } = await supabase
          .from('shell_menu_items')
          .update({ menu_id: editItem.menu_id ?? selectedMenu!, level: editItem.level ?? 0, label: editItem.label, action_id: editItem.action_id, icon: editItem.icon ?? null, auth_required: !!editItem.auth_required, sort_order: editItem.sort_order ?? 0 } as never)
          .eq('item_id', editItem.item_id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from('shell_menu_items')
          .insert({ menu_id: selectedMenu!, level: editItem.level ?? 0, action_id: editItem.action_id!, label: editItem.label!, icon: editItem.icon ?? null, auth_required: !!editItem.auth_required, sort_order: editItem.sort_order ?? 0 } as never);
        if (e) throw e;
      }
      setSaveMsg('Saved ✓');
      setEditItem(null);
      invalidateShellMenuCache();
      await fetchMenus();
    } catch (e: unknown) {
      setSaveMsg('');
      setError(formatAdminMutationError(e, 'Unable to save menu item.'));
    }
  };

  const deleteItem = async (item: MenuItemRow) => {
    if (!supabase || !confirmAdminDestructiveAction(`Delete item "${item.label}"?`)) return;
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('shell_menu_items').delete().eq('item_id', item.item_id);
      if (deleteError) throw deleteError;
      invalidateShellMenuCache();
      await fetchMenus();
    } catch (e: unknown) {
      setError(formatAdminMutationError(e, `Unable to delete item "${item.label}".`));
    }
  };

  return (
    <AdminSection title="Menu Editor" subtitle="Edit shell menus and items. Changes take effect after cache refresh (5 min) or page reload.">
      {error && <ErrorBox message={error} />}
      {loading && <LoadingSpinner />}
      {saveMsg && <div style={{ padding: '0.5rem', color: 'var(--panel-accent-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{saveMsg}</div>}

      {!loading && (
        <>
          {/* Menus table */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Menus ({menus.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedMenu && (
                <AdminButton
                  onClick={() => {
                    const menu = menus.find((m) => m.menu_id === selectedMenu);
                    if (menu) setEditMenu({ ...menu, original_menu_id: menu.menu_id });
                  }}
                >
                  Edit Selected Menu
                </AdminButton>
              )}
              <AdminButton
                variant="primary"
                onClick={() => setEditMenu({
                  menu_zone: 'header_system',
                  permission_class: 'shell_system',
                  launch_mode: 'replace_active',
                })}
              >
                + Add Menu
              </AdminButton>
              <AdminButton onClick={() => void fetchMenus()}>Refresh</AdminButton>
            </div>
          </div>
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
            <DataTable
              cols={menuCols as unknown as Parameters<typeof DataTable>[0]['cols']}
              rows={menus as unknown as Record<string, unknown>[]}
              getRowKey={(r) => (r as unknown as MenuRow).menu_id}
              onEdit={(r) => setSelectedMenu((r as unknown as MenuRow).menu_id)}
              onDelete={(r) => void deleteMenu(r as unknown as MenuRow)}
              editLabel="Select"
            />
          </Card>

          {editMenu && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                {editMenu.original_menu_id ? 'Edit Menu' : 'New Menu'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Menu ID</label>
                  <AdminInput
                    value={editMenu.menu_id ?? ''}
                    onChange={(v) => setEditMenu({ ...editMenu, menu_id: v })}
                    placeholder="shell-header-system"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Menu Zone</label>
                  <AdminInput value={editMenu.menu_zone ?? ''} onChange={(v) => setEditMenu({ ...editMenu, menu_zone: v || null })} placeholder="header_system" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Permission Class</label>
                  <AdminInput value={editMenu.permission_class ?? ''} onChange={(v) => setEditMenu({ ...editMenu, permission_class: v || null })} placeholder="shell_system" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Launch Mode</label>
                  <AdminInput value={editMenu.launch_mode ?? ''} onChange={(v) => setEditMenu({ ...editMenu, launch_mode: v || null })} placeholder="replace_active" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Parent Menu ID</label>
                  <AdminInput value={editMenu.parent_menu_id ?? ''} onChange={(v) => setEditMenu({ ...editMenu, parent_menu_id: v || null })} placeholder="optional parent" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Desktop Sub Path</label>
                  <AdminInput value={editMenu.desktop_sub_path ?? ''} onChange={(v) => setEditMenu({ ...editMenu, desktop_sub_path: v || null })} placeholder="SYSTEM_SETTINGS" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Data Source Ref</label>
                  <AdminInput value={editMenu.data_source_ref ?? ''} onChange={(v) => setEditMenu({ ...editMenu, data_source_ref: v || null })} placeholder="shell.menu.example.v1" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Launched From Action ID</label>
                  <AdminInput value={editMenu.launched_from_action_id ?? ''} onChange={(v) => setEditMenu({ ...editMenu, launched_from_action_id: v || null })} placeholder="optional action_id" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <AdminButton variant="primary" onClick={() => void saveMenu()}>Save Menu</AdminButton>
                <AdminButton onClick={() => { setEditMenu(null); setSaveMsg(''); }}>Cancel</AdminButton>
              </div>
            </Card>
          )}

          {/* Items for selected menu */}
          {selectedMenu && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                  Items for <code style={{ fontSize: '0.85rem' }}>{selectedMenu}</code> ({selectedItems.length})
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <AdminButton onClick={() => setEditItem({ menu_id: selectedMenu, level: 0, sort_order: selectedItems.length, auth_required: false })}>
                    + Add Item
                  </AdminButton>
                  <AdminButton onClick={() => setSelectedMenu(null)}>✕ Close</AdminButton>
                </div>
              </div>

              {selectedItems.length === 0
                ? <EmptyState message="No items. Click + Add Item to add the first one." />
                : (
                  <Card style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
                    <DataTable
                      cols={itemCols as unknown as Parameters<typeof DataTable>[0]['cols']}
                      rows={selectedItems as unknown as Record<string, unknown>[]}
                      getRowKey={(r) => (r as unknown as MenuItemRow).item_id}
                      onEdit={(r) => setEditItem({ ...(r as unknown as MenuItemRow) })}
                      onDelete={(r) => void deleteItem(r as unknown as MenuItemRow)}
                    />
                  </Card>
                )
              }
            </>
          )}

          {/* Edit form */}
          {editItem && (
            <Card style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                {editItem.item_id ? 'Edit Item' : 'New Item'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Label</label>
                  <AdminInput value={editItem.label ?? ''} onChange={(v) => setEditItem({ ...editItem, label: v })} placeholder="Display label" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Action ID</label>
                  <AdminInput value={editItem.action_id ?? ''} onChange={(v) => setEditItem({ ...editItem, action_id: v })} placeholder="action_id" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Icon</label>
                  <AdminInput value={editItem.icon ?? ''} onChange={(v) => setEditItem({ ...editItem, icon: v || null })} placeholder="voice / profile / system / …" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Level</label>
                  <AdminInput value={String(editItem.level ?? 0)} onChange={(v) => setEditItem({ ...editItem, level: parseInt(v) || 0 })} type="number" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Sort Order</label>
                  <AdminInput value={String(editItem.sort_order ?? 0)} onChange={(v) => setEditItem({ ...editItem, sort_order: parseInt(v) || 0 })} type="number" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editItem.auth_required} onChange={(e) => setEditItem({ ...editItem, auth_required: e.target.checked })} />
                    Requires authentication
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <AdminButton variant="primary" onClick={() => void saveItem()}>Save</AdminButton>
                <AdminButton onClick={() => { setEditItem(null); setSaveMsg(''); }}>Cancel</AdminButton>
              </div>
            </Card>
          )}
        </>
      )}
    </AdminSection>
  );
}
