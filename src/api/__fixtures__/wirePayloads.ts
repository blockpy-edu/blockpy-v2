// Representative wire payloads matching verified blockpy-server schemas
// (docs/architecture/07 §1.2). Synthesized but schema-checked: each constant
// is typed against the wire interfaces, so drift fails the build. Replace or
// extend with anonymized live captures as they become available.

import type { AssignmentGroupJson, AssignmentJson, SubmissionJson } from "../types";

export const blockpyAssignmentJson: AssignmentJson = {
    id: 478,
    name: "Maria the Mathematician",
    url: "maria_math",
    type: "blockpy",
    instructions: "Print the sum of **5** and **3**.",
    reviewed: false,
    hidden: false,
    public: true,
    subordinate: false,
    ip_ranges: "",
    points: 1,
    settings: '{"startView": "split", "hideFiles": true, "old_unknown_key": 42}',
    on_run: 'from pedal import *\nassert_output(student, "8")\n',
    on_change: "",
    on_eval: "",
    starting_code: "# Compute the sum below\n",
    extra_instructor_files: "",
    extra_starting_files: "",
    forked_id: null,
    forked_version: null,
    owner_id: 5,
    course_id: 12,
    version: 7,
    date_created: "2024-01-15T10:00:00Z",
    date_modified: "2024-09-02T16:30:00Z",
};

export const quizAssignmentJson: AssignmentJson = {
    ...blockpyAssignmentJson,
    id: 512,
    name: "Loops Checkpoint Quiz",
    url: "loops_quiz",
    type: "quiz",
    instructions: JSON.stringify({
        questions: {
            q1: {
                type: "multiple_choice_question",
                body: "What does `range(3)` produce?",
                answers: ["0, 1, 2", "1, 2, 3", "0, 1, 2, 3"],
                points: 1,
            },
            q2: {
                type: "true_false_question",
                body: "A `while` loop always runs at least once.",
                points: 1,
            },
        },
        settings: {
            attemptLimit: 2,
            coolDown: -1,
            feedbackType: "IMMEDIATE",
            questionsPerPage: -1,
            poolRandomness: "SEED",
            readingId: null,
        },
        pools: [],
    }),
    on_run: JSON.stringify({
        q1: { correct: "0, 1, 2", feedback: "range stops before the end value." },
        q2: { correct: false, feedback: "That describes do-while, which Python lacks." },
    }),
    starting_code: "",
};

export const readingAssignmentJson: AssignmentJson = {
    ...blockpyAssignmentJson,
    id: 530,
    name: "Introduction to Iteration",
    url: "iteration_intro",
    type: "reading",
    instructions: "# Iteration\n\nLoops let you repeat work...\n",
    on_run: "",
    starting_code: "",
    settings: "",
};

export const submissionJson: SubmissionJson = {
    id: 9941,
    code: "print(5 + 3)\n",
    extra_files: "",
    url: "",
    endpoint: "course_12/maria_math",
    score: 100,
    correct: true,
    submission_status: "Completed",
    grading_status: "FullyGraded",
    assignment_id: 478,
    assignment_group_id: 88,
    assignment_version: 7,
    course_id: 12,
    user_id: 301,
    version: 23,
    date_started: "2024-09-10T13:00:00Z",
    date_submitted: "2024-09-10T13:25:00Z",
    date_due: null,
    date_locked: null,
    time_limit: null,
    feedback: null,
};

export const assignmentGroupJson: AssignmentGroupJson = {
    id: 88,
    name: "Week 3: Loops",
    url: "week_3_loops",
    category: "homework",
    position: 3,
    forked_id: null,
    forked_version: null,
    owner_id: 5,
    course_id: 12,
    version: 2,
};

/** Factory: a blockpy assignment payload with overrides. */
export function makeAssignmentJson(overrides: Partial<AssignmentJson> = {}): AssignmentJson {
    return { ...blockpyAssignmentJson, ...overrides };
}

/** Factory: a submission payload with overrides. */
export function makeSubmissionJson(overrides: Partial<SubmissionJson> = {}): SubmissionJson {
    return { ...submissionJson, ...overrides };
}
