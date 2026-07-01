import { useApi } from "../../api/useApi";
import { canNavigate } from "../../domain/activity";
import type { TaskStatus } from "../../domain/activity";
import { useActivityState, useWorkspace } from "../useWorkspace";
import styles from "./ActivityRail.module.css";

const STATUS_BADGES: Record<TaskStatus, string | null> = {
    untouched: null,
    inProgress: "In progress",
    complete: "Complete",
    graded: "Graded",
};

interface ActivityRailProps {
    /** Flushes pending saves before the focus leaves the current task. */
    flushNow: () => Promise<void>;
}

/**
 * Task stepper for multi-task activities (docs/architecture/02 §2.1).
 * Policy-blocked tasks render disabled with the blocking reason; the
 * server remains the authority — this gating is UX only.
 */
export function ActivityRail({ flushNow }: ActivityRailProps) {
    const { activityStore } = useWorkspace();
    const { events } = useApi();
    const activity = useActivityState((state) => state.activity);
    const focusedTaskId = useActivityState((state) => state.focusedTaskId);
    const statuses = useActivityState((state) => state.statuses);

    if (activity.tasks.length <= 1) {
        return null;
    }

    const handleSelect = async (taskId: number) => {
        await flushNow();
        const verdict = activityStore.getState().focusTask(taskId);
        if (verdict.allowed) {
            events.log({
                event_type: "Resource.View",
                file_path: "",
                category: "navigate",
                label: String(taskId),
                message: "",
            });
        }
    };

    return (
        <nav className={styles.rail} aria-label="Activity tasks">
            <p className={styles.activityName}>{activity.name}</p>
            <ol className={styles.taskList}>
                {activity.tasks.map((task, index) => {
                    const verdict = canNavigate(activity, statuses, task.assignmentId);
                    const status = statuses[task.assignmentId] ?? "untouched";
                    const badge = STATUS_BADGES[status];
                    const badgeClass =
                        status === "graded"
                            ? styles.statusGraded
                            : status === "complete"
                              ? styles.statusComplete
                              : undefined;
                    return (
                        <li key={task.assignmentId}>
                            <button
                                type="button"
                                className={styles.taskButton}
                                aria-current={
                                    task.assignmentId === focusedTaskId ? "step" : undefined
                                }
                                disabled={!verdict.allowed}
                                title={verdict.allowed ? undefined : verdict.reason}
                                onClick={() => void handleSelect(task.assignmentId)}
                            >
                                <span className={styles.taskIndex}>{index + 1}</span>
                                <span>{task.title}</span>
                                {badge ? (
                                    <span
                                        className={`${styles.statusBadge} ${badgeClass ?? ""}`.trim()}
                                    >
                                        {badge}
                                    </span>
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
