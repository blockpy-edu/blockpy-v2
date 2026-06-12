import type { ComponentType } from 'react';
import type { PanelId, PanelKind } from '../layout/types';
import { ConsolePanel } from './ConsolePanel';
import { EditorPanel } from './EditorPanel';
import { FeedbackPanel } from './FeedbackPanel';
import { FilesPanel } from './FilesPanel';
import { PlaceholderPanel } from './PlaceholderPanel';
import { TaskPanel } from './TaskPanel';

export interface PanelDescriptor {
  id: PanelId;
  kind: PanelKind;
  title: string;
  Component: ComponentType;
}

function placeholder(name: string, description: string): ComponentType {
  return function Placeholder() {
    return <PlaceholderPanel name={name} description={description} />;
  };
}

export const PANEL_REGISTRY: Record<PanelId, PanelDescriptor> = {
  task: {
    id: 'task',
    kind: 'task',
    title: 'Task',
    Component: TaskPanel,
  },
  instructions: {
    id: 'instructions',
    kind: 'resource',
    title: 'Instructions',
    Component: placeholder('Instructions', 'Assignment instructions and specifications.'),
  },
  files: {
    id: 'files',
    kind: 'resource',
    title: 'Files',
    Component: FilesPanel,
  },
  editor: {
    id: 'editor',
    kind: 'tool',
    title: 'Editor',
    Component: EditorPanel,
  },
  console: {
    id: 'console',
    kind: 'tool',
    title: 'Console',
    Component: ConsolePanel,
  },
  feedback: {
    id: 'feedback',
    kind: 'context',
    title: 'Feedback',
    Component: FeedbackPanel,
  },
  history: {
    id: 'history',
    kind: 'tool',
    title: 'History',
    Component: placeholder('History', 'Past submission snapshots and diffs.'),
  },
  trace: {
    id: 'trace',
    kind: 'context',
    title: 'Trace',
    Component: placeholder('Trace', 'Step-by-step execution trace and coverage.'),
  },
};

export function getPanelDescriptor(panelId: PanelId): PanelDescriptor {
  return PANEL_REGISTRY[panelId];
}
