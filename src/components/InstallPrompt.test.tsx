// @vitest-environment jsdom
// src/components/InstallPrompt.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { InstallPrompt } from './InstallPrompt';

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when app is not installable and not on iOS Safari', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when already running in standalone mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders install button when beforeinstallprompt event is fired', () => {
    render(<InstallPrompt variant="banner" />);

    // Initially not visible
    expect(screen.queryByText(/Install Bookkeeping App/i)).toBeNull();

    // Fire beforeinstallprompt
    const promptEvent = new Event('beforeinstallprompt');
    // @ts-expect-error mock prompt
    promptEvent.prompt = vi.fn().mockResolvedValue(undefined);
    // @ts-expect-error mock userChoice
    promptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(screen.getByText(/Install Bookkeeping App/i)).toBeDefined();
    const installButton = screen.getByRole('button', { name: /^Install$/i });
    expect(installButton).toBeDefined();

    // Trigger install
    fireEvent.click(installButton);
    // @ts-expect-error mock prompt
    expect(promptEvent.prompt).toHaveBeenCalled();
  });

  it('renders iOS Safari instructions when running on iOS Safari', () => {
    // Mock userAgent for iOS Safari
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      configurable: true,
      writable: true,
    });

    render(<InstallPrompt variant="card" />);

    expect(screen.getByText(/Install on iPhone \/ iPad/i)).toBeDefined();
    expect(screen.getByText(/Add to Home Screen/i)).toBeDefined();
  });

  it('dismisses banner when user taps dismiss button', () => {
    render(<InstallPrompt variant="banner" />);

    const promptEvent = new Event('beforeinstallprompt');
    // @ts-expect-error mock prompt
    promptEvent.prompt = vi.fn();
    // @ts-expect-error mock userChoice
    promptEvent.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    expect(screen.getByText(/Install Bookkeeping App/i)).toBeDefined();

    const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i });
    fireEvent.click(dismissButton);

    expect(screen.queryByText(/Install Bookkeeping App/i)).toBeNull();
  });
});
