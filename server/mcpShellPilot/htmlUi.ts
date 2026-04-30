/**
 * MCP App HTML fragments (text/html;profile=mcp-app) for pilot tools.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { MCP_SHELL_THEME_STYLE_BLOCK } from './mcpShellThemeCss';

function shellActionRpc(action: string, id: number): string {
  return `window.parent.postMessage({jsonrpc:'2.0',method:'x/aios/shell_action',params:{action:'${action}'},id:${id}},'*')`;
}

/** Joining the Community — three audience tiles + experimental RPC to host. */
export function communityFunnelHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${MCP_SHELL_THEME_STYLE_BLOCK}</head><body>
  <h1>Joining the Community</h1>
  <p class="desc">Choose a path. The AI OS host handles account actions outside this sandbox.</p>
  <div class="row">
    <button type="button" class="tile" onclick="${shellActionRpc('community_students', 1)}">Students</button>
    <button type="button" class="tile" onclick="${shellActionRpc('community_professors', 2)}">Professors</button>
    <button type="button" class="tile" onclick="${shellActionRpc('community_guest_speakers', 3)}">Guest Speakers</button>
  </div>
  <div class="row" style="margin-top:1rem">
    <button type="button" class="tile primary" onclick="${shellActionRpc('community_create_account', 4)}">Create account</button>
    <button type="button" class="tile primary" onclick="${shellActionRpc('community_login', 5)}">Login</button>
    <button type="button" class="tile" onclick="${shellActionRpc('community_close', 6)}">Close</button>
  </div>
</body></html>`;
}

/** Students path — two CTAs only (no duplicate “request to join”). */
export function studentsDetailHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${MCP_SHELL_THEME_STYLE_BLOCK}</head><body>
  <h1>Students</h1>
  <p class="desc">If you are getting serious about AI and building your future around it, join our community and complete the application to receive program dates, curriculum updates, and featured guest speaker announcements.</p>
  <div class="row">
    <button type="button" class="tile primary" onclick="${shellActionRpc('community_create_account', 11)}">Create account</button>
    <button type="button" class="tile primary" onclick="${shellActionRpc('community_login', 12)}">Login</button>
  </div>
  <div class="row" style="margin-top:1rem">
    <button type="button" class="tile" onclick="${shellActionRpc('community_back', 13)}">Back</button>
  </div>
</body></html>`;
}

export function otpPhoneHtml(): string {
  const sendWithPhone = `(function(){var el=document.getElementById('p');var v=el&&el.value?String(el.value):'';window.parent.postMessage({jsonrpc:'2.0',method:'x/aios/shell_action',params:{action:'otp_send',phone:v},id:21},'*');})()`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${MCP_SHELL_THEME_STYLE_BLOCK}</head><body>
  <h1>Confirm your phone</h1>
  <p class="desc">We text one six-digit code to your number — no passwords to invent yet.</p>
  <label for="p">Phone number</label>
  <input id="p" type="tel" autocomplete="tel" placeholder="+1 415 555 0100" />
  <div class="row" style="margin-top:1rem">
    <button type="button" class="tile primary" onclick="${sendWithPhone}">Send code</button>
    <button type="button" class="tile" onclick="${shellActionRpc('community_close', 22)}">Close</button>
  </div>
</body></html>`;
}
