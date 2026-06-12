// Layout system types (docs/architecture/02 §3).
// A LayoutPreset is data, not JSX: a recursive tree of split regions whose
// leaves reference panels by id.

export type PanelId =
  | 'task'
  | 'instructions'
  | 'files'
  | 'editor'
  | 'console'
  | 'feedback'
  | 'history'
  | 'trace';

export type PanelKind = 'task' | 'resource' | 'tool' | 'context';

export type SplitDirection = 'row' | 'column';

export interface PanelNode {
  kind: 'panel';
  panelId: PanelId;
}

export interface SplitNode {
  kind: 'split';
  direction: SplitDirection;
  /** Percentages summing to 100, one per child. */
  sizes: number[];
  children: RegionNode[];
}

export type RegionNode = PanelNode | SplitNode;

export type LayoutPresetId =
  | 'classic'
  | 'reading'
  | 'quiz'
  | 'sideBySide'
  | 'instructor'
  | 'stacked';

export interface LayoutPreset {
  id: LayoutPresetId;
  label: string;
  regions: RegionNode;
}

/** Minimum size (in %) any pane may be resized to. */
export const MIN_PANE_PERCENT = 20;
