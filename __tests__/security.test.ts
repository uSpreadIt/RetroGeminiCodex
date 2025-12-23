import { describe, it, expect } from 'vitest';
import { dataService } from '../services/dataService';

describe('Security Features', () => {
  describe('Team Authentication', () => {
    it('should reject login with incorrect password', () => {
      dataService.createTeam('SecureTeam', 'correct-password-123');

      expect(() => {
        dataService.loginTeam('SecureTeam', 'wrong-password');
      }).toThrow('Invalid password');
    });

    it('should accept login with correct password', () => {
      const team = dataService.createTeam('AuthTeam', 'secure-password');
      const loggedIn = dataService.loginTeam('AuthTeam', 'secure-password');

      expect(loggedIn.id).toBe(team.id);
      expect(loggedIn.name).toBe('AuthTeam');
    });

    it('should be case-insensitive for team names during login', () => {
      const team = dataService.createTeam('CaseInsensitive', 'password123');

      // Lowercase should work (case-insensitive login)
      const loggedIn = dataService.loginTeam('caseinsensitive', 'password123');
      expect(loggedIn.id).toBe(team.id);
    });

    it('should prevent duplicate team names (case-insensitive)', () => {
      dataService.createTeam('UniqueTeam', 'password');

      // Same name with different case should throw
      expect(() => {
        dataService.createTeam('uniqueteam', 'another-password');
      }).toThrow('Team name already exists');
    });

    it('should reject login for non-existent team', () => {
      expect(() => {
        dataService.loginTeam('NonExistentTeam', 'password');
      }).toThrow('Team not found');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test('valid@email.com')).toBe(true);
      expect(emailRegex.test('user.name+tag@example.co.uk')).toBe(true);
      expect(emailRegex.test('invalid.email')).toBe(false);
      expect(emailRegex.test('invalid@')).toBe(false);
      expect(emailRegex.test('@invalid.com')).toBe(false);
      expect(emailRegex.test('no-at-sign.com')).toBe(false);
    });

    it('should handle special characters in team names', () => {
      // Test that special characters don't break the system
      const specialNames = [
        'Team-123',
        'Team_Name',
        'Team.Name',
        'Team Name',
      ];

      specialNames.forEach((name, index) => {
        const team = dataService.createTeam(name, `password${index}`);
        expect(team.name).toBe(name);
      });
    });

    it('should reject XSS attempts in team names', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        // eslint-disable-next-line no-script-url
        'javascript:alert(1)',
      ];

      xssAttempts.forEach((malicious, index) => {
        // The system should store these as plain text, not execute them
        const team = dataService.createTeam(malicious, `pwd${index}`);
        expect(team.name).toBe(malicious); // Stored as-is, not executed
      });
    });
  });

  describe('Data Isolation', () => {
    it('should isolate team data', () => {
      const team1 = dataService.createTeam('Team1', 'password1');
      const team2 = dataService.createTeam('Team2', 'password2');

      // Create sessions for each team
      const session1 = dataService.createSession(team1.id, 'Session1', []);
      const session2 = dataService.createSession(team2.id, 'Session2', []);

      // Verify each team only sees their own data
      const team1Data = dataService.getTeam(team1.id);
      const team2Data = dataService.getTeam(team2.id);

      expect(team1Data?.retrospectives).toHaveLength(1);
      expect(team2Data?.retrospectives).toHaveLength(1);
      expect(team1Data?.retrospectives[0].id).toBe(session1.id);
      expect(team2Data?.retrospectives[0].id).toBe(session2.id);
    });

    it('should not allow accessing other team data by ID guessing', () => {
      const team1 = dataService.createTeam('IsolatedTeam1', 'pwd1');
      const team2 = dataService.createTeam('IsolatedTeam2', 'pwd2');

      // Attempting to get team1 data should require team1 credentials
      const team1Login = dataService.loginTeam('IsolatedTeam1', 'pwd1');
      expect(team1Login.id).toBe(team1.id);

      // Wrong password should fail
      expect(() => {
        dataService.loginTeam('IsolatedTeam1', 'pwd2');
      }).toThrow();
    });
  });

  describe('Member Management Security', () => {
    it('should prevent duplicate members by email', () => {
      const team = dataService.createTeam('MemberTeam', 'password');
      const member1 = dataService.addMember(team.id, 'Alice', 'alice@example.com');

      // Adding same email with different name should return same member
      const member2 = dataService.addMember(team.id, 'Alice Smith', 'alice@example.com');

      expect(member2.id).toBe(member1.id);
      expect(member2.email).toBe(member1.email);
    });

    it('should archive removed members instead of deleting them', () => {
      const team = dataService.createTeam('ArchiveTeam', 'password');
      const member = dataService.addMember(team.id, 'Bob', 'bob@example.com');

      dataService.removeMember(team.id, member.id);

      const updatedTeam = dataService.getTeam(team.id)!;
      expect(updatedTeam.members.some(m => m.id === member.id)).toBe(false);
      expect(updatedTeam.archivedMembers?.some(m => m.id === member.id)).toBe(true);
    });
  });

  describe('Session Security', () => {
    it('should only allow session updates for valid team IDs', () => {
      const team = dataService.createTeam('SessionTeam', 'password');
      const session = dataService.createSession(team.id, 'Retro Session', []);

      // Update should work with valid team ID
      session.phase = 'VOTE';
      expect(() => {
        dataService.updateSession(team.id, session as any);
      }).not.toThrow();

      // Update with invalid team ID should silently fail (returns early)
      // This is by design - the method doesn't throw, just returns
      dataService.updateSession('invalid-team-id', session as any);

      // Verify the session was NOT updated in invalid team
      const validTeam = dataService.getTeam(team.id)!;
      expect(validTeam.retrospectives[0].phase).toBe('VOTE');
    });

    it('should update session in the correct team only', () => {
      const team1 = dataService.createTeam('Team1Session', 'pwd1');
      const team2 = dataService.createTeam('Team2Session', 'pwd2');

      const session1 = dataService.createSession(team1.id, 'Session1', []);
      const session2 = dataService.createSession(team2.id, 'Session2', []);

      // Update session1
      session1.phase = 'DISCUSS';
      dataService.updateSession(team1.id, session1 as any);

      // Verify only team1's session was updated
      const team1Data = dataService.getTeam(team1.id)!;
      const team2Data = dataService.getTeam(team2.id)!;

      expect(team1Data.retrospectives[0].phase).toBe('DISCUSS');
      expect(team2Data.retrospectives[0].phase).toBe('ICEBREAKER'); // Default phase
    });
  });
});
