/** Reads `#task=<assignmentId>` deep links (docs/architecture/02 §2.1). */
export function taskIdFromHash(hash: string): number | null {
  const match = /(?:^#|[#&])task=(\d+)/.exec(hash);
  return match ? Number.parseInt(match[1], 10) : null;
}
