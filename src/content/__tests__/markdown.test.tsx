import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from '../markdown';
import { renderMarkdown } from '../renderMarkdown';

describe('renderMarkdown', () => {
  it('renders headings, emphasis, and code', () => {
    const html = renderMarkdown('# Title\n\nSome **bold** and `code`.');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
  });

  it('strips script tags and inline event handlers', () => {
    const html = renderMarkdown('hello <script>alert(1)</script> <img src=x onerror="alert(1)">');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });

  it('removes javascript: links', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('allows iframes only from the video allowlist', () => {
    const allowed = renderMarkdown(
      '<iframe src="https://www.youtube.com/embed/abc123" allowfullscreen></iframe>',
    );
    expect(allowed).toContain('<iframe');
    expect(allowed).toContain('youtube.com/embed/abc123');

    const blocked = renderMarkdown('<iframe src="https://evil.example.com/embed"></iframe>');
    expect(blocked).not.toContain('<iframe');

    const insecure = renderMarkdown('<iframe src="http://www.youtube.com/embed/abc"></iframe>');
    expect(insecure).not.toContain('<iframe');
  });
});

describe('Markdown component', () => {
  it('renders sanitized markup into the DOM', () => {
    render(<Markdown source={'## Section\n\n- item one\n- item two'} />);
    expect(screen.getByRole('heading', { name: 'Section' })).toBeInTheDocument();
    expect(screen.getByText('item two')).toBeInTheDocument();
  });
});
