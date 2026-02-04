import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId } from '../../utils/idGenerator';

describe('idGenerator', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  it('should generate a valid UUID v4', () => {
    const id = generateId();

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y is one of [8, 9, a, b]
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(id).toMatch(uuidV4Regex);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    const id3 = generateId();

    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id2).not.toBe(id3);
  });

  it('should generate IDs in correct format', () => {
    const id = generateId();

    // Should be a string
    expect(typeof id).toBe('string');

    // Should have 5 sections separated by hyphens
    const sections = id.split('-');
    expect(sections).toHaveLength(5);

    // Verify section lengths (8-4-4-4-12)
    expect(sections[0]).toHaveLength(8);
    expect(sections[1]).toHaveLength(4);
    expect(sections[2]).toHaveLength(4);
    expect(sections[3]).toHaveLength(4);
    expect(sections[4]).toHaveLength(12);
  });
});
