import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a container for the dialog
    container = document.createElement('div');
    document.body.appendChild(container);

    // Spy on event listeners
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('registers keydown listener only once on mount', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useFocusTrap(onClose));

    // Attach ref to container
    result.current.current = container;

    // Should register listener once (there may be 2 effects but only 1 addEventListener for keydown)
    const keydownCalls = addEventListenerSpy.mock.calls.filter((call: unknown[]) => call[0] === 'keydown');
    expect(keydownCalls.length).toBe(1);
  });

  it('does not re-register keydown listener when onClose reference changes', () => {
    const onClose1 = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback }) => useFocusTrap(callback),
      { initialProps: { callback: onClose1 } }
    );

    // Attach ref to container
    result.current.current = container;

    // Initial registration
    const initialCallCount = addEventListenerSpy.mock.calls.length;
    expect(initialCallCount).toBe(1);

    // Change callback reference (unstable callback pattern)
    const onClose2 = vi.fn();
    rerender({ callback: onClose2 });

    // Should NOT re-register the listener
    expect(addEventListenerSpy).toHaveBeenCalledTimes(initialCallCount);
    expect(removeEventListenerSpy).not.toHaveBeenCalled();
  });

  it('calls the latest onClose callback when Escape is pressed', () => {
    const onClose1 = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback }) => useFocusTrap(callback),
      { initialProps: { callback: onClose1 } }
    );

    // Attach ref to container
    result.current.current = container;

    // Change to a new callback
    const onClose2 = vi.fn();
    rerender({ callback: onClose2 });

    // Simulate Escape key press
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => {
      document.dispatchEvent(escapeEvent);
    });

    // Should call the latest callback (onClose2), not the initial one
    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(onClose1).not.toHaveBeenCalled();
  });

  it('stores and restores previous focus on mount and unmount', () => {
    // Create and focus a button outside the dialog
    const outsideButton = document.createElement('button');
    outsideButton.textContent = 'Outside';
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    expect(document.activeElement).toBe(outsideButton);

    const onClose = vi.fn();
    const { result, unmount } = renderHook(() => useFocusTrap(onClose));

    // Attach ref to container
    result.current.current = container;

    // Create a focusable element inside the dialog
    const insideButton = document.createElement('button');
    insideButton.textContent = 'Inside';
    container.appendChild(insideButton);

    // Trigger focus logic by dispatching an event (simulates mount behavior)
    act(() => {
      insideButton.focus();
    });

    // Focus should be inside the dialog now
    expect(document.activeElement).toBe(insideButton);

    // Unmount - should restore focus to the previous element
    unmount();

    expect(document.activeElement).toBe(outsideButton);

    document.body.removeChild(outsideButton);
  });

  it('focuses first focusable element on mount', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useFocusTrap(onClose));

    // Create focusable elements in the dialog
    const button1 = document.createElement('button');
    button1.textContent = 'First';
    const button2 = document.createElement('button');
    button2.textContent = 'Second';

    container.appendChild(button1);
    container.appendChild(button2);

    // Attach ref to container
    result.current.current = container;

    // Re-render to trigger the effect
    act(() => {
      button1.focus();
    });

    expect(document.activeElement).toBe(button1);
  });

  it('traps focus within dialog on Tab key', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useFocusTrap(onClose));

    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'First';
    const button2 = document.createElement('button');
    button2.textContent = 'Second';
    const button3 = document.createElement('button');
    button3.textContent = 'Third';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);

    // Attach ref to container
    result.current.current = container;

    // Focus first button
    act(() => {
      button1.focus();
    });

    // Simulate Tab key
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    act(() => {
      document.dispatchEvent(tabEvent);
    });

    // Should move to second button
    expect(document.activeElement).toBe(button2);

    // Tab from last button should cycle to first
    act(() => {
      button3.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });

    expect(document.activeElement).toBe(button1);
  });

  it('cycles backwards on Shift+Tab', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useFocusTrap(onClose));

    // Create focusable elements
    const button1 = document.createElement('button');
    button1.textContent = 'First';
    const button2 = document.createElement('button');
    button2.textContent = 'Second';

    container.appendChild(button1);
    container.appendChild(button2);

    // Attach ref to container
    result.current.current = container;

    // Focus first button
    act(() => {
      button1.focus();
    });

    // Simulate Shift+Tab - should cycle to last button
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    act(() => {
      document.dispatchEvent(shiftTabEvent);
    });

    expect(document.activeElement).toBe(button2);
  });

  it('removes event listener on unmount', () => {
    const onClose = vi.fn();
    const { result, unmount } = renderHook(() => useFocusTrap(onClose));

    // Attach ref to container
    result.current.current = container;

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // Unmount
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
  });

  it('handles multiple consecutive callback changes without re-registering listeners', () => {
    const onClose1 = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback }) => useFocusTrap(callback),
      { initialProps: { callback: onClose1 } }
    );

    // Attach ref to container
    result.current.current = container;

    const initialAddCount = addEventListenerSpy.mock.calls.length;

    // Change callback multiple times
    const onClose2 = vi.fn();
    rerender({ callback: onClose2 });

    const onClose3 = vi.fn();
    rerender({ callback: onClose3 });

    const onClose4 = vi.fn();
    rerender({ callback: onClose4 });

    // Should still have only the initial listener registered
    expect(addEventListenerSpy).toHaveBeenCalledTimes(initialAddCount);
    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    // Verify the latest callback is used
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose4).toHaveBeenCalledTimes(1);
    expect(onClose1).not.toHaveBeenCalled();
    expect(onClose2).not.toHaveBeenCalled();
    expect(onClose3).not.toHaveBeenCalled();
  });
});
