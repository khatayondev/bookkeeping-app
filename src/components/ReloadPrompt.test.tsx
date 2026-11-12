// @vitest-environment jsdom
// src/components/ReloadPrompt.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReloadPrompt } from './ReloadPrompt';

// Mock virtual:pwa-register/react
const mockUpdateServiceWorker = vi.fn();
const mockSetNeedRefresh = vi.fn();
let mockNeedRefreshState = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefreshState, mockSetNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}));

describe('ReloadPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockNeedRefreshState = false;
  });

  it('renders nothing when needRefresh is false', () => {
    mockNeedRefreshState = false;
    const { container } = render(<ReloadPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders update banner when needRefresh is true', () => {
    mockNeedRefreshState = true;
    render(<ReloadPrompt />);

    expect(screen.getByText(/New version available/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^Refresh$/i })).toBeDefined();
  });

  it('calls updateServiceWorker(true) when Refresh button is clicked', () => {
    mockNeedRefreshState = true;
    render(<ReloadPrompt />);

    const refreshButton = screen.getByRole('button', { name: /^Refresh$/i });
    fireEvent.click(refreshButton);

    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('calls setNeedRefresh(false) when dismiss button is clicked', () => {
    mockNeedRefreshState = true;
    render(<ReloadPrompt />);

    const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
    fireEvent.click(dismissButton);

    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
  });
});

