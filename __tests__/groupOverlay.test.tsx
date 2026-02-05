import { describe, it, expect } from 'vitest';

/**
 * Tests for Feature 2: Ticket text remains visible during grouping.
 *
 * The "Group with this" and "Selected - Tap to cancel" indicators must
 * NOT obscure the card content. They use normal-flow banners (negative
 * margins to stay flush with card edges) and the card always keeps its
 * original background color so text remains readable.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Group Phase Overlays - Ticket text visibility', () => {
  const sessionSource = readFileSync(
    join(__dirname, '..', 'components', 'Session.tsx'),
    'utf-8'
  );

  it('should NOT use inset-0 for the "Group with this" overlay', () => {
    const lines = sessionSource.split('\n');
    const groupWithThisOverlayLines = lines.filter(
      (line) => line.includes('Group with this')
    );

    for (const line of groupWithThisOverlayLines) {
      expect(line).not.toContain('inset-0');
    }
  });

  it('should NOT use inset-0 for the "Selected - Tap to cancel" overlay', () => {
    const lines = sessionSource.split('\n');
    const selectedLines = lines.filter(
      (line) => line.includes('Selected - Tap to cancel')
    );

    for (const line of selectedLines) {
      expect(line).not.toContain('inset-0');
    }
  });

  it('should use negative margins for the "Group with this" banner to stay flush', () => {
    const mergeIndex = sessionSource.indexOf('Group with this');
    const precedingChunk = sessionSource.substring(Math.max(0, mergeIndex - 300), mergeIndex);
    expect(precedingChunk).toContain('-mx-3');
    expect(precedingChunk).toContain('-mt-3');
    expect(precedingChunk).toContain('mb-2');
  });

  it('should use negative margins for the "Selected - Tap to cancel" banner', () => {
    const selectedIndex = sessionSource.indexOf('Selected - Tap to cancel');
    const precedingChunk = sessionSource.substring(Math.max(0, selectedIndex - 300), selectedIndex);
    expect(precedingChunk).toContain('-mx-3');
    expect(precedingChunk).toContain('-mt-3');
    expect(precedingChunk).toContain('mb-2');
  });

  it('should always apply cardBgHex background regardless of drag state', () => {
    // The inline style should apply cardBgHex unconditionally (no !isDragTarget check)
    // Old: style={cardBgHex && !isDragTarget && !isSelected ? {...} : undefined}
    // New: style={cardBgHex ? {...} : undefined}
    const styleLines = sessionSource.split('\n').filter(
      (line) => line.includes('backgroundColor: cardBgHex')
    );
    expect(styleLines.length).toBeGreaterThan(0);

    // The style condition should NOT include !isDragTarget or !isSelected
    const styleConditionIndex = sessionSource.indexOf('backgroundColor: cardBgHex');
    const precedingStyleChunk = sessionSource.substring(
      Math.max(0, styleConditionIndex - 200),
      styleConditionIndex
    );
    expect(precedingStyleChunk).not.toContain('!isDragTarget');
    expect(precedingStyleChunk).not.toContain('!isSelected');
  });

  it('should not apply bg-blue-50 or scale-105 during drag states', () => {
    // These classes obscured the card content in previous implementations
    const dragStateLines = sessionSource.split('\n').filter(
      (line) => (line.includes('isDragTarget') || line.includes('isSelected')) && line.includes('className')
    );

    for (const line of dragStateLines) {
      if (line.includes('isDragTarget') || line.includes('isSelected')) {
        expect(line).not.toContain('bg-blue-50');
        expect(line).not.toContain('scale-105');
      }
    }
  });
});
