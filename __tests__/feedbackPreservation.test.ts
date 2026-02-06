import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Tests for Feature 3: Preserve feedback when a team is deleted.
 *
 * When a team is deleted, its feedbacks should be moved to an
 * orphanedFeedbacks array in the persisted data, not destroyed.
 * All feedback-related endpoints should also search orphanedFeedbacks.
 */

describe('Feedback preservation on team deletion', () => {
  const serverSource = readFileSync(
    join(__dirname, '..', 'server.js'),
    'utf-8'
  );

  describe('Data normalization', () => {
    it('should initialize orphanedFeedbacks in normalizePersistedData', () => {
      // normalizePersistedData should set orphanedFeedbacks = [] if missing
      expect(serverSource).toContain("normalized.orphanedFeedbacks");
      expect(serverSource).toContain("Array.isArray(normalized.orphanedFeedbacks)");
    });
  });

  describe('Team deletion handler', () => {
    it('should preserve feedbacks before removing the team', () => {
      // The team deletion handler should copy feedbacks to orphanedFeedbacks
      // before splicing the team from the array
      const deleteSection = serverSource.substring(
        serverSource.indexOf("// POST /api/team/:teamId/delete"),
        serverSource.indexOf("// GET /api/team/exists")
      );

      // Should reference teamFeedbacks and orphanedFeedbacks
      expect(deleteSection).toContain('teamFeedbacks');
      expect(deleteSection).toContain('orphanedFeedbacks');
      expect(deleteSection).toContain('feedbacksToPreserve');

      // The preservation should happen BEFORE the splice
      const preserveIndex = deleteSection.indexOf('feedbacksToPreserve');
      const spliceIndex = deleteSection.indexOf('teams.splice');
      expect(preserveIndex).toBeLessThan(spliceIndex);
    });
  });

  describe('Feedback loading endpoints', () => {
    it('should include orphaned feedbacks in /api/feedbacks/all', () => {
      const feedbacksAllSection = serverSource.substring(
        serverSource.indexOf("// Get all feedbacks from all teams"),
        serverSource.indexOf("// Add a comment to a feedback")
      );

      expect(feedbacksAllSection).toContain('orphanedFeedbacks');
      expect(feedbacksAllSection).toContain('orphaned');
    });

    it('should include orphaned feedbacks in /api/super-admin/feedbacks', () => {
      const superAdminFeedbacksSection = serverSource.substring(
        serverSource.indexOf("app.post('/api/super-admin/feedbacks'"),
        serverSource.indexOf("app.post('/api/super-admin/update-email'")
      );

      expect(superAdminFeedbacksSection).toContain('orphanedFeedbacks');
      expect(superAdminFeedbacksSection).toContain('orphaned');
    });
  });

  describe('Feedback operations on orphaned feedbacks', () => {
    it('should check orphaned feedbacks in team comment endpoint', () => {
      const commentSection = serverSource.substring(
        serverSource.indexOf("// Add a comment to a feedback"),
        serverSource.indexOf("// Delete a comment from a feedback")
      );

      expect(commentSection).toContain('orphanedFeedbacks');
    });

    it('should check orphaned feedbacks in team comment delete endpoint', () => {
      const commentDeleteSection = serverSource.substring(
        serverSource.indexOf("// Delete a comment from a feedback"),
        serverSource.indexOf("// Delete a feedback (only the author")
      );

      expect(commentDeleteSection).toContain('orphanedFeedbacks');
    });

    it('should check orphaned feedbacks in super-admin feedback update endpoint', () => {
      const updateSection = serverSource.substring(
        serverSource.indexOf("app.post('/api/super-admin/feedbacks/update'"),
        serverSource.indexOf("app.post('/api/super-admin/feedbacks/delete'")
      );

      expect(updateSection).toContain('orphanedFeedbacks');
    });

    it('should check orphaned feedbacks in super-admin feedback delete endpoint', () => {
      const deleteSection = serverSource.substring(
        serverSource.indexOf("app.post('/api/super-admin/feedbacks/delete'"),
        serverSource.indexOf("// Super admin adds a comment to a feedback")
      );

      expect(deleteSection).toContain('orphanedFeedbacks');
    });

    it('should check orphaned feedbacks in super-admin feedback comment endpoint', () => {
      const commentSection = serverSource.substring(
        serverSource.indexOf("// Super admin adds a comment to a feedback"),
        serverSource.indexOf("// Send notification to team about new admin comment")
      );

      expect(commentSection).toContain('orphanedFeedbacks');
    });
  });

  describe('Feedback preservation data flow', () => {
    it('should copy teamId and teamName from the deleted team', () => {
      const deleteSection = serverSource.substring(
        serverSource.indexOf("// Preserve feedbacks from the deleted team"),
        serverSource.indexOf("currentData.teams.splice")
      );

      // Should map feedbacks with teamId and teamName
      expect(deleteSection).toContain('teamId: f.teamId || deletedTeam.id');
      expect(deleteSection).toContain('teamName: f.teamName || deletedTeam.name');
    });
  });
});
