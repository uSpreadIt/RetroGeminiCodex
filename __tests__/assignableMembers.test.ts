import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('assignableMembers only uses active team members', () => {
  const sessionSource = readFileSync(
    join(__dirname, '..', 'components', 'Session.tsx'),
    'utf-8'
  );

  const healthCheckSource = readFileSync(
    join(__dirname, '..', 'components', 'HealthCheckSession.tsx'),
    'utf-8'
  );

  it('Session.tsx does not include session participants or archivedMembers in assignableMembers', () => {
    // The assignableMembers should derive from team.members (via dataService or prop), not session participants
    const assignableBlock = sessionSource.match(/const assignableMembers[^;]+;/s)?.[0] ?? '';
    expect(assignableBlock).not.toContain('archivedMembers');
    // Must not spread raw participants array into assignableMembers
    expect(assignableBlock).not.toMatch(/\.\.\.\s*participants/);
  });

  it('Session.tsx derives assignableMembers from team members via dataService', () => {
    expect(sessionSource).toContain(
      'const assignableMembers = [...(dataService.getTeam(team.id)?.members ?? team.members)];'
    );
  });

  it('HealthCheckSession.tsx does not include session participants or archivedMembers in assignableMembers', () => {
    const assignableBlock = healthCheckSource.match(/const assignableMembers[^;]+;/s)?.[0] ?? '';
    expect(assignableBlock).not.toContain('archivedMembers');
    expect(assignableBlock).not.toMatch(/\.\.\.\s*participants/);
  });

  it('HealthCheckSession.tsx derives assignableMembers from team members via dataService', () => {
    expect(healthCheckSource).toContain(
      'const assignableMembers = [...(dataService.getTeam(team.id)?.members ?? team.members)];'
    );
  });
});
