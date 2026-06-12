// End-to-end flows for the Slice 6 task renderers (quiz, reading, explain,
// textbook), exercised through the real workspace harness with the offline
// transport simulating the server's grading round trips.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { resolveBlockPyConfig } from '../../../embed/config';
import { useWorkspace } from '../../useWorkspace';
import type { WorkspaceContextValue } from '../../useWorkspace';
import { WorkspaceProvider } from '../../WorkspaceProvider';
import { WorkspaceShell } from '../../WorkspaceShell';
import type { BlockPyActivityConfig } from '../../../types';

// The real editor panel pulls in Blockly, which needs DOM/canvas APIs that
// jsdom does not provide.
vi.mock('../../panels/EditorPanel', () => ({
  EditorPanel: () => <div>Mock editor surface</div>,
}));

// CodeMirror needs layout measurement APIs missing from jsdom.
vi.mock('../../../components/code-editor/CodeMirrorEditor', () => ({
  CodeMirrorEditor: ({ value }: { value: string }) => <pre>{value}</pre>,
}));

let workspace: WorkspaceContextValue;

function Probe() {
  const value = useWorkspace();
  useEffect(() => {
    workspace = value;
  }, [value]);
  return null;
}

function renderActivity(activity: BlockPyActivityConfig) {
  const config = resolveBlockPyConfig({
    user: { id: '7', courseId: 'course-tasks' },
    activity,
  });
  return render(
    <WorkspaceProvider config={config}>
      <Probe />
      <WorkspaceShell />
    </WorkspaceProvider>,
  );
}

