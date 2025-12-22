import { describe, it, expect } from 'vitest';

describe('Example Test Suite', () => {
  it('should pass a simple assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test string operations', () => {
    const str = 'RetroGeminiCodex';
    expect(str).toContain('Gemini');
    expect(str.toLowerCase()).toBe('retrogeminicodex');
  });

  it('should test array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
    expect(arr[0]).toBe(1);
  });

  it('should test object properties', () => {
    const obj = { name: 'Test', version: 1 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('Test');
    expect(obj).toEqual({ name: 'Test', version: 1 });
  });

  describe('Async operations', () => {
    it('should handle promises', async () => {
      const promise = Promise.resolve('success');
      await expect(promise).resolves.toBe('success');
    });

    it('should handle async/await', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });
  });

  describe('Error handling', () => {
    it('should catch thrown errors', () => {
      expect(() => {
        throw new Error('Test error');
      }).toThrow('Test error');
    });

    it('should test error types', () => {
      expect(() => {
        throw new TypeError('Type error');
      }).toThrow(TypeError);
    });
  });
});
