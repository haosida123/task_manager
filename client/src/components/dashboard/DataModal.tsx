import { useEffect, useRef, useState } from 'react';
import { Modal, Button, Icon } from '../ui';
import { api } from '../../api';
import type { BackupData, ImportResult, FolderStatus } from '../../types';

interface DataModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful import so the dashboard can reload. */
  onImported: () => void;
  /** Called after an on-demand backup so the source switcher can refresh. */
  onBackedUp?: () => void;
}

// Validate that a parsed object looks like a restorable backup.
function isBackup(x: unknown): x is BackupData {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return Array.isArray(b.projects) && Array.isArray(b.tasks) && Array.isArray(b.updates);
}

export function DataModal({ open, onClose, onImported, onBackedUp }: DataModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<BackupData | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupErr, setBackupErr] = useState<string | null>(null);

  // Backup-folder setting (persisted in the database).
  const [dirDraft, setDirDraft] = useState('');
  const [savedDir, setSavedDir] = useState<string | null>(null);
  const [folder, setFolder] = useState<FolderStatus | null>(null);
  const [savingDir, setSavingDir] = useState(false);
  const [dirMsg, setDirMsg] = useState<string | null>(null);
  const [dirErr, setDirErr] = useState<string | null>(null);

  // Reset everything whenever the modal is (re)opened, and load current settings.
  useEffect(() => {
    if (!open) return;
    setParsed(null);
    setFileName('');
    setParseErr(null);
    setImporting(false);
    setImportErr(null);
    setResult(null);
    setBackingUp(false);
    setBackupMsg(null);
    setBackupErr(null);
    setDirMsg(null);
    setDirErr(null);
    if (fileRef.current) fileRef.current.value = '';
    void api
      .getSettings()
      .then((s) => {
        setSavedDir(s.backupDir);
        setDirDraft(s.backupDir ?? '');
        setFolder(s.folder);
      })
      .catch(() => {
        /* settings are optional */
      });
  }, [open]);

  async function saveDir() {
    setSavingDir(true);
    setDirErr(null);
    setDirMsg(null);
    try {
      const res = await api.updateSettings({ backupDir: dirDraft.trim() || null });
      setSavedDir(res.backupDir);
      setFolder(res.folder);
      setDirMsg(res.backupDir ? 'Backup folder saved.' : 'Backup folder cleared.');
    } catch (e) {
      setDirErr(e instanceof Error ? e.message : 'Could not save the backup folder.');
    } finally {
      setSavingDir(false);
    }
  }

  async function backupNow() {
    setBackingUp(true);
    setBackupErr(null);
    setBackupMsg(null);
    try {
      const res = await api.createBackup();
      let msg = `Snapshot saved — “${res.file}”. It’s now in the Ledger switcher.`;
      if (res.external) {
        msg += res.external.ok
          ? ' A copy was also written to your backup folder.'
          : ` (Couldn’t write to the backup folder: ${res.external.error})`;
      }
      setBackupMsg(msg);
      onBackedUp?.();
    } catch (e) {
      setBackupErr(e instanceof Error ? e.message : 'Backup failed.');
    } finally {
      setBackingUp(false);
    }
  }

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
          <h4 className="data-sec__title serif">Back up your data</h4>
          <p className="muted small data-sec__hint">
            <strong>Back up now</strong> saves a snapshot on this machine (it appears in the
            Ledger switcher and can be restored in-app). <strong>Download</strong> gives you a
            single JSON file to archive or move to cloud storage.
          </p>

          <div className="data-loc">
            <label className="data-loc__label" htmlFor="backup-dir">
              Backup folder (this computer)
            </label>
            <div className="row gap-8">
              <input
                id="backup-dir"
                className="input grow"
                placeholder="e.g. /mnt/c/Users/you/OneDrive/Backups"
                value={dirDraft}
                onChange={(e) => setDirDraft(e.target.value)}
                spellCheck={false}
              />
              <Button icon="check" disabled={savingDir} onClick={() => void saveDir()}>
                {savingDir ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <p className="tiny muted data-loc__hint">
              On WSL, use a <span className="mono">/mnt/c/…</span> path. Point it at a synced
              OneDrive/Drive folder and every “Back up now” also copies there — syncing to the
              cloud automatically.
            </p>
            {savedDir && folder && (
              <p
                className={`tiny data-loc__status${
                  folder.writable ? ' is-ok' : ' is-warn'
                }`}
              >
                <Icon name={folder.writable ? 'check' : 'flag'} size={12} />{' '}
                {folder.writable
                  ? 'Folder is ready — backups will sync here.'
                  : folder.exists
                    ? 'Folder found but not writable — check permissions.'
                    : 'Folder not reachable right now (it’ll be created on backup if possible).'}
              </p>
            )}
            {dirMsg && <p className="tiny data-ok">{dirMsg}</p>}
            {dirErr && <p className="tiny data-err">{dirErr}</p>}
          </div>

          <div className="row gap-8 data-actions">
            <Button
              variant="primary"
              icon="database"
              disabled={backingUp}
              onClick={() => void backupNow()}
            >
              {backingUp ? 'Backing up…' : 'Back up now'}
            </Button>
            <a className="btn" href={api.backupUrl} download>
              <Icon name="download" size={15} /> Download (.json)
            </a>
          </div>
          {backupMsg && (
            <p className="data-ok">
              <Icon name="check" size={14} /> {backupMsg}
            </p>
          )}
          {backupErr && <p className="data-err">{backupErr}</p>}
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
