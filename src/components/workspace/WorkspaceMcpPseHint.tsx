/**
 * When `search_custom` fails because PSE env is missing on the MCP host (not a browser/OAuth issue).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export function WorkspaceMcpPseHint({ message }: { message?: string | null }) {
  if (!message) return null;
  if (!/GOOGLE_PSE|search_custom|Programmable Search|PSE_API/i.test(message)) return null;

  return (
    <div className="mt-3 text-xs text-amber-950/95 leading-relaxed border-t border-amber-200 pt-2 space-y-2">
      <p>
        <span className="font-semibold">Programmable Search (Custom Search JSON API):</span> enabling{' '}
        <strong>Custom Search API</strong> in Google Cloud is only one step. The{' '}
        <strong>MCP server process</strong> must have{' '}
        <code className="text-[11px] bg-amber-100/90 px-1 rounded">GOOGLE_PSE_API_KEY</code> and{' '}
        <code className="text-[11px] bg-amber-100/90 px-1 rounded">GOOGLE_PSE_ENGINE_ID</code> in{' '}
        <strong>its</strong> environment (e.g. Docker <code className="text-[11px]">.env</code>, systemd, or your
        host&apos;s secret store). Create an <strong>API key</strong> with Custom Search API access, create a{' '}
        <a
          href="https://programmablesearchengine.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-800 underline underline-offset-2"
        >
          Programmable Search Engine
        </a>{' '}
        and copy the <strong>Search engine ID</strong> (cx). Restart the MCP after setting variables.
      </p>
      <p className="text-zinc-600">
        Do <strong>not</strong> put these in the voice app&apos;s <code className="text-[11px]">.env.local</code> as{' '}
        <code className="text-[11px]">VITE_*</code> — they belong on the MCP host only; the browser never sends them.
      </p>
    </div>
  );
}
