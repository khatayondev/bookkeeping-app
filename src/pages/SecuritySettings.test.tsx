// @vitest-environment jsdom
// src/pages/SecuritySettings.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SecuritySettings from './SecuritySettings';
import { PinLockProvider } from '../context/PinLockContext';
import { savePinConfig, hashPin, getStoredPinConfigSync } from '../lib/pinAuth';

describe('SecuritySettings Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderSecuritySettings = () => {
    return render(
      <MemoryRouter>
        <PinLockProvider>
          <SecuritySettings />
        </PinLockProvider>
      </MemoryRouter>
    );
  };

  it('renders disabled state when no PIN is set and displays recovery note', () => {
    renderSecuritySettings();

    expect(screen.getByText('PIN Lock & Security')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set up PIN Lock/i })).toBeInTheDocument();

    expect(
      screen.getByText(/A forgotten PIN can only be reset by restoring from a backup or wiping the app data/i)
    ).toBeInTheDocument();
  });

  it('sets up a new PIN successfully and stores only salted hash', async () => {
    renderSecuritySettings();

    fireEvent.click(screen.getByRole('button', { name: /Set up PIN Lock/i }));

    const newPinInput = screen.getByLabelText(/New PIN/i);
    const confirmPinInput = screen.getByLabelText(/Confirm PIN/i);

    fireEvent.change(newPinInput, { target: { value: '5678' } });
    fireEvent.change(confirmPinInput, { target: { value: '5678' } });

    fireEvent.click(screen.getByRole('button', { name: /Save PIN/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/PIN lock enabled successfully/i);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    // Check stored config: contains only salt and hash, NO plaintext pin
    const config = getStoredPinConfigSync();
    expect(config).not.toBeNull();
    expect(config?.hashHex).toBeDefined();
    expect(config?.saltHex).toBeDefined();
    expect(config).not.toHaveProperty('pin');
  });

  it('rejects setting a PIN if confirmation does not match', async () => {
    renderSecuritySettings();

    fireEvent.click(screen.getByRole('button', { name: /Set up PIN Lock/i }));

    const newPinInput = screen.getByLabelText(/New PIN/i);
    const confirmPinInput = screen.getByLabelText(/Confirm PIN/i);

    fireEvent.change(newPinInput, { target: { value: '1234' } });
    fireEvent.change(confirmPinInput, { target: { value: '9999' } });

    fireEvent.click(screen.getByRole('button', { name: /Save PIN/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/do not match/i);
    });
  });

  it('changes PIN successfully when current PIN is provided', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1111');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: '1min',
    });

    renderSecuritySettings();

    fireEvent.click(screen.getByRole('button', { name: /Change PIN/i }));

    const currentPin = screen.getByLabelText(/Current PIN/i);
    const newPin = screen.getByLabelText(/^New PIN/i);
    const confirmPin = screen.getByLabelText(/Confirm New PIN/i);

    fireEvent.change(currentPin, { target: { value: '1111' } });
    fireEvent.change(newPin, { target: { value: '2222' } });
    fireEvent.change(confirmPin, { target: { value: '2222' } });

    fireEvent.click(screen.getByRole('button', { name: /Update PIN/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/PIN changed successfully/i);
    });
  });

  it('rejects change PIN when incorrect current PIN is provided', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1111');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: '1min',
    });

    renderSecuritySettings();

    fireEvent.click(screen.getByRole('button', { name: /Change PIN/i }));

    const currentPin = screen.getByLabelText(/Current PIN/i);
    const newPin = screen.getByLabelText(/^New PIN/i);
    const confirmPin = screen.getByLabelText(/Confirm New PIN/i);

    fireEvent.change(currentPin, { target: { value: '0000' } });
    fireEvent.change(newPin, { target: { value: '2222' } });
    fireEvent.change(confirmPin, { target: { value: '2222' } });

    fireEvent.click(screen.getByRole('button', { name: /Update PIN/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Incorrect current PIN/i);
    });
  });

  it('removes PIN when correct current PIN is entered', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1111');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: '1min',
    });

    renderSecuritySettings();

    fireEvent.click(screen.getByRole('button', { name: /Remove PIN/i }));

    const currentPin = screen.getByLabelText(/Current PIN/i);
    fireEvent.change(currentPin, { target: { value: '1111' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm & Remove/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/PIN lock removed successfully/i);
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    expect(getStoredPinConfigSync()).toBeNull();
  });

  it('configures auto-lock timeout (immediately, 1 min, 5 min, never)', async () => {
    const { saltHex, hashHex, iterations } = await hashPin('1111');
    await savePinConfig({
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: '1min',
    });

    renderSecuritySettings();

    const select = screen.getByLabelText(/Lock after/i);
    expect(select).toHaveValue('1min');

    fireEvent.change(select, { target: { value: '5min' } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Auto-lock timeout updated/i);
    });

    const updated = getStoredPinConfigSync();
    expect(updated?.autoLockTimeout).toBe('5min');
  });
});
