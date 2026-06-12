// The shared markdown component: sanitized HTML (see renderMarkdown.ts) with
// the workspace typography styles.

import { useMemo } from 'react';
import { renderMarkdown } from './renderMarkdown';
import styles from './markdown.module.css';

interface MarkdownProps {
  source: string;
  className?: string;
}

/** Renders markdown as sanitized HTML with shared typography styles. */
export function Markdown({ source, className }: MarkdownProps) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return (
    <div
      className={className ? `${styles.markdown} ${className}` : styles.markdown}
      // Safe: the HTML is produced by renderMarkdown, which sanitizes with
      // DOMPurify (script/event-handler stripping + iframe host allowlist).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
