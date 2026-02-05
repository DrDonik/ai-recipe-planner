import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should have access to jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello World';
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
  });

  it('should have a clean localStorage before each test', () => {
    expect(localStorage.length).toBe(0);

    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('should clear localStorage between tests', () => {
    // This test runs after the previous one
    // localStorage should be clean
    expect(localStorage.length).toBe(0);
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should support all localStorage methods', () => {
    localStorage.setItem('key1', 'value1');
    localStorage.setItem('key2', 'value2');

    expect(localStorage.length).toBe(2);
    expect(localStorage.getItem('key1')).toBe('value1');
    expect(localStorage.key(0)).toBeTruthy();

    localStorage.removeItem('key1');
    expect(localStorage.length).toBe(1);

    localStorage.clear();
    expect(localStorage.length).toBe(0);
  });
});
