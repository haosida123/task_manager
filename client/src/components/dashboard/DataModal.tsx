import { useEffect, useRef, useState } from 'react';
import { Modal, Button, Icon } from '../ui';
import { api } from '../../api';
import type { BackupData, ImportResult } from '../../types';

interface DataModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful import so the dashboard can reload. */
  onImported: () => void;
}

// Validate that a parsed object looks like a restorable backup.
function isBackup(x: unknown): x is BackupData {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return Array.isArray(b.projects) && Array.isArray(b.tasks) && Array.isArray(b.updates);
}

export function DataModal({ open, onClose, onImported }: DataModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<BackupData | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Reset everything whenever the modal is (re)opened.
  useEffect(() => {
    if (!open) return;
    setParsed(null);
    setFileName('');
    setParseErr(null);
    setImporting(false);
    setImportErr(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [open]);

  async function onPickFile(file: File) {
    setParseErr(null);
    setImportErr(null);
    setResult(null);
    setParsed(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!isBackup(json)) {
        setParseErr('This file doesn’t look like a Research Ledger backup (missing projects / tasks / updates).');
        return;
      }
      setParsed(json);
    } catch {
      setParseErr('Could not read that file — is it a valid .json backup?');
    }
  }

  async function confirmImport() {
    if (!parsed) return;
    setImporting(true);
    setImportErr(null);
    try {
      const res = await api.importData(parsed);
      setResult(res);
      onImported();
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open={open} title="Backup & restore" onClose={onClose} width={560}>
      <div className="data-modal">
        <section className="data-sec">
          <h4 className="data-sec__title serif">Export a backup</h4>
          <p className="muted small data-sec__hint">
            Download the complete ledger — every project, task, and log entry — as a single
            JSON file you can archive or move to another machine.
          </p>
          <a className="btn btn--primary" href={api.backupUrl} download>
            <Icon name="download" size={15} /> Download backup (.json)
          </a>
        </section>

        <hr className="hairline" />

        <section className="data-sec">
          <h4 className="data-sec__title serif">Restore from a backup</h4>
          <p className="muted small data-sec__hint">
            Import a previously downloaded backup. This <strong>replaces all current data</strong>.
            A snapshot of your current data is saved automatically first, so it can be undone.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
            }}
          />
          <Button icon="upload" onClick={() => fileRef.current?.click()}>
            Choose backup file…
          </Button>

          {fileName && !parseErr && parsed && !result && (
            <div className="data-confirm">
              <p className="small">
                <span className="mono">{fileName}</span> — {parsed.projects.length} projects,{' '}
                {parsed.tasks.length} tasks, {parsed.updates.length} log entries.
              </p>
              <p className="tiny data-confirm__warn">
                Replacing all current data cannot be undone from here (restore the auto-snapshot
                on disk if needed).
              </p>
              <div className="row gap-8">
                <Button variant="danger" icon="reset" disabled={importing} onClick={() => void confirmImport()}>
                  {importing ? 'Replacing…' : 'Replace all data'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setParsed(null);
                    setFileName('');
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {parseErr && <p className="data-err">{parseErr}</p>}
          {importErr && <p className="data-err">{importErr}</p>}
          {result && (
            <p className="data-ok">
              <Icon name="check" size={14} /> Imported {result.projects} projects, {result.tasks}{' '}
              tasks, {result.updates} log entries.
            </p>
          )}
        </section>

        <hr className="hairline" />

        <p className="tiny faint data-note">
          Automatic local backups are kept in <span className="mono">server/data/backups/</span>{' '}
          (a daily snapshot plus one taken before every restore).
        </p>
      </div>
    </Modal>
  );
}
