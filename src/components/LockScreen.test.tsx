// @vitest-environment jsdom
// src/components/LockScreen.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { LockScreen } from './LockScreen';
import { PinLockProvider } from '../context/PinLockContext';
import { savePinConfig, hashPin, STORAGE_KEY_FAILED_ATTEMPTS } from '../lib/pinAuth';

describe('LockScreen Component', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Setup an initial PIN: '1234'
    const { saltHex, hashHex, iterations } = await hashPin('1234');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: '1min',
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithProvider = (onUnlocked = vi.fn()) => {
    return {
      ...render(
        <PinLockProvider>
          <LockScreen onUnlocked={onUnlocked} />
        </PinLockProvider>
      ),
      onUnlocked,
    };
  };

  it('renders numeric keypad, indicators, and recovery note', () => {
    renderWithProvider();

    expect(screen.getByRole('dialog', { name: /PIN Lock Screen/i })).toBeInTheDocument();
    expect(screen.getByText('App Locked')).toBeInTheDocument();
    expect(screen.getByText(/A forgotten PIN can only be reset by restoring from a backup or wiping the app data/i)).toBeInTheDocument();

    // Digits 0-9
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: new RegExp(`Digit ${i}`, 'i') })).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: /Unlock/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear PIN/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Backspace/i })).toBeInTheDocument();
  });

  it('allows digit entry and backspace via numeric keypad', () => {
    renderWithProvider();

    const btn1 = screen.getByRole('button', { name: /Digit 1/i });
    const btn2 = screen.getByRole('button', { name: /Digit 2/i });
    const btnBack = screen.getByRole('button', { name: /Backspace/i });

    fireEvent.click(btn1);
    fireEvent.click(btn2);

    // Backspace removes one
    fireEvent.click(btnBack);

    const unlockBtn = screen.getByRole('button', { name: /Unlock/i });
    expect(unlockBtn).not.toBeDisabled();
  });

  it('allows digit entry via physical keyboard', () => {
    renderWithProvider();

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: '4' });

    const unlockBtn = screen.getByRole('button', { name: /Unlock/i });
    expect(unlockBtn).not.toBeDisabled();
  });

  it('successfully unlocks when correct PIN is entered', async () => {
    const onUnlocked = vi.fn();
    renderWithProvider(onUnlocked);

    // Enter 1 2 3 4
    fireEvent.click(screen.getByRole('button', { name: /Digit 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 3/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 4/i }));

    fireEvent.click(screen.getByRole('button', { name: /Unlock/i }));

    await waitFor(() => {
      expect(onUnlocked).toHaveBeenCalled();
    });
  });

  it('displays remaining attempts on incorrect PIN', async () => {
    renderWithProvider();

    // Enter wrong PIN: 9 9 9 9
    fireEvent.click(screen.getByRole('button', { name: /Digit 9/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 9/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 9/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 9/i }));

    fireEvent.click(screen.getByRole('button', { name: /Unlock/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Incorrect PIN/i);
      expect(screen.getByRole('alert')).toHaveTextContent(/4 attempts remaining/i);
    });
  });

  it('throttles with a 30 second delay after 5 wrong attempts', async () => {
    // Pre-set 4 failed attempts in localStorage
    localStorage.setItem(STORAGE_KEY_FAILED_ATTEMPTS, '4');

    renderWithProvider();

    // 5th wrong attempt
    fireEvent.click(screen.getByRole('button', { name: /Digit 9/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 9/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 9/i }));
    fireEvent.click(screen.getByRole('button', { name: /Digit 9/i }));

    fireEvent.click(screen.getByRole('button', { name: /Unlock/i }));

    await waitFor(() => {
      expect(screen.getByText(/Too many failed attempts!/i)).toBeInTheDocument();
      expect(screen.getByText(/Please wait/i)).toBeInTheDocument();
    });

    // Check that keypad buttons are disabled during lockout
    expect(screen.getByRole('button', { name: /Digit 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Unlock/i })).toBeDisabled();
  });

  it('opens and closes emergency recovery modal', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText(/Forgot PIN or need to reset\?/i));

    expect(screen.getByText(/Reset PIN \/ Recovery/i)).toBeInTheDocument();
    expect(screen.getByText(/Restore from Backup File/i)).toBeInTheDocument();
    expect(screen.getByText(/Wipe All App Data/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back to Lock Screen/i }));
    expect(screen.queryByText(/Reset PIN \/ Recovery/i)).not.toBeInTheDocument();
  });
});
