import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { join } from 'path';
import { gunzipSync } from 'zlib';
import os from 'os';

// Dynamic import to allow env var mocking
let createBackupService: typeof import('../server/services/backupService').createBackupService;

const mockPersistedData = {
  teams: [
    { id: 'team-1', name: 'Alpha', members: [] },
    { id: 'team-2', name: 'Beta', members: [] }
  ],
  meta: { revision: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  resetTokens: [],
  orphanedFeedbacks: []
};

const createMockDataStore = () => ({
  loadPersistedData: vi.fn().mockResolvedValue(mockPersistedData),
  savePersistedData: vi.fn().mockResolvedValue(mockPersistedData)
});

const createMockLogService = () => ({
  addServerLog: vi.fn()
});

describe('Backup Service', () => {
  let backupDir: string;
  let dataStore: ReturnType<typeof createMockDataStore>;
  let logService: ReturnType<typeof createMockLogService>;

  beforeEach(async () => {
    backupDir = join(os.tmpdir(), `retro-backup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(backupDir, { recursive: true });

    process.env.BACKUP_DIR = backupDir;
    process.env.BACKUP_ENABLED = 'true';
    process.env.BACKUP_INTERVAL_HOURS = '24';
    process.env.BACKUP_MAX_COUNT = '3';
    process.env.BACKUP_ON_STARTUP = 'true';

    vi.resetModules();
    const mod = await import('../server/services/backupService');
    createBackupService = mod.createBackupService;

    dataStore = createMockDataStore();
    logService = createMockLogService();
  });

  afterEach(() => {
    // Clean up test directory
    try {
      fs.rmSync(backupDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    delete process.env.BACKUP_DIR;
    delete process.env.BACKUP_ENABLED;
    delete process.env.BACKUP_INTERVAL_HOURS;
    delete process.env.BACKUP_MAX_COUNT;
    delete process.env.BACKUP_ON_STARTUP;
  });

  describe('createBackup', () => {
    it('should create a gzip backup file and manifest entry', async () => {
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createBackup('manual', 'Test checkpoint');

      expect(entry).not.toBeNull();
      expect(entry!.type).toBe('manual');
      expect(entry!.label).toBe('Test checkpoint');
      expect(entry!.teamCount).toBe(2);
      expect(entry!.sizeBytes).toBeGreaterThan(0);
      expect(entry!.protected).toBe(false);
      expect(entry!.id).toMatch(/^backup_\d+_[a-f0-9]+$/);

      // Verify file exists and is valid gzip
      const filePath = join(backupDir, entry!.filename);
      expect(fs.existsSync(filePath)).toBe(true);

      const compressed = fs.readFileSync(filePath);
      const data = JSON.parse(gunzipSync(compressed).toString('utf8'));
      expect(data.teams).toHaveLength(2);
      expect(data.teams[0].name).toBe('Alpha');
    });

    it('should add entry to manifest', async () => {
      const service = createBackupService({ dataStore, logService });
      await service.createBackup('auto');
      await service.createBackup('manual', 'Second');

      const backups = service.listBackups();
      expect(backups).toHaveLength(2);
      // Sorted newest first
      expect(backups[0].label).toBe('Second');
    });

    it('should return null if dataStore.loadPersistedData fails', async () => {
      dataStore.loadPersistedData.mockRejectedValueOnce(new Error('DB error'));
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createBackup('auto');
      expect(entry).toBeNull();
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no backups exist', () => {
      const service = createBackupService({ dataStore, logService });
      expect(service.listBackups()).toEqual([]);
    });

    it('should return backups sorted by date descending', async () => {
      const service = createBackupService({ dataStore, logService });
      await service.createBackup('auto', 'First');
      await service.createBackup('auto', 'Second');
      await service.createBackup('manual', 'Third');

      const backups = service.listBackups();
      expect(backups).toHaveLength(3);
      // Most recent first
      for (let i = 0; i < backups.length - 1; i++) {
        expect(new Date(backups[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(backups[i + 1].createdAt).getTime()
        );
      }
    });
  });

  describe('getBackupConfig', () => {
    it('should return current configuration', () => {
      const service = createBackupService({ dataStore, logService });
      const config = service.getBackupConfig();
      expect(config.enabled).toBe(true);
      expect(config.intervalHours).toBe(24);
      expect(config.maxCount).toBe(3);
      expect(config.backupDir).toBe(backupDir);
      expect(config.onStartup).toBe(true);
    });
  });

  describe('getBackupPath', () => {
    it('should return file path for existing backup', async () => {
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createBackup('manual');

      const result = service.getBackupPath(entry!.id);
      expect(result).not.toBeNull();
      expect(result!.filename).toBe(entry!.filename);
      expect(fs.existsSync(result!.filePath)).toBe(true);
    });

    it('should return null for non-existent backup', () => {
      const service = createBackupService({ dataStore, logService });
      expect(service.getBackupPath('non-existent')).toBeNull();
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup file and manifest entry', async () => {
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createBackup('manual');
      const filePath = join(backupDir, entry!.filename);

      expect(fs.existsSync(filePath)).toBe(true);
      const result = service.deleteBackup(entry!.id);
      expect(result).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
      expect(service.listBackups()).toHaveLength(0);
    });

    it('should return false for non-existent backup', () => {
      const service = createBackupService({ dataStore, logService });
      expect(service.deleteBackup('non-existent')).toBe(false);
    });
  });

  describe('restoreFromBackup', () => {
    it('should decompress and call savePersistedData', async () => {
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createBackup('manual');

      const restored = await service.restoreFromBackup(entry!.id);
      expect(restored).not.toBeNull();
      expect(dataStore.savePersistedData).toHaveBeenCalledWith(
        expect.objectContaining({ teams: expect.any(Array) })
      );
    });

    it('should throw for non-existent backup', async () => {
      const service = createBackupService({ dataStore, logService });
      await expect(service.restoreFromBackup('non-existent')).rejects.toThrow('Backup not found');
    });

    it('should throw if backup file is missing', async () => {
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createBackup('manual');
      // Delete the file but keep the manifest entry
      fs.unlinkSync(join(backupDir, entry!.filename));

      await expect(service.restoreFromBackup(entry!.id)).rejects.toThrow('Backup file missing');
    });
  });

  describe('updateBackup', () => {
    it('should update label', async () => {
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createBackup('auto');

      const updated = service.updateBackup(entry!.id, { label: 'New label' });
      expect(updated!.label).toBe('New label');

      const backups = service.listBackups();
      expect(backups[0].label).toBe('New label');
    });

    it('should update protected status', async () => {
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createBackup('auto');

      const updated = service.updateBackup(entry!.id, { protected: true });
      expect(updated!.protected).toBe(true);
    });

    it('should return null for non-existent backup', () => {
      const service = createBackupService({ dataStore, logService });
      expect(service.updateBackup('non-existent', { label: 'test' })).toBeNull();
    });
  });

  describe('retention', () => {
    it('should delete oldest auto backups when exceeding max count', async () => {
      const service = createBackupService({ dataStore, logService });

      // Create 4 auto backups (max is 3)
      await service.createBackup('auto', 'auto-1');
      await service.createBackup('auto', 'auto-2');
      await service.createBackup('auto', 'auto-3');
      await service.createBackup('auto', 'auto-4');

      const backups = service.listBackups();
      const autoBackups = backups.filter((b) => b.type === 'auto');
      expect(autoBackups.length).toBeLessThanOrEqual(3);
    });

    it('should not delete protected backups', async () => {
      const service = createBackupService({ dataStore, logService });

      const first = await service.createBackup('auto', 'protected-one');
      service.updateBackup(first!.id, { protected: true });

      await service.createBackup('auto', 'auto-2');
      await service.createBackup('auto', 'auto-3');
      await service.createBackup('auto', 'auto-4');

      const backups = service.listBackups();
      const protectedBackup = backups.find((b) => b.id === first!.id);
      expect(protectedBackup).toBeDefined();
    });

    it('should not count manual backups toward retention limit', async () => {
      const service = createBackupService({ dataStore, logService });

      await service.createBackup('manual', 'checkpoint-1');
      await service.createBackup('manual', 'checkpoint-2');
      await service.createBackup('auto', 'auto-1');
      await service.createBackup('auto', 'auto-2');
      await service.createBackup('auto', 'auto-3');

      const backups = service.listBackups();
      const manualBackups = backups.filter((b) => b.type === 'manual');
      expect(manualBackups).toHaveLength(2);
    });
  });

  describe('createStartupBackup', () => {
    it('should create a startup backup', async () => {
      const service = createBackupService({ dataStore, logService });
      const entry = await service.createStartupBackup();

      expect(entry).not.toBeNull();
      expect(entry!.type).toBe('startup');
      expect(entry!.label).toBe('Server startup');
    });

    it('should deduplicate startup backups within 5 minutes', async () => {
      const service = createBackupService({ dataStore, logService });

      const first = await service.createStartupBackup();
      expect(first).not.toBeNull();

      const second = await service.createStartupBackup();
      expect(second).toBeNull();

      expect(service.listBackups().filter((b) => b.type === 'startup')).toHaveLength(1);
    });

    it('should not create backup when BACKUP_ENABLED is false', async () => {
      process.env.BACKUP_ENABLED = 'false';
      vi.resetModules();
      const mod = await import('../server/services/backupService');
      const service = mod.createBackupService({ dataStore, logService });

      const entry = await service.createStartupBackup();
      expect(entry).toBeNull();
    });

    it('should not create backup when BACKUP_ON_STARTUP is false', async () => {
      process.env.BACKUP_ON_STARTUP = 'false';
      vi.resetModules();
      const mod = await import('../server/services/backupService');
      const service = mod.createBackupService({ dataStore, logService });

      const entry = await service.createStartupBackup();
      expect(entry).toBeNull();
    });
  });

  describe('scheduler', () => {
    it('should not start when BACKUP_ENABLED is false', async () => {
      process.env.BACKUP_ENABLED = 'false';
      vi.resetModules();
      const mod = await import('../server/services/backupService');
      const service = mod.createBackupService({ dataStore, logService });

      // Should not throw
      service.startScheduler();
      service.stopScheduler();
    });

    it('should start and stop without error', () => {
      const service = createBackupService({ dataStore, logService });
      service.startScheduler();
      service.stopScheduler();
    });
  });

  describe('manifest resilience', () => {
    it('should handle missing manifest file', () => {
      const service = createBackupService({ dataStore, logService });
      // No manifest file exists yet — should return empty
      expect(service.listBackups()).toEqual([]);
    });

    it('should handle corrupted manifest file', async () => {
      fs.writeFileSync(join(backupDir, 'backups-manifest.json'), 'not valid json');
      const service = createBackupService({ dataStore, logService });
      // Should treat as empty manifest
      expect(service.listBackups()).toEqual([]);

      // Should be able to create a new backup (resets manifest)
      const entry = await service.createBackup('manual');
      expect(entry).not.toBeNull();
      expect(service.listBackups()).toHaveLength(1);
    });

    it('should handle manifest with wrong version', () => {
      fs.writeFileSync(
        join(backupDir, 'backups-manifest.json'),
        JSON.stringify({ version: 99, backups: [{ id: 'old' }] })
      );
      const service = createBackupService({ dataStore, logService });
      // Should treat as empty since version doesn't match
      expect(service.listBackups()).toEqual([]);
    });
  });
});
