import { describe, expect, it } from 'vitest';
import { compactInviteLink, decodeInvitePayload, encodeInvitePayload } from '../utils/inviteLink.js';

describe('invite link utilities', () => {
  it('compacts invite links by removing heavy payload data', () => {
    const payload = {
      id: 'team-1',
      name: 'Retro Team',
      password: 'secret',
      memberEmail: 'participant@example.com',
      memberName: 'Participant',
      sessionId: 'session-1',
      session: {
        id: 'session-1',
        name: 'Long Session',
        participants: Array.from({ length: 10 }, (_, i) => ({ id: `p-${i}`, name: `P${i}` })),
        tickets: Array.from({ length: 25 }, (_, i) => ({ id: `t-${i}`, text: `Ticket ${i}` }))
      }
    };

    const originalUrl = new URL('https://retro.example.com');
    originalUrl.searchParams.set('join', encodeInvitePayload(payload));
    const originalLink = originalUrl.toString();

    const compactedLink = compactInviteLink(originalLink);
    const compactedPayload = decodeInvitePayload(
      new URL(compactedLink).searchParams.get('join') ?? ''
    );

    expect(compactedPayload).toEqual({
      id: 'team-1',
      name: 'Retro Team',
      password: 'secret',
      memberEmail: 'participant@example.com',
      memberName: 'Participant',
      sessionId: 'session-1'
    });
  });

  it('returns original link when payload is missing required fields', () => {
    const originalUrl = new URL('https://retro.example.com');
    originalUrl.searchParams.set('join', encodeInvitePayload({ name: 'Missing ID' }));
    const originalLink = originalUrl.toString();

    expect(compactInviteLink(originalLink)).toBe(originalLink);
  });
});
