/**
 * Parse `list_contacts` MCP prose (aios_google_workspace_mcp) for structured UI + pagination.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type ParsedContactRow = {
  contactId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  organization: string | null;
};

/**
 * Extract contacts blocks, optional summary line, and next-page token from full MCP text.
 */
export function parseContactsListMcpText(text: string): {
  contacts: ParsedContactRow[];
  nextPageToken: string | null;
  summaryLine: string | null;
} {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const nextMatch = normalized.match(/Next page token:\s*(\S+)/i);
  const nextPageToken = nextMatch?.[1]?.trim() ?? null;
  const withoutFooter = nextPageToken
    ? normalized.replace(/\n*Next page token:\s*\S+\s*$/i, '').trimEnd()
    : normalized.trimEnd();

  const lines = withoutFooter.split('\n');
  let summaryLine: string | null = null;
  let bodyStart = 0;
  const first = lines[0]?.trim() ?? '';
  if (/^Contacts for\s+/i.test(first)) {
    summaryLine = first;
    bodyStart = 1;
    while (bodyStart < lines.length && lines[bodyStart]?.trim() === '') bodyStart += 1;
  }

  const body = lines.slice(bodyStart).join('\n');
  const contacts = parseContactBlocks(body);
  return { contacts, nextPageToken, summaryLine };
}

function parseContactBlocks(body: string): ParsedContactRow[] {
  const rows: ParsedContactRow[] = [];
  const lines = body.split('\n');
  let cur: Partial<ParsedContactRow> | null = null;

  const flush = () => {
    if (cur?.contactId) {
      rows.push({
        contactId: cur.contactId,
        name: cur.name ?? null,
        email: cur.email ?? null,
        phone: cur.phone ?? null,
        organization: cur.organization ?? null,
      });
    }
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const idM = line.match(/^Contact ID:\s*(.+)$/i);
    if (idM) {
      flush();
      cur = { contactId: idM[1].trim() };
      continue;
    }
    if (!cur) continue;

    const nameM = line.match(/^Name:\s*(.*)$/i);
    if (nameM) {
      const v = nameM[1].trim();
      cur.name = v.length ? v : null;
      continue;
    }
    const emailM = line.match(/^Email:\s*(.*)$/i);
    if (emailM) {
      const v = emailM[1].trim();
      cur.email = v.length ? v : null;
      continue;
    }
    const phoneM = line.match(/^Phone:\s*(.*)$/i);
    if (phoneM) {
      const v = phoneM[1].trim();
      cur.phone = v.length ? v : null;
      continue;
    }
    const orgM = line.match(/^Organization:\s*(.*)$/i);
    if (orgM) {
      const v = orgM[1].trim();
      cur.organization = v.length ? v : null;
      continue;
    }
  }
  flush();
  return rows;
}
