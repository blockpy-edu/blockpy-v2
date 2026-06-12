import './index.css';
import { mountBlockPy } from './mount';
import type { BlockPyMountHandle } from './mount';
import type { BlockPyMountOptions } from './types';

declare global {
  interface Window {
    BlockPy?: {
      mount: (node: Element, options?: BlockPyMountOptions) => BlockPyMountHandle;
    };
    BLOCKPY_INITIAL_CONFIG?: BlockPyMountOptions;
  }
}

window.BlockPy = {
  ...(window.BlockPy ?? {}),
  mount: mountBlockPy,
};

/** Dev-only multi-task demo: open /?demo=activity for the headline
 * reading → quiz → code → reflection sequence (docs/architecture/08 Slice 6). */
function demoOptions(): BlockPyMountOptions | undefined {
  if (!import.meta.env.DEV) {
    return undefined;
  }
  if (new URLSearchParams(window.location.search).get('demo') !== 'activity') {
    return undefined;
  }
  const quizInstructions = JSON.stringify({
    questions: {
      q1: {
        type: 'multiple_choice_question',
        body: 'What does a `for` loop do?',
        points: 1,
        answers: ['Repeats a block for every item', 'Defines a function', 'Imports a module'],
      },
      q2: {
        type: 'true_false_question',
        body: 'A `while` loop checks its condition **before** every iteration.',
        points: 1,
      },
      q3: {
        type: 'fill_in_multiple_blanks_question',
        body: 'Iterating over range(3) yields 0, 1, and [last].',
        points: 1,
      },
      q4: {
        type: 'numerical_question',
        body: 'How many times does `for i in range(4):` run its body?',
        points: 1,
        tolerance: 0,
      },
    },
    settings: { feedbackType: 'IMMEDIATE', attemptLimit: 3 },
    pools: [],
  });
  const quizKey = JSON.stringify({
    q1: 'Repeats a block for every item',
    q2: 'true',
    q3: { last: '2' },
    q4: '4',
  });
  return {
    user: { id: '1', courseId: 'demo' },
    activity: {
      id: '88',
      name: 'Week 3: Loops',
      category: 'homework',
      tasks: [
        {
          id: '1',
          name: 'Reading: loops',
          type: 'reading',
          instructions:
            '# Loops\n\nLoops **repeat** a block of code.\n\n- A `for` loop visits every item in a sequence.\n- A `while` loop repeats while a condition holds.\n\n```python\nfor i in range(3):\n    print(i)\n```\n\nRead this page, then mark it as read to continue.',
        },
        {
          id: '2',
          name: 'Quiz: loop basics',
          type: 'quiz',
          instructions: quizInstructions,
          onRun: quizKey,
          policy: { require_previous: true },
        },
        {
          id: '3',
          name: 'Code: print 5',
          instructions: 'Use what you learned: **print the number 5**.',
          startingCode: '',
          onRun:
            'if "5" in student.output:\n    set_success()\nelse:\n    gently("Print the number 5.")\n',
          policy: { require_previous: true },
        },
        {
          id: '4',
          name: 'Reflection: explain the loop',
          type: 'explain',
          startingCode: 'total = 0\nfor n in range(1, 11):\n    total = total + n\nprint(total)\n',
          policy: { require_previous: true },
        },
      ],
    },
  };
}

const rootElement = document.getElementById('root');
if (rootElement) {
  mountBlockPy(rootElement, demoOptions() ?? window.BLOCKPY_INITIAL_CONFIG);
}
