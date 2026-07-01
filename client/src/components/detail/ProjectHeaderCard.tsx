import { useState } from 'react';
import type { ProjectDetail, ProjectPatch } from '../../types';
import { Button, IconButton, Icon, Modal } from '../ui';
import { EditableText } from './EditableText';

interface ProjectHeaderCardProps {
  project: ProjectDetail;
  onPatch: (patch: ProjectPatch) => void;
  onDelete: () => void | Promise<void>;
}

export function ProjectHeaderCard({ project, onPatch, onDelete }: ProjectHeaderCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      // If deletion succeeded the page navigates away and this unmounts; on
      // failure we re-enable the button so the user can retry.
      setDeleting(false);
    }
  };

  return (
    <section className="card detail-header">
      <div className="detail-header__top">
        <EditableText
          tag="span"
          className="detail-header__area upper"
          inputClassName="detail-area-input"
          value={project.area}
          emptyText="Add research area…"
          ariaLabel="Research area"
          onCommit={(area) => onPatch({ area })}
        />
        <div className="row gap-6">
          <IconButton
            icon="pin"
            label={project.pinned ? 'Unpin project' : 'Pin project'}
            className={`detail-pin ${project.pinned ? 'is-pinned' : ''}`}
            onClick={() => onPatch({ pinned: !project.pinned })}
          />
          <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <EditableText
        tag="h1"
        className="detail-title"
        inputClassName="detail-title-input"
        value={project.name}
        emptyText="Untitled project"
        ariaLabel="Project name"
        trimOnCommit
        onCommit={(name) => name && onPatch({ name })}
      />

      <EditableText
        tag="p"
        multiline
        className="detail-desc"
        value={project.description}
        emptyText="Add a short description of this line of work…"
        ariaLabel="Project description"
        trimOnCommit={false}
        onCommit={(description) => onPatch({ description })}
      />

      <Modal
        open={confirmOpen}
        title="Delete project"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" icon="trash" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete project'}
            </Button>
          </>
        }
      >
        <p className="row gap-8" style={{ alignItems: 'flex-start' }}>
          <Icon name="archive" size={18} style={{ marginTop: 2, color: 'var(--red)' }} />
          <span>
            Permanently delete <strong className="serif">{project.name || 'this project'}</strong>{' '}
            along with all of its tasks and progress log entries? This cannot be undone.
          </span>
        </p>
      </Modal>
    </section>
  );
}
