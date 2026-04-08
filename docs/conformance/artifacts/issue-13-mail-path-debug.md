# Issue #13 — Mail bounded unread: debug chain (code-derived)

**Parent:** Conformance pilot **#12** · **#13**  
**Question:** Is Mail failing because **MCP/control-plane returned bad data**, or because the **UI normalization/render layer** cannot handle a **valid** result?

This note answers from **static analysis** until a **raw `mailResult.data`** capture is attached.

---

## 1. Precise failure point (UI)

**File:** `src/overlays/WorkspaceHubSurface.tsx`  
**Component:** `MailSearchPanel`  
**Lines:** ~1256–1287 (approx.; search for `normalizeMailSearchRows`).

When **`read.loadState === 'ok'`** (control plane and adapter succeeded and `workspaceMailDataIsEmpty` did not classify the payload as empty):

1. `normalizedRows = normalizeMailSearchRows(read.data)` — `src/workspace/mailSearchRows.ts`
2. `structuredPrimary = governed && mailSearchRowsHaveClickTargets(normalizedRows) && normalizedRows.length > 0`
3. If **`structuredPrimary`** is **false**, the user sees the **generic** copy (non-diagnostics):

   > *We could not show a formatted list. Try another search or open a message another way.*

**Important:** This path is **not** the red “Mail search failed” alert (`loadState === 'error'`). It means **`read.data` was treated as a successful, non-empty load** at the payload-loader layer, but the **governed primary list** could not be built.

If **diagnostics chrome** is on (`useDiagnosticsChromeEnabled()`), the alternate line is:

> *Structured rows were not detected; showing generic summary…*

So the **real diagnostic** is often **hidden** on primary surfaces — a **transparency / §12.4** concern when debugging from screenshots alone.

---

## 2. Expected shapes (`normalizeMailSearchRows`)

**Unwrap:** `unwrapMailSearchPayload` walks shallow **`result` / `data` / `content` / `output`** chains (up to 5 hops).

**List extraction:** `extractMcpRowArray` (`src/workspace/workspaceMcpDisplay.ts`) looks for **top-level** array keys on the (possibly unwrapped) object:

`calendars`, **`messages`**, **`threads`**, `items`, `files`, **`results`**, `contacts`

**Row build:** `rowFromObject` requires a **`messageId`** (from `id`, `messageId`, …) and **`looksLikeGmailMessageRecord`** OR nested `messages[]` — otherwise the row is **dropped**.

So a **valid** MCP response that puts message bodies under an **unsupported** key (e.g. only `result.text` string, or `messageList` not matched after unwrap) can yield **`normalizedRows === []`** even when something was returned.

---

## 3. “Empty” vs “OK” mismatch (`loadGovernancePayload`)

**File:** `src/shellCanvas/loadWorkspacePayload.ts`  
**Function:** `workspaceMailDataIsEmpty` (~402–414)

Empty is **only** inferred when:

- `messages` / `threads` / `items` / `messageList` exist as arrays and are length 0, or top-level array/string empty.

If the object has **none** of those keys at the **top level** (e.g. only nested JSON-RPC), the function **falls through to `return false`** → **not empty** → `loadState: 'ok'`.

So **`loadState === 'ok'`** does **not** guarantee that **`normalizeMailSearchRows`** will find rows. **Loader empty heuristic** and **row normalizer** can **disagree**.

---

## 4. Hypotheses (to confirm with one raw payload)

| Hypothesis | What to check |
|------------|----------------|
| **A — Shape / contract** | MCP returns `messages` entries missing `id` / fields `rowFromObject` needs, or uses a list key **`extractMcpRowArray` does not scan** after unwrap. |
| **B — Thread vs message** | List is **threads** with minimal `{ id, snippet }` only; **`looksLikeGmailMessageRecord`** / id picking fails so no rows. |
| **C — Transparency** | Failure is “no structured rows” but UI shows **generic** string; **operator** needs **`WorkspaceMcpDataView`** + diagnostics + **audit id** to see raw payload. |

---

## 5. What to capture next (minimal)

1. **`mailResult.data`** (or `read.data` in `MailSearchPanel`) — **one JSON sample** from a failing run (redact PII).
2. **Same sample** after `unwrapMailSearchPayload` + note whether `extractMcpRowArray` returns non-null.
3. **Length of `normalizeMailSearchRows(data)`** — 0 vs >0.

That split answers **bad data vs normalizer** in one comparison.

---

## 6. Next pass checklist (turn #13 into a fix)

**Likely state today:** Control-plane execution returns **data** the loader treats as **non-empty**, but **`normalizeMailSearchRows`** yields **no** user-facing rows — **silent** on primary when diagnostics are off.

1. **Reproduce** the bounded unread-mail failure once (same flow as pilot).
2. **Log or capture** raw **`mailResult.data`** from `loadGovernancePayload` / `runWorkspaceControlPlane` result (or `read.data` in **`MailSearchPanel`**).
3. **Record:**
   - **Top-level keys** of the raw object (after any JSON parse).
   - Whether **`unwrapMailSearchPayload`** reaches a list (`extractMcpRowArray` non-null or not).
   - **`normalizeMailSearchRows(data).length`** (and optionally per-step counts).
   - **Exact user-visible branch:** `MailSearchPanel` → `structuredPrimary === false` → generic “formatted list” string (`WorkspaceHubSurface.tsx` ~1277–1279).
4. **Compare** to §2–3 of this doc and **`extractMcpRowArray`** keys in `workspaceMcpDisplay.ts`.
5. **Classify** the fix locus (may overlap):
   - **Control-plane / adapter result shaping** — normalize server output before UI.
   - **`normalizeMailSearchRows` / `rowFromObject`** — accept the real MCP shape.
   - **`WorkspaceHubSurface` / `MailSearchPanel`** — messaging, fallbacks, or always show raw under operator.
   - **Diagnostics / trace** — surface real reason when rows are empty but `loadState === 'ok'` (**AIOS-SPEC-009** transparency).

---

## 7. After capture — mismatch classification

| Classification | Meaning |
|----------------|---------|
| **Contract bug** | Payload shape is not what the mail UI pipeline expects (server or client contract drift). |
| **Formatter bug** | Payload is valid Gmail-like but **`normalizeMailSearchRows`** rejects or misses it (too brittle). |
| **Both** | Inconsistent payload + brittle formatter. |
| **Transparency bug** | Operator/diagnostics could show raw payload or row count; primary user only sees generic line. |

**Good #13 closure comment:** paste **redacted raw payload** (or attach file), **normalization row count**, **classification** from the table above, and **first user-visible file/line** (this doc §1).

---

## 8. Code references (quick)

| Piece | Location |
|-------|----------|
| CP mail search envelope | `loadGovernancePayload.ts` — `workspace_mail_hub`, `workspace.mail.search` |
| Empty heuristic | `workspaceMailDataIsEmpty` |
| Normalize | `mailSearchRows.ts` — `normalizeMailSearchRows`, `rowFromObject` |
| List keys | `workspaceMcpDisplay.ts` — `extractMcpRowArray` |
| Generic user string | `WorkspaceHubSurface.tsx` — `MailSearchPanel` ~1277–1279 |
