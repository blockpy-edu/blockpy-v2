import type { BlockPyMountOptions } from "../../types";

/**
 * Bakery-inspired mixed activity demo:
 * reading -> quiz -> python -> typescript -> python.
 *
 * Source inspiration: bakery course content around
 * "6A2) For Loop Patterns 1 Reading/Quiz".
 */
export function bakeryMixedExample(): BlockPyMountOptions {
    const quizInstructions = JSON.stringify({
        settings: {
            readingId: "bakery_for_patterns_read",
            feedbackType: "IMMEDIATE",
            attemptLimit: 3,
        },
        questions: {
            countPatternGoal: {
                type: "multiple_choice_question",
                points: 1,
                body: "What does the **Count pattern** compute?",
                answers: [
                    "The number of items in a list",
                    "The sum of values in a list",
                    "A filtered list of values",
                ],
            },
            sumPatternPrediction: {
                type: "short_answer_question",
                points: 1,
                body: "What is printed?\n```python\ns = 0\nfor n in [4, 2, 6]:\n    s = s + n\nprint(s)\n```",
            },
            insideLoop: {
                type: "true_false_question",
                points: 1,
                body: "In Python, indentation determines whether a statement is inside a loop body.",
            },
        },
        pools: [],
    });

    const quizKey = JSON.stringify({
        countPatternGoal: "The number of items in a list",
        sumPatternPrediction: {
            correct_exact: ["12"],
            wrong_any: "Try adding each list value to the running total.",
        },
        insideLoop: "true",
    });

    return {
        user: {
            id: "42",
            courseId: "bakery-demo",
            name: "Bakery Learner",
        },
        activity: {
            id: "bakery-mixed-6a2",
            name: "Bakery 6A2 Mixed Activity",
            category: "homework",
            tasks: [
                {
                    id: "601",
                    name: "6A2) For Loop Patterns 1 Reading",
                    type: "reading",
                    instructions:
                        '## Many Loop Patterns\n\nIn Bakery, we use a few common loop templates:\n\n- **Count**: how many items are in a list\n- **Sum**: add all numbers together\n- **Accumulate**: combine values over time\n\n```python\ncount = 0\nfor item in ["Alpha", "Beta", "Gamma"]:\n    count = count + 1\nprint(count)\n```\n\nRead this, then continue to the quiz.',
                },
                {
                    id: "602",
                    name: "6A2) For Loop Patterns 1 Quiz",
                    type: "quiz",
                    instructions: quizInstructions,
                    onRun: quizKey,
                    policy: { require_previous: true },
                },
                {
                    id: "603",
                    name: "Bakery Python: Total Orders",
                    type: "blockpy",
                    instructions:
                        "Write Python code that computes the total of `orders` and prints **12**.",
                    startingCode:
                        "orders = [4, 2, 6]\ntotal = 0\n# TODO: accumulate total\nprint(total)\n",
                    onRun: [
                        "if '12' in student.output:",
                        "    set_success()",
                        "else:",
                        "    gently('Use a for loop to add each order into total.')",
                    ].join("\n"),
                    policy: { require_previous: true },
                },
                {
                    id: "604",
                    name: "Bakery TypeScript: Label Orders",
                    type: "typescript",
                    instructions:
                        "Use TypeScript to build labels for each order and print `Order #1, Order #2, Order #3`.",
                    startingCode: [
                        "const orders: number[] = [4, 2, 6];",
                        "const labels: string[] = [];",
                        "// TODO: fill labels with Order #1, Order #2, ...",
                        "console.log(labels.join(', '));",
                    ].join("\n"),
                    onRun: [
                        "if (student.output.indexOf('Order #1, Order #2, Order #3') !== -1) {",
                        "  set_success();",
                        "} else {",
                        "  gently('Use a loop and push labels like Order #1, Order #2, Order #3.');",
                        "}",
                    ].join("\n"),
                    policy: { require_previous: true },
                },
                {
                    id: "605",
                    name: "Bakery Python: Count High Orders",
                    type: "blockpy",
                    instructions:
                        "Count how many values in `orders` are at least 5 and print **2**.",
                    startingCode:
                        "orders = [4, 2, 6, 8]\ncount = 0\n# TODO: count orders >= 5\nprint(count)\n",
                    onRun: [
                        "if '2' in student.output:",
                        "    set_success()",
                        "else:",
                        "    gently('Increment count when an order is >= 5.')",
                    ].join("\n"),
                    policy: { require_previous: true },
                },
            ],
        },
    };
}

