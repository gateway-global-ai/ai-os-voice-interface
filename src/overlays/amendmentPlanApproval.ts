/**
 * Derive approval steps from synthesized plan markdown when the API does not send structured items.
 * Prefers ## sections, then numbered lists, then a single full-document step.
 */

export type ApprovalPlanItem = {
  id: string;
  title: string;
  /** Markdown body (paragraphs / bullets under the step). */
  bodyMarkdown: string;
};

function stripMdHeadingHashes(line: string): string {
  return line.replace(/^#+\s*/, '').trim();
}

/**
 * Split consolidated plan markdown into one screen per approval step.
 */
export function parseApprovalItemsFromPlan(markdown: string): ApprovalPlanItem[] {
  const raw = markdown.trim();
  if (!raw) return [];

  const byH2 = splitByH2Sections(raw);
  if (byH2.length > 0) {
    return byH2.map((s, i) => ({
      id: `h2-${i}`,
      title: s.title,
      bodyMarkdown: s.body.trim(),
    }));
  }

  const numbered = splitNumberedList(raw);
  if (numbered.length > 1) {
    return numbered.map((s, i) => ({
      id: `n-${i}`,
      title: s.title,
      bodyMarkdown: s.body.trim(),
    }));
  }

  const lines = raw.split('\n');
  const firstLine = lines[0] ?? '';
  const title = firstLine.startsWith('#') ? stripMdHeadingHashes(firstLine) : 'Recommended plan';
  const body = firstLine.startsWith('#') ? lines.slice(1).join('\n').trim() : raw;

  return [{ id: 'plan', title, bodyMarkdown: body }];
}

/** Split on ## headings; include intro before first ## as its own step when present. */
function splitByH2Sections(md: string): Array<{ title: string; body: string }> {
  const re = /^##\s+(.+)$/gm;
  const matches = [...md.matchAll(re)];
  if (matches.length === 0) return [];

  const out: Array<{ title: string; body: string }> = [];
  const firstIdx = matches[0].index ?? 0;
  if (firstIdx > 0) {
    const intro = md.slice(0, firstIdx).trim();
    if (intro) {
      const fl = intro.split('\n')[0] ?? '';
      out.push({
        title: fl.startsWith('#') ? stripMdHeadingHashes(fl) : 'Context',
        body: intro,
      });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim();
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? md.length) : md.length;
    const body = md.slice(start, end).trim();
    out.push({ title, body });
  }
  return out;
}

function splitNumberedList(md: string): Array<{ title: string; body: string }> {
  const lines = md.split('\n');
  const blocks: string[] = [];
  let cur: string[] = [];

  const flush = () => {
    if (cur.length) {
      blocks.push(cur.join('\n'));
      cur = [];
    }
  };

  for (const line of lines) {
    if (/^\d+\.\s+/.test(line)) {
      flush();
      cur.push(line);
    } else if (cur.length) {
      cur.push(line);
    }
  }
  flush();

  if (blocks.length <= 1) return [];

  return blocks.map((block) => {
    const m = block.match(/^\d+\.\s+([^\n]+)([\s\S]*)/);
    if (!m) return { title: block.slice(0, 120).trim(), body: block };
    return { title: m[1].trim(), body: (m[2] || '').trim() };
  });
}
