// Textbook tasks (docs/architecture/06 §3): a navigation tree over the
// textbook JSON plus the selected page's content. Pages referencing other
// assignments in the current activity focus that task in place.

import { useMemo, useState } from "react";
import { Markdown } from "../../content/markdown";
import { flattenPages, parseTextbook } from "../../domain/textbook";
import type { TextbookNode } from "../../domain/textbook";
import { useActivityState, useWorkspace } from "../useWorkspace";
import type { ActivityTask } from "../../domain/activity";
import styles from "./TextbookTask.module.css";

interface TextbookTaskProps {
    task: ActivityTask;
}

export function TextbookTask({ task }: TextbookTaskProps) {
    const { activityStore } = useWorkspace();
    const activity = useActivityState((state) => state.activity);
    const raw = task.kind.type === "textbookPage" ? task.kind.pageRef : "";
    const nodes = useMemo(() => parseTextbook(raw), [raw]);
    const pages = useMemo(() => (nodes ? flattenPages(nodes) : []), [nodes]);
    const [selected, setSelected] = useState<TextbookNode | null>(null);

    if (!nodes) {
        return <p className={styles.note}>This textbook could not be loaded.</p>;
    }

    const current = selected ?? pages[0] ?? null;
    const taskIds = new Set(activity.tasks.map((member) => member.assignmentId));

    const renderNode = (node: TextbookNode) => (
        <li key={node.title}>
            {node.content || node.assignmentId !== null ? (
                <button
                    type="button"
                    className={styles.pageButton}
                    aria-current={node === current ? "page" : undefined}
                    onClick={() => setSelected(node)}
                >
                    {node.title}
                </button>
            ) : (
                <span className={styles.sectionTitle}>{node.title}</span>
            )}
            {node.children.length > 0 ? (
                <ul className={styles.tree}>{node.children.map(renderNode)}</ul>
            ) : null}
        </li>
    );

    return (
        <div className={styles.textbook}>
            <nav aria-label="Textbook contents" className={styles.navigation}>
                <ul className={styles.tree}>{nodes.map(renderNode)}</ul>
            </nav>
            <div className={styles.page}>
                {current ? (
                    <>
                        <h3 className={styles.pageTitle}>{current.title}</h3>
                        {current.content ? <Markdown source={current.content} /> : null}
                        {current.assignmentId !== null ? (
                            taskIds.has(current.assignmentId) ? (
                                <button
                                    type="button"
                                    className={styles.openButton}
                                    onClick={() =>
                                        activityStore
                                            .getState()
                                            .focusTask(current.assignmentId as number)
                                    }
                                >
                                    Open this activity
                                </button>
                            ) : (
                                <p className={styles.note}>
                                    This page references assignment {current.assignmentId}, which is
                                    not part of the current activity.
                                </p>
                            )
                        ) : null}
                    </>
                ) : (
                    <p className={styles.note}>This textbook has no pages.</p>
                )}
            </div>
        </div>
    );
}
