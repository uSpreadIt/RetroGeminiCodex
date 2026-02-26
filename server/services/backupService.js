import fs from 'fs';
import { join } from 'path';
import { gzipSync, gunzipSync } from 'zlib';
import { randomBytes } from 'crypto';

const createBackupService = ({ dataStore, logService }) => {
  const BACKUP_DIR = process.env.BACKUP_DIR || '/data/backups';
  const BACKUP_ENABLED = process.env.BACKUP_ENABLED !== 'false';
  const BACKUP_INTERVAL_HOURS = Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS) || 24);
  const BACKUP_MAX_COUNT = Math.max(1, Number(process.env.BACKUP_MAX_COUNT) || 7);
  const BACKUP_ON_STARTUP = process.env.BACKUP_ON_STARTUP !== 'false';

  const MANIFEST_FILE = 'backups-manifest.json';
  const LOCK_FILE = 'backups.lock';
  const STARTUP_DEDUP_MS = 5 * 60 * 1000; // 5 minutes
  const LOCK_STALE_MS = 5 * 60 * 1000; // Consider lock stale after 5 minutes

  let schedulerInterval = null;
  let backupInProgress = false;

  // ---------------------------------------------------------------------------
  // Directory & manifest helpers
  // ---------------------------------------------------------------------------

  const ensureBackupDir = () => {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  };

  const manifestPath = () => join(BACKUP_DIR, MANIFEST_FILE);
  const lockPath = () => join(BACKUP_DIR, LOCK_FILE);

  const readManifest = () => {
    try {
      const raw = fs.readFileSync(manifestPath(), 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && Array.isArray(parsed.backups)) {
        return parsed;
      }
    } catch {
      // Missing or corrupt manifest — start fresh
    }
    return { version: 1, backups: [] };
  };

  const writeManifest = (manifest) => {
    const tmpPath = manifestPath() + `.tmp.${process.pid}`;
    fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf8');
    fs.renameSync(tmpPath, manifestPath());
  };

  // ---------------------------------------------------------------------------
  // File-based lock for multi-pod coordination
  // ---------------------------------------------------------------------------

  const acquireLock = () => {
    try {
      const lockFile = lockPath();
      // Check for stale lock
      if (fs.existsSync(lockFile)) {
        try {
          const stat = fs.statSync(lockFile);
          if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
            fs.unlinkSync(lockFile);
          } else {
            return false;
          }
        } catch {
          return false;
        }
      }
      // Attempt exclusive file creation
      fs.writeFileSync(lockFile, String(process.pid), { flag: 'wx' });
      return true;
    } catch {
      return false;
    }
  };

  const releaseLock = () => {
    try {
      fs.unlinkSync(lockPath());
    } catch {
      // Lock already removed — safe to ignore
    }
  };

  // ---------------------------------------------------------------------------
  // Core backup operations
  // ---------------------------------------------------------------------------

  const generateId = () => {
    return `backup_${Date.now()}_${randomBytes(4).toString('hex')}`;
  };

  const createBackup = async (type, label) => {
    if (backupInProgress) {
      return null;
    }

    ensureBackupDir();

    if (!acquireLock()) {
      console.info('[Backup] Another process is creating a backup, skipping');
      return null;
    }

    backupInProgress = true;

    try {
      const currentData = await dataStore.loadPersistedData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `retrogemini-backup-${timestamp}.json.gz`;
      const filePath = join(BACKUP_DIR, filename);

      const jsonData = JSON.stringify(currentData, null, 2);
      const compressed = gzipSync(Buffer.from(jsonData, 'utf8'));

      fs.writeFileSync(filePath, compressed);

      const teamCount = currentData.teams?.length || 0;
      const entry = {
        id: generateId(),
        filename,
        type,
        label: label || undefined,
        createdAt: new Date().toISOString(),
        sizeBytes: compressed.length,
        teamCount,
        protected: false
      };

      const manifest = readManifest();
      manifest.backups.push(entry);
      writeManifest(manifest);

      console.info(`[Backup] Created ${type} backup: ${filename} (${teamCount} team(s), ${(compressed.length / 1024).toFixed(1)} KB)`);

      if (type === 'auto' || type === 'startup') {
        enforceRetention();
      }

      return entry;
    } catch (err) {
      console.error('[Backup] Failed to create backup', err);
      return null;
    } finally {
      backupInProgress = false;
      releaseLock();
    }
  };

  const enforceRetention = () => {
    try {
      const manifest = readManifest();

      // Only count non-protected auto/startup backups toward the limit
      const autoBackups = manifest.backups
        .filter((b) => !b.protected && (b.type === 'auto' || b.type === 'startup'))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const toRemove = autoBackups.slice(0, Math.max(0, autoBackups.length - BACKUP_MAX_COUNT));

      for (const entry of toRemove) {
        const filePath = join(BACKUP_DIR, entry.filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn(`[Backup] Failed to delete old backup file ${entry.filename}`, err);
        }
        manifest.backups = manifest.backups.filter((b) => b.id !== entry.id);
      }

      if (toRemove.length > 0) {
        writeManifest(manifest);
        console.info(`[Backup] Retention: removed ${toRemove.length} old backup(s)`);
      }
    } catch (err) {
      console.error('[Backup] Retention cleanup failed', err);
    }
  };

  const listBackups = () => {
    ensureBackupDir();
    const manifest = readManifest();
    return manifest.backups.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const getBackupConfig = () => ({
    enabled: BACKUP_ENABLED,
    intervalHours: BACKUP_INTERVAL_HOURS,
    maxCount: BACKUP_MAX_COUNT,
    backupDir: BACKUP_DIR,
    onStartup: BACKUP_ON_STARTUP
  });

  const getBackupPath = (backupId) => {
    const manifest = readManifest();
    const entry = manifest.backups.find((b) => b.id === backupId);
    if (!entry) return null;
    const filePath = join(BACKUP_DIR, entry.filename);
    if (!fs.existsSync(filePath)) return null;
    return { filePath, filename: entry.filename };
  };

  const deleteBackup = (backupId) => {
    const manifest = readManifest();
    const entry = manifest.backups.find((b) => b.id === backupId);
    if (!entry) return false;

    const filePath = join(BACKUP_DIR, entry.filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`[Backup] Failed to delete file ${entry.filename}`, err);
    }

    manifest.backups = manifest.backups.filter((b) => b.id !== entry.id);
    writeManifest(manifest);
    console.info(`[Backup] Deleted backup: ${entry.filename}`);
    return true;
  };

  const restoreFromBackup = async (backupId) => {
    const manifest = readManifest();
    const entry = manifest.backups.find((b) => b.id === backupId);
    if (!entry) {
      throw new Error('Backup not found');
    }

    const filePath = join(BACKUP_DIR, entry.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('Backup file missing');
    }

    const compressed = fs.readFileSync(filePath);
    const jsonData = gunzipSync(compressed).toString('utf8');
    const data = JSON.parse(jsonData);

    await dataStore.savePersistedData(data);
    console.info(`[Backup] Restored from backup: ${entry.filename}`);
    return entry;
  };

  const updateBackup = (backupId, updates) => {
    const manifest = readManifest();
    const entry = manifest.backups.find((b) => b.id === backupId);
    if (!entry) return null;

    if (updates.label !== undefined) {
      entry.label = updates.label || undefined;
    }
    if (updates.protected !== undefined) {
      entry.protected = !!updates.protected;
    }

    writeManifest(manifest);
    return entry;
  };

  // ---------------------------------------------------------------------------
  // Scheduler
  // ---------------------------------------------------------------------------

  const startScheduler = () => {
    if (!BACKUP_ENABLED) {
      console.info('[Backup] Automatic backups disabled (BACKUP_ENABLED=false)');
      return;
    }

    const intervalMs = BACKUP_INTERVAL_HOURS * 60 * 60 * 1000;
    schedulerInterval = setInterval(async () => {
      await createBackup('auto');
    }, intervalMs);

    console.info(`[Backup] Scheduler started: every ${BACKUP_INTERVAL_HOURS}h, max ${BACKUP_MAX_COUNT} backups, dir: ${BACKUP_DIR}`);
  };

  const stopScheduler = () => {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Startup backup (deduplicated)
  // ---------------------------------------------------------------------------

  const createStartupBackup = async () => {
    if (!BACKUP_ENABLED || !BACKUP_ON_STARTUP) {
      return null;
    }

    ensureBackupDir();

    // Deduplicate: skip if a startup backup was created within the last 5 minutes
    const manifest = readManifest();
    const recentStartup = manifest.backups.find(
      (b) => b.type === 'startup' && Date.now() - new Date(b.createdAt).getTime() < STARTUP_DEDUP_MS
    );

    if (recentStartup) {
      console.info('[Backup] Recent startup backup exists, skipping');
      return null;
    }

    return await createBackup('startup', 'Server startup');
  };

  return {
    createBackup,
    listBackups,
    getBackupConfig,
    getBackupPath,
    deleteBackup,
    restoreFromBackup,
    updateBackup,
    startScheduler,
    stopScheduler,
    createStartupBackup
  };
};

export { createBackupService };
