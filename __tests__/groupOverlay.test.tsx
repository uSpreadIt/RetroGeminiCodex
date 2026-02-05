import { describe, it, expect } from 'vitest';

/**
 * Tests for Feature 2: Ticket text remains visible during grouping.
 *
 * The "Group with this" and "Selected - Tap to cancel" overlays must NOT
 * cover the full card (absolute inset-0). They should only cover the top
 * portion so the ticket text stays readable underneath.
 *
 * These tests verify the implementation by checking the source code of
 * Session.tsx to ensure the overlay CSS classes are correct.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Group Phase Overlays - Ticket text visibility', () => {
  const sessionSource = readFileSync(
    join(__dirname, '..', 'components', 'Session.tsx'),
    'utf-8'
  );

  it('should NOT use absolute inset-0 for the "Group with this" overlay', () => {
    // The old implementation used: absolute inset-0 bg-indigo-50/90
    // which covers the entire card and hides the text
    const lines = sessionSource.split('\n');
    const groupWithThisLines = lines.filter(
      (line) => line.includes('Group with this') && line.includes('absolute')
    );

    // There should be no overlay line that uses inset-0 for "Group with this"
    for (const line of groupWithThisLines) {
      expect(line).not.toContain('inset-0');
    }
  });

  it('should NOT use absolute inset-0 for the "Selected - Tap to cancel" overlay', () => {
    const lines = sessionSource.split('\n');
    const selectedLines = lines.filter(
      (line) => line.includes('Selected - Tap to cancel') && line.includes('absolute')
    );

    for (const line of selectedLines) {
      expect(line).not.toContain('inset-0');
    }
  });

  it('should position the "Group with this" overlay at the top of the card', () => {
    // The overlay should be positioned at the top (top-0 left-0 right-0) as a banner
    expect(sessionSource).toContain('Group with this');

    // Find the div containing the overlay
    const mergeIndex = sessionSource.indexOf('Group with this');
    // Look backwards for the containing div
    const precedingChunk = sessionSource.substring(Math.max(0, mergeIndex - 300), mergeIndex);
    expect(precedingChunk).toContain('top-0');
    expect(precedingChunk).toContain('left-0');
    expect(precedingChunk).toContain('right-0');
  });

  it('should position the "Selected - Tap to cancel" overlay at the top of the card', () => {
    expect(sessionSource).toContain('Selected - Tap to cancel');

    const selectedIndex = sessionSource.indexOf('Selected - Tap to cancel');
    const precedingChunk = sessionSource.substring(Math.max(0, selectedIndex - 300), selectedIndex);
    expect(precedingChunk).toContain('top-0');
    expect(precedingChunk).toContain('left-0');
    expect(precedingChunk).toContain('right-0');
  });
});
