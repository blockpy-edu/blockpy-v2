import { listVisible } from '../../vfs/vfs';
import { dirtyKey } from '../../vfs/vfsStore';
import { useApi } from '../../api/useApi';
import { useVfsActions, useVfsState, useWorkspace } from '../useWorkspace';
import styles from './FilesPanel.module.css';
import type { Namespace, VfsFile } from '../../vfs/types';

const SECTION_ORDER: readonly Namespace[] = [
  'student',
  'starting',
  'readOnly',
  'generated',
  'instructor',
  'hidden',
  'secret',
];

const SECTION_LABELS: Record<Namespace, string> = {
  student: 'Your files',
  starting: 'Starting files',
  readOnly: 'Provided files',
  generated: 'Generated files',
  instructor: 'Instructor files',
  hidden: 'Hidden files',
  secret: 'Secret files',
};

/** Namespaces the current viewer cannot edit get a lock badge. */
const LOCKED_FOR_STUDENT: ReadonlySet<Namespace> = new Set(['starting', 'readOnly', 'generated']);

/**
 * The file tree Resource panel (docs/architecture/04 §6): namespaces render
 * as sections; students only ever receive their visible namespaces because
 * filtering happens in the VFS itself.
 */
export function FilesPanel() {
  const { vfsRole } = useWorkspace();
  const files = useVfsState((state) => state.files);
  const activeFileName = useVfsState((state) => state.activeFileName);
  const dirty = useVfsState((state) => state.dirty);
  const { setActiveFile, resetToStarting } = useVfsActions();
  const { events } = useApi();

  const visible = listVisible(files, vfsRole);
  const sections = SECTION_ORDER.map((namespace) => ({
    namespace,
    files: visible.filter((file) => file.namespace === namespace),
  })).filter((section) => section.files.length > 0);

  const handleReset = () => {
    resetToStarting();
    events.log({
      event_type: 'X-File.Reset',
      file_path: 'answer.py',
      category: 'file',
      label: '',
      message: '',
    });
  };

  return (
    <div className={styles.panel}>
      <nav aria-label="Files">
        {sections.map((section) => (
          <section key={section.namespace} className={styles.section}>
            <h3 className={styles.sectionTitle}>{SECTION_LABELS[section.namespace]}</h3>
            <ul className={styles.fileList}>
              {section.files.map((file) => (
                <FileRow
                  key={`${file.namespace}:${file.name}`}
                  file={file}
                  active={file.name === activeFileName}
                  isDirty={dirtyKey(file) in dirty}
                  locked={vfsRole === 'student' && LOCKED_FOR_STUDENT.has(file.namespace)}
                  onOpen={() => setActiveFile(file.name)}
                />
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <button type="button" className={styles.resetButton} onClick={handleReset}>
        Reset to starting code
      </button>
    </div>
  );
}

interface FileRowProps {
  file: VfsFile;
  active: boolean;
  isDirty: boolean;
  locked: boolean;
  onOpen: () => void;
}

function FileRow({ file, active, isDirty, locked, onOpen }: FileRowProps) {
  return (
    <li>
      <button
        type="button"
        className={active ? `${styles.fileButton} ${styles.fileButtonActive}` : styles.fileButton}
        aria-current={active ? 'true' : undefined}
        onClick={onOpen}
      >
        <span className={styles.fileName}>{file.name}</span>
        {locked ? (
          <span className={styles.lockBadge} role="img" aria-label="Read-only">
            🔒
          </span>
        ) : null}
        {isDirty ? (
          <span className={styles.dirtyDot} role="img" aria-label="Unsaved changes" />
        ) : null}
      </button>
    </li>
  );
}
