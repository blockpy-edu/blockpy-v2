import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { resolveBlockPyConfig } from '../../embed/config';
import { useWorkspace } from '../useWorkspace';
import type { WorkspaceContextValue } from '../useWorkspace';
import { WorkspaceProvider } from '../WorkspaceProvider';
import { WorkspaceShell } from '../WorkspaceShell';
import { MAIN_STUDENT_FILE, readFile } from '../../vfs/vfs';
import type { BlockPyActivityConfig } from '../../types';

// The real editor panel pulls in Blockly, which needs DOM/canvas APIs that
// jsdom does not provide.
vi.mock('../panels/EditorPanel', () => ({
  EditorPanel: () => <div>Mock editor surface</div>,
}));

let workspace: WorkspaceContextValue;

function Probe() {
  const value = useWorkspace();
  useEffect(() => {
    workspace = value;
  }, [value]);
  return null;
}

const HOMEWORK: BlockPyActivityConfig = {
  id: '88',
  name: 'Week 3 Homework',
  category: 'homework',
  tasks: [
    { id: '1', name: 'Warmup', startingCode: 'a = 1\n' },
    { id: '2', name: 'Reading time', type: 'reading', instructions: 'Read all about loops.' },
    {
      id: '3',
      name: 'Challenge',
      startingCode: 'c = 3\n',
      policy: { require_previous: true },
    },
  ],
};

function renderActivity(activity: BlockPyActivityConfig | null = HOMEWORK) {
  const config = resolveBlockPyConfig({
    user: { id: '7', courseId: 'course-activity' },
    activity,
  });
  return render(
    <WorkspaceProvider config={config}>
      <Probe />
      <WorkspaceShell />
    </WorkspaceProvider>,
  );
}

function railButton(name: RegExp) {
  const rail = screen.getByRole('navigation', { name: 'Activity tasks' });
  return within(rail).getByRole('button', { name });
}

describe('activity navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('hides the rail for single-task mounts', () => {
    renderActivity(null);
    expect(screen.queryByRole('navigation', { name: 'Activity tasks' })).toBeNull();
  });

  it('shows every task with the focused one marked as the current step', () => {
    renderActivity();
    expect(railButton(/Warmup/)).toHaveAttribute('aria-current', 'step');
    expect(railButton(/Reading time/)).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Week 3 Homework')).toBeInTheDocument();
  });

  it('switches the focused task, editor files, and deep link on click', async () => {
    const user = userEvent.setup();
    renderActivity();

    await user.click(railButton(/Reading time/));

    expect(workspace.activityStore.getState().focusedTaskId).toBe(2);
    expect(window.location.hash).toBe('#task=2');
    const taskPanel = screen.getByRole('region', { name: 'Task' });
    expect(within(taskPanel).getByRole('heading', { name: 'Reading time' })).toBeInTheDocument();
    expect(within(taskPanel).getByText('Read all about loops.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Layout'), 'classic');
    await user.click(railButton(/Warmup/));
    const answer = readFile(workspace.vfsStore.getState().files, MAIN_STUDENT_FILE, 'student');
    expect(answer?.content).toBe('a = 1\n');
  });

  it('disables policy-gated tasks until earlier tasks are finished', async () => {
    const user = userEvent.setup();
    renderActivity();

    const challenge = railButton(/Challenge/);
    expect(challenge).toBeDisabled();
    expect(challenge).toHaveAttribute('title', 'Complete “Warmup” first.');

    act(() => {
      workspace.activityStore.getState().setStatus(1, 'complete');
      workspace.activityStore.getState().setStatus(2, 'graded');
    });
    await user.click(railButton(/Challenge/));
    expect(workspace.activityStore.getState().focusedTaskId).toBe(3);
  });

  it('focuses the task named in the initial hash deep link', () => {
    window.location.hash = '#task=2';
    renderActivity();
    expect(workspace.activityStore.getState().focusedTaskId).toBe(2);
  });

  it('auto-switches the layout preset for the focused task kind', async () => {
    const user = userEvent.setup();
    renderActivity();
    expect(screen.getByLabelText('Layout')).toHaveValue('classic');

    await user.click(railButton(/Reading time/));
    expect(screen.getByLabelText('Layout')).toHaveValue('reading');

    await user.click(railButton(/Warmup/));
    expect(screen.getByLabelText('Layout')).toHaveValue('classic');
  });

  it('stops auto-switching once the user pins a preset', async () => {
    const user = userEvent.setup();
    renderActivity();

    await user.selectOptions(screen.getByLabelText('Layout'), 'sideBySide');
    await user.click(railButton(/Reading time/));

    expect(screen.getByLabelText('Layout')).toHaveValue('sideBySide');
  });
});
