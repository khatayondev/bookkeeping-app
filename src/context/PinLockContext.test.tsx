// @vitest-environment jsdom
// src/context/PinLockContext.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { PinLockProvider, usePinLock } from './PinLockContext';
import { savePinConfig, hashPin } from '../lib/pinAuth';

function TestConsumer() {
  const {
    isPinSet,
    isLocked,
    autoLockTimeout,
    unlock,
    lockApp,
    throttle,
  } = usePinLock();

  return (
    <div>
      <div data-testid="isPinSet">{isPinSet ? 'yes' : 'no'}</div>
      <div data-testid="isLocked">{isLocked ? 'locked' : 'unlocked'}</div>
      <div data-testid="autoLockTimeout">{autoLockTimeout}</div>
      <div data-testid="isLockedOut">{throttle.isLockedOut ? 'throttled' : 'normal'}</div>
      <button onClick={async () => { await unlock('1234'); }}>Unlock 1234</button>
      <button onClick={async () => { await unlock('9999'); }}>Unlock 9999</button>
      <button onClick={lockApp}>Lock Now</button>
    </div>
  );
}

describe('PinLockContext integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('starts unlocked when no PIN is set', () => {
    render(
      <PinLockProvider>
        <TestConsumer />
      </PinLockProvider>
    );

    expect(screen.getByTestId('isPinSet')).toHaveTextContent('no');
    expect(screen.getByTestId('isLocked')).toHaveTextContent('unlocked');
  });

  it('locks the app on launch when PIN is configured', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1234');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: '1min',
    });

    render(
      <PinLockProvider>
        <TestConsumer />
      </PinLockProvider>
    );

    expect(screen.getByTestId('isPinSet')).toHaveTextContent('yes');
    expect(screen.getByTestId('isLocked')).toHaveTextContent('locked');
  });

  it('unlocks on correct PIN and relocks on lockApp', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1234');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: '1min',
    });

    render(
      <PinLockProvider>
        <TestConsumer />
      </PinLockProvider>
    );

    expect(screen.getByTestId('isLocked')).toHaveTextContent('locked');

    // Unlock
    fireEvent.click(screen.getByText('Unlock 1234'));

    await waitFor(() => {
      expect(screen.getByTestId('isLocked')).toHaveTextContent('unlocked');
    });

    // Manual lock
    act(() => {
      fireEvent.click(screen.getByText('Lock Now'));
    });

    expect(screen.getByTestId('isLocked')).toHaveTextContent('locked');
  });

  it('locks after 60 seconds in the background (1 min default)', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1234');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: '1min',
    });

    render(
      <PinLockProvider>
        <TestConsumer />
      </PinLockProvider>
    );

    // First unlock
    fireEvent.click(screen.getByText('Unlock 1234'));
    await waitFor(() => {
      expect(screen.getByTestId('isLocked')).toHaveTextContent('unlocked');
    });

    const baseTime = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(baseTime);

    // Simulate going to background
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
      writable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // 30 seconds elapsed (less than 60s) -> return to foreground -> should NOT lock
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 30000);
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByTestId('isLocked')).toHaveTextContent('unlocked');

    // Go to background again
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
      writable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // 60 seconds elapsed (>= 60s) -> return to foreground -> should LOCK
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 91000);
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByTestId('isLocked')).toHaveTextContent('locked');
  });

  it('locks immediately when autoLockTimeout is immediately', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1234');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: 'immediately',
    });

    render(
      <PinLockProvider>
        <TestConsumer />
      </PinLockProvider>
    );

    // Unlock
    fireEvent.click(screen.getByText('Unlock 1234'));
    await waitFor(() => {
      expect(screen.getByTestId('isLocked')).toHaveTextContent('unlocked');
    });

    // Go to background
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
      writable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Immediately locked
    expect(screen.getByTestId('isLocked')).toHaveTextContent('locked');
  });

  it('does not auto-lock on resume when autoLockTimeout is never', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1234');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: 'never',
    });

    render(
      <PinLockProvider>
        <TestConsumer />
      </PinLockProvider>
    );

    // Unlock
    fireEvent.click(screen.getByText('Unlock 1234'));
    await waitFor(() => {
      expect(screen.getByTestId('isLocked')).toHaveTextContent('unlocked');
    });

    const baseTime = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(baseTime);

    // Go to background
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
      writable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // 10 minutes elapsed
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 600000);
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Still unlocked!
    expect(screen.getByTestId('isLocked')).toHaveTextContent('unlocked');
  });
});
