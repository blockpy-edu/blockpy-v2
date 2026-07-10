import { useApi } from "../../api/useApi";
import { canNavigate } from "../../domain/activity";
import { useActivityState, useWorkspace } from "../useWorkspace";
import styles from "./ActivityRail.module.css";

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

    const focusedIndex = activity.tasks.findIndex((task) => task.assignmentId === focusedTaskId);

    const navigate = async (taskId: number) => {
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

    /** Find the nearest navigable task in a given direction. */
    const findNavigable = (from: number, direction: 1 | -1): number | null => {
        let index = from + direction;
        while (index >= 0 && index < activity.tasks.length) {
            const verdict = canNavigate(activity, statuses, activity.tasks[index].assignmentId);
            if (verdict.allowed) {
                return activity.tasks[index].assignmentId;
            }
            index += direction;
        }
        return null;
    };

    const firstId = findNavigable(-1, 1);
    const prevId = findNavigable(focusedIndex, -1);
    const nextId = findNavigable(focusedIndex, 1);
    const lastNavigable = (() => {
        for (let i = activity.tasks.length - 1; i >= 0; i--) {
            const verdict = canNavigate(activity, statuses, activity.tasks[i].assignmentId);
            if (verdict.allowed) {
                return activity.tasks[i].assignmentId;
            }
        }
        return null;
    })();

    const handleJump = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(event.target.value);
        if (!Number.isNaN(id)) {
            void navigate(id);
        }
    };

    return (
        <nav className={styles.rail} aria-label="Activity tasks">
            <p className={styles.activityName}>{activity.name}</p>

            {/* Sequential navigation buttons */}
            <div className={styles.navButtons} role="group" aria-label="Task navigation">
                <button
                    type="button"
                    className={styles.navButton}
                    aria-label="First task"
                    title="First task"
                    disabled={firstId === null || firstId === focusedTaskId}
                    onClick={() => firstId !== null && void navigate(firstId)}
                >
                    ⏮
                </button>
                <button
                    type="button"
                    className={styles.navButton}
                    aria-label="Previous task"
                    title="Previous task"
                    disabled={prevId === null}
                    onClick={() => prevId !== null && void navigate(prevId)}
                >
                    ◀
                </button>
                <select
                    className={styles.jumpSelect}
                    aria-label="Jump to task"
                    value={focusedTaskId}
                    onChange={handleJump}
                >
                    {activity.tasks.map((task, index) => {
                        const verdict = canNavigate(activity, statuses, task.assignmentId);
                        return (
                            <option
                                key={task.assignmentId}
                                value={task.assignmentId}
                                disabled={!verdict.allowed}
                            >
                                {index + 1}. {task.title}
                            </option>
                        );
                    })}
                </select>
                <button
                    type="button"
                    className={styles.navButton}
                    aria-label="Next task"
                    title="Next task"
                    disabled={nextId === null}
                    onClick={() => nextId !== null && void navigate(nextId)}
                >
                    ▶
                </button>
                <button
                    type="button"
                    className={styles.navButton}
                    aria-label="Last task"
                    title="Last task"
                    disabled={lastNavigable === null || lastNavigable === focusedTaskId}
                    onClick={() => lastNavigable !== null && void navigate(lastNavigable)}
                >
                    ⏭
                </button>
            </div>
        </nav>
    );
}
