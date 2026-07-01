// Sanitized markdown rendering (docs/architecture/06): all instructor- or
// course-authored content passes through marked + DOMPurify before it touches
// the DOM. Iframes are allowed only for an explicit video-host allowlist.

import DOMPurify from "dompurify";
import { marked } from "marked";

const ALLOWED_IFRAME_HOSTS: readonly string[] = [
    "www.youtube.com",
    "www.youtube-nocookie.com",
    "player.vimeo.com",
];

function isAllowedIframeSrc(src: string | null): boolean {
    if (!src) {
        return false;
    }
    try {
        const url = new URL(src, window.location.href);
        return url.protocol === "https:" && ALLOWED_IFRAME_HOSTS.includes(url.hostname);
    } catch {
        return false;
    }
}

DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "iframe" && node instanceof Element) {
        if (!isAllowedIframeSrc(node.getAttribute("src"))) {
            node.remove();
        }
    }
});

/** Markdown source → sanitized HTML string. */
export function renderMarkdown(source: string): string {
    const html = marked.parse(source, { async: false });
    return DOMPurify.sanitize(html, {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder"],
    });
}
