/** True when running inside a Tauri desktop window; false in browser dev mode. */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function tryQuitApplication(): Promise<void> {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  } catch {
    try {
      window.close();
    } catch {
      /* noop */
    }
  }
}
