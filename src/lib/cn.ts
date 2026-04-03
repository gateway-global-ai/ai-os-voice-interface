/** Join class names; omit falsy entries. Shadcn-style helper without tailwind-merge (keep variants mutually exclusive). */
export function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}