/**
 * Bakery-inspired mixed activity where the quiz is directly attached
 * to the reading via quiz settings.readingId.
 */
export function bakeryMixedAttachedQuizExample(): BlockPyMountOptions {
    const readingAssignmentId = 701;
    const quizInstructions = JSON.stringify({
        settings: {
            readingId: readingAssignmentId,
            feedbackType: "IMMEDIATE",
            attemptLimit: 3,
        },
        questions: {
            countPatternGoal: {
                type: "multiple_choice_question",
                points: 1,
                body: "What does the **Count pattern** compute?",
                answers: [
                    "The number of items in a list",
                    "The sum of values in a list",
                    "A filtered list of values",
                ],
            },
            sumPatternPrediction: {
                type: "short_answer_question",
                points: 1,
                body: "What is printed?\n```python\ns = 0\nfor n in [4, 2, 6]:\n    s = s + n\nprint(s)\n```",
            },
            insideLoop: {
                type: "true_false_question",
                points: 1,
                body: "In Python, indentation determines whether a statement is inside a loop body.",
            },
        },
        pools: [],
    });

    const quizKey = JSON.stringify({
        countPatternGoal: "The number of items in a list",
        sumPatternPrediction: {
            correct_exact: ["12"],
            wrong_any: "Try adding each list value to the running total.",
        },
        insideLoop: "true",
    });

    return {
        user: {
            id: "42",
            courseId: "bakery-demo",
            name: "Bakery Learner",
        },
        activity: {
            id: "bakery-mixed-attached-6a2",
            name: "Bakery 6A2 Mixed Activity (Attached Quiz)",
            category: "homework",
            tasks: [
                {
                    id: String(readingAssignmentId),
                    name: "6A2) For Loop Patterns 1 Reading",
                    type: "reading",
                    instructions:
                        '## Many Loop Patterns\n\nIn Bakery, we use a few common loop templates:\n\n- **Count**: how many items are in a list\n- **Sum**: add all numbers together\n- **Accumulate**: combine values over time\n\n```python\ncount = 0\nfor item in ["Alpha", "Beta", "Gamma"]:\n    count = count + 1\nprint(count)\n```\n\nThis reading is directly attached to the next quiz.',
                },
                {
                    id: "702",
                    name: "6A2) For Loop Patterns 1 Quiz (Attached)",
                    type: "quiz",
                    instructions: quizInstructions,
                    onRun: quizKey,
                    policy: { require_previous: true },
                },
                {
                    id: "703",
                    name: "Bakery Python: Total Orders",
                    type: "blockpy",
                    instructions:
                        "Write Python code that computes the total of `orders` and prints **12**.",
                    startingCode:
                        "orders = [4, 2, 6]\ntotal = 0\n# TODO: accumulate total\nprint(total)\n",
                    onRun: [
                        "if '12' in student.output:",
                        "    set_success()",
                        "else:",
                        "    gently('Use a for loop to add each order into total.')",
                    ].join("\n"),
                    policy: { require_previous: true },
                },
                {
                    id: "704",
                    name: "Bakery TypeScript: Label Orders",
                    type: "typescript",
                    instructions:
                        "Use TypeScript to build labels for each order and print `Order #1, Order #2, Order #3`.",
                    startingCode: [
                        "const orders: number[] = [4, 2, 6];",
                        "const labels: string[] = [];",
                        "// TODO: fill labels with Order #1, Order #2, ...",
                        "console.log(labels.join(', '));",
                    ].join("\n"),
                    onRun: [
                        "if (student.output.indexOf('Order #1, Order #2, Order #3') !== -1) {",
                        "  set_success();",
                        "} else {",
                        "  gently('Use a loop and push labels like Order #1, Order #2, Order #3.');",
                        "}",
                    ].join("\n"),
                    policy: { require_previous: true },
                },
                {
                    id: "705",
                    name: "Bakery Python: Count High Orders",
                    type: "blockpy",
                    instructions:
                        "Count how many values in `orders` are at least 5 and print **2**.",
                    startingCode:
                        "orders = [4, 2, 6, 8]\ncount = 0\n# TODO: count orders >= 5\nprint(count)\n",
                    onRun: [
                        "if '2' in student.output:",
                        "    set_success()",
                        "else:",
                        "    gently('Increment count when an order is >= 5.')",
                    ].join("\n"),
                    policy: { require_previous: true },
                },
            ],
        },
    };
}