function taskPanel() {
  return within(screen.getByRole('region', { name: 'Task' }));
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('QuizTask', () => {
  const QUIZ_INSTRUCTIONS = JSON.stringify({
    questions: {
      q1: {
        type: 'multiple_choice_question',
        body: 'What does a loop do?',
        points: 1,
        answers: ['Repeats a block', 'Runs once'],
      },
      q2: { type: 'true_false_question', body: 'Loops can be nested.', points: 1 },
      q3: {
        type: 'numerical_question',
        body: 'How many times does range(4) iterate?',
        points: 1,
        tolerance: 0,
      },
    },
    settings: { feedbackType: 'IMMEDIATE', attemptLimit: 2 },
    pools: [],
  });

  const QUIZ_ACTIVITY: BlockPyActivityConfig = {
    id: '60',
    name: 'Quiz Activity',
    category: 'homework',
    tasks: [
      {
        id: '1',
        name: 'Loop quiz',
        type: 'quiz',
        instructions: QUIZ_INSTRUCTIONS,
        onRun: JSON.stringify({ q1: 'Repeats a block', q2: 'true', q3: '4' }),
      },
    ],
  };

  it('runs a full attempt: start, answer, submit, graded feedback', async () => {
    const user = userEvent.setup();
    renderActivity(QUIZ_ACTIVITY);

    expect(taskPanel().getByText('This quiz has 3 questions. You have 2 attempts.')).toBeInTheDocument();
    await user.click(taskPanel().getByRole('button', { name: 'Start quiz' }));

    await user.click(screen.getByRole('radio', { name: 'Repeats a block' }));
    await user.click(screen.getByRole('radio', { name: 'True' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Your answer (number)' }), '4');
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));

    await waitFor(() => {
      expect(
        screen.getByText('You answered 3 of 3 graded questions correctly.'),
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText('Correct!')).toHaveLength(3);
    expect(workspace.activityStore.getState().statuses[1]).toBe('graded');
    expect(taskPanel().getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('marks wrong answers incorrect and the task complete, not graded', async () => {
    const user = userEvent.setup();
    renderActivity(QUIZ_ACTIVITY);

    await user.click(taskPanel().getByRole('button', { name: 'Start quiz' }));
    await user.click(screen.getByRole('radio', { name: 'Runs once' }));
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));

    await waitFor(() => {
      expect(
        screen.getByText('You answered 0 of 3 graded questions correctly.'),
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText('Incorrect.')).toHaveLength(3);
    expect(workspace.activityStore.getState().statuses[1]).toBe('complete');
  });

  it('stops offering attempts once the limit is reached', async () => {
    const user = userEvent.setup();
    renderActivity(QUIZ_ACTIVITY);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await user.click(
        taskPanel().getByRole('button', { name: attempt === 0 ? 'Start quiz' : 'Try again' }),
      );
      await user.click(screen.getByRole('button', { name: 'Submit quiz' }));
      await waitFor(() => {
        expect(
          screen.getByText('You answered 0 of 3 graded questions correctly.'),
        ).toBeInTheDocument();
      });
    }

    expect(taskPanel().queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(screen.getByText('No attempts remaining.')).toBeInTheDocument();
  });

  it('shows the raw content when the instructions are malformed', () => {
    renderActivity({
      ...QUIZ_ACTIVITY,
      tasks: [{ id: '1', name: 'Broken quiz', type: 'quiz', instructions: 'not json' }],
    });
    expect(
      screen.getByText('This quiz could not be loaded; the raw content is shown below.'),
    ).toBeInTheDocument();
    expect(screen.getByText('not json')).toBeInTheDocument();
  });
});

describe('ReadingTask', () => {
  const READING_ACTIVITY: BlockPyActivityConfig = {
    id: '61',
    name: 'Reading Activity',
    category: 'homework',
    tasks: [
      {
        id: '1',
        name: 'Loops reading',
        type: 'reading',
        instructions: '# Loops\n\nLoops **repeat** things.',
      },
      { id: '2', name: 'Practice', startingCode: '', policy: { require_previous: true } },
    ],
  };

  it('renders markdown content and unlocks gated tasks on mark-as-read', async () => {
    const user = userEvent.setup();
    renderActivity(READING_ACTIVITY);

    expect(taskPanel().getByRole('heading', { name: 'Loops', level: 1 })).toBeInTheDocument();
    const rail = within(screen.getByRole('navigation', { name: 'Activity tasks' }));
    expect(rail.getByRole('button', { name: /Practice/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Mark as read' }));

    await waitFor(() => {
      expect(screen.getByText('✓ You marked this as read.')).toBeInTheDocument();
    });
    expect(workspace.activityStore.getState().statuses[1]).toBe('graded');
    expect(rail.getByRole('button', { name: /Practice/ })).toBeEnabled();
  });
});

describe('ExplainTask', () => {
  const TARGET_CODE = 'total = 0\nfor x in [1, 2]:\n    total = total + x\nprint(total)';
  const EXPLAIN_ACTIVITY: BlockPyActivityConfig = {
    id: '62',
    name: 'Explain Activity',
    category: 'homework',
    tasks: [{ id: '1', name: 'Explain the loop', type: 'explain', startingCode: TARGET_CODE }],
  };

  it('adds annotations and submits them for manual review', async () => {
    const user = userEvent.setup();
    renderActivity(EXPLAIN_ACTIVITY);

    expect(
      taskPanel().getByText(
        (_, element) => element?.tagName === 'PRE' && element.textContent === TARGET_CODE,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();

    await user.clear(screen.getByRole('spinbutton', { name: 'Last line' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Last line' }), '2');
    await user.click(screen.getByRole('button', { name: 'Add explanation' }));

    const prose = screen.getByRole('textbox', { name: 'Explanation for lines 1–2' });
    await user.type(prose, 'Sets up the loop.');
    expect(prose).toHaveValue('Sets up the loop.');

    await user.click(screen.getByRole('button', { name: 'Submit for review' }));
    await waitFor(() => {
      expect(
        screen.getByText('✓ Submitted for review. Your instructor will grade this task.'),
      ).toBeInTheDocument();
    });
    expect(workspace.activityStore.getState().statuses[1]).toBe('complete');
    expect(prose).toBeDisabled();
  });

  it('rejects line ranges outside the target code', async () => {
    const user = userEvent.setup();
    renderActivity(EXPLAIN_ACTIVITY);

    await user.clear(screen.getByRole('spinbutton', { name: 'Last line' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Last line' }), '99');
    await user.click(screen.getByRole('button', { name: 'Add explanation' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a line range between 1 and 4.');
  });
});

describe('TextbookTask', () => {
  const BOOK = JSON.stringify({
    title: 'Python Book',
    content: '',
    children: [
      { title: 'Variables', content: '# Variables\n\nNames for values.' },
      { title: 'Practice', assignment_id: 2, content: 'Try the exercise.' },
      { title: 'Elsewhere', assignment_id: 99, content: 'Lives in another course.' },
    ],
  });

  const TEXTBOOK_ACTIVITY: BlockPyActivityConfig = {
    id: '63',
    name: 'Textbook Activity',
    category: 'homework',
    tasks: [
      { id: '1', name: 'Read the book', type: 'textbook', instructions: BOOK },
      { id: '2', name: 'Exercise', startingCode: '' },
    ],
  };

  it('navigates pages and opens referenced activities', async () => {
    const user = userEvent.setup();
    renderActivity(TEXTBOOK_ACTIVITY);

    const contents = within(screen.getByRole('navigation', { name: 'Textbook contents' }));
    expect(taskPanel().getByRole('heading', { name: 'Variables', level: 1 })).toBeInTheDocument();
    expect(contents.getByRole('button', { name: 'Variables' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(contents.getByRole('button', { name: 'Elsewhere' }));
    expect(
      screen.getByText(
        'This page references assignment 99, which is not part of the current activity.',
      ),
    ).toBeInTheDocument();

    await user.click(contents.getByRole('button', { name: 'Practice' }));
    await user.click(screen.getByRole('button', { name: 'Open this activity' }));
    expect(workspace.activityStore.getState().focusedTaskId).toBe(2);
  });

  it('shows a fallback when the textbook JSON is malformed', () => {
    renderActivity({
      ...TEXTBOOK_ACTIVITY,
      tasks: [{ id: '1', name: 'Broken book', type: 'textbook', instructions: '{oops' }],
    });
    expect(screen.getByText('This textbook could not be loaded.')).toBeInTheDocument();
  });
});
