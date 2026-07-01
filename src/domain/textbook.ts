// Textbook trees (docs/architecture/06 §3): assignment.instructions holds a
// JSON tree whose nodes carry inline markdown content and/or reference other
// readings/assignments by id.

export interface TextbookNode {
    title: string;
    /** Inline markdown content for this page, if any. */
    content: string;
    /** Reference to another assignment (reading, quiz, code…) by id. */
    assignmentId: number | null;
    children: TextbookNode[];
}

function parseNode(raw: unknown): TextbookNode | null {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return null;
    }
    const record = raw as Record<string, unknown>;
    const children = Array.isArray(record.children)
        ? record.children.map(parseNode).filter((node): node is TextbookNode => node !== null)
        : [];
    const assignmentRef = record.assignment_id ?? record.reading_id;
    return {
        title: typeof record.title === "string" ? record.title : "Untitled",
        content: typeof record.content === "string" ? record.content : "",
        assignmentId: typeof assignmentRef === "number" ? assignmentRef : null,
        children,
    };
}

/**
 * Tolerant parser: accepts a single root node or an array of top-level
 * nodes; malformed JSON yields null so the UI can show a fallback.
 */
export function parseTextbook(raw: string): TextbookNode[] | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const nodes = list.map(parseNode).filter((node): node is TextbookNode => node !== null);
    return nodes.length > 0 ? nodes : null;
}

/** Depth-first list of pages (nodes with content or an assignment ref). */
export function flattenPages(nodes: TextbookNode[]): TextbookNode[] {
    const pages: TextbookNode[] = [];
    const visit = (node: TextbookNode) => {
        if (node.content || node.assignmentId !== null) {
            pages.push(node);
        }
        node.children.forEach(visit);
    };
    nodes.forEach(visit);
    return pages;
}
