// src/context/PinLockContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  type AutoLockTimeout,
  type PinConfig,
  type ThrottleState,
  getStoredPinConfig,
  getStoredPinConfigSync,
  savePinConfig,
  hashPin,
  verifyPin,
  getThrottleState,
  recordFailedAttempt,
  resetThrottleState,
  shouldAutoLockOnResume,
  STORAGE_KEY_PIN_CONFIG,
} from '../lib/pinAuth';

export interface PinLockContextValue {
  isPinSet: boolean;
  isLocked: boolean;
  autoLockTimeout: AutoLockTimeout;
  throttle: ThrottleState;
  unlock: (pin: string) => Promise<{ success: boolean; error?: string }>;
  setPin: (newPin: string) => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  removePin: (currentPin: string) => Promise<{ success: boolean; error?: string }>;
  updateAutoLockTimeout: (timeout: AutoLockTimeout) => Promise<void>;
  lockApp: () => void;
  refreshPinConfig: () => Promise<void>;
}

const PinLockContext = createContext<PinLockContextValue | null>(null);

export const PinLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initial config from localStorage prevents flashing unlocked content on startup
  const initialConfig = getStoredPinConfigSync();

  const [pinConfig, setPinConfig] = useState<PinConfig | null>(initialConfig);
  // If PIN is configured, the app starts LOCKED on launch
  const [isLocked, setIsLocked] = useState<boolean>(initialConfig !== null);
  const [throttle, setThrottle] = useState<ThrottleState>(getThrottleState());

  const backgroundTimeRef = useRef<number | null>(null);
  const pinConfigRef = useRef<PinConfig | null>(pinConfig);
  pinConfigRef.current = pinConfig;

  const isLockedRef = useRef<boolean>(isLocked);
  isLockedRef.current = isLocked;

  // Refresh config from DB on mount and sync
  const refreshPinConfig = useCallback(async () => {
    const config = await getStoredPinConfig();
    setPinConfig(config);
    if (!config) {
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    refreshPinConfig();
  }, [refreshPinConfig]);

  // Keep throttle state updated if there is an active lockout countdown
  useEffect(() => {
    const checkThrottle = () => {
      const state = getThrottleState();
      setThrottle(state);
    };

    checkThrottle();
    const interval = setInterval(checkThrottle, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Background Auto-Lock Detection (immediately, 1 min, 5 min, never)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleBackground = () => {
      backgroundTimeRef.current = Date.now();
      const currentConfig = pinConfigRef.current;
      if (currentConfig && currentConfig.autoLockTimeout === 'immediately') {
        setIsLocked(true);
      }
    };

    const handleForeground = () => {
      const currentConfig = pinConfigRef.current;
      if (!currentConfig) return;

      if (backgroundTimeRef.current !== null && !isLockedRef.current) {
        const elapsed = Date.now() - backgroundTimeRef.current;
        if (shouldAutoLockOnResume(elapsed, currentConfig.autoLockTimeout)) {
          setIsLocked(true);
        }
      }
      backgroundTimeRef.current = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBackground();
      } else if (document.visibilityState === 'visible') {
        handleForeground();
      }
    };

    const handlePageHide = () => {
      handleBackground();
    };

    const handlePageShow = () => {
      handleForeground();
    };

    const handleFocus = () => {
      handleForeground();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Sync across tabs or on storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PIN_CONFIG) {
        refreshPinConfig();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshPinConfig]);

  // ─────────────────────────────────────────────────────────
  // Authentication Actions
  // ─────────────────────────────────────────────────────────

  const unlock = async (candidatePin: string): Promise<{ success: boolean; error?: string }> => {
    const currentThrottle = getThrottleState();
    if (currentThrottle.isLockedOut) {
      setThrottle(currentThrottle);
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${currentThrottle.remainingSeconds}s.`,
      };
    }

    if (!pinConfig) {
      setIsLocked(false);
      return { success: true };
    }

    const isValid = await verifyPin(
      candidatePin,
      pinConfig.saltHex,
      pinConfig.hashHex,
      pinConfig.iterations
    );

    if (isValid) {
      resetThrottleState();
      setThrottle(getThrottleState());
      setIsLocked(false);
      return { success: true };
    }

    const newThrottle = recordFailedAttempt();
    setThrottle(newThrottle);

    if (newThrottle.isLockedOut) {
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${newThrottle.remainingSeconds}s.`,
      };
    }

    const remainingTries = 5 - newThrottle.failedAttempts;
    return {
      success: false,
      error: `Incorrect PIN. ${remainingTries} ${remainingTries === 1 ? 'attempt' : 'attempts'} remaining before temporary lockout.`,
    };
  };

  const setPin = async (newPin: string): Promise<void> => {
    const { saltHex, hashHex, iterations } = await hashPin(newPin);
    const newConfig: PinConfig = {
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: pinConfig?.autoLockTimeout || '1min',
    };
    await savePinConfig(newConfig);
    setPinConfig(newConfig);
    resetThrottleState();
    setThrottle(getThrottleState());
  };

  const changePin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const currentThrottle = getThrottleState();
    if (currentThrottle.isLockedOut) {
      setThrottle(currentThrottle);
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${currentThrottle.remainingSeconds}s.`,
      };
    }

    const activeConfig = pinConfigRef.current || (await getStoredPinConfig());
    if (!activeConfig) {
      await setPin(newPin);
      return { success: true };
    }

    const isCurrentValid = await verifyPin(
      currentPin,
      activeConfig.saltHex,
      activeConfig.hashHex,
      activeConfig.iterations
    );

    if (!isCurrentValid) {
      const newThrottle = recordFailedAttempt();
      setThrottle(newThrottle);
      return {
        success: false,
        error: newThrottle.isLockedOut
          ? `Too many failed attempts. Try again in ${newThrottle.remainingSeconds}s.`
          : 'Incorrect current PIN.',
      };
    }

    const { saltHex, hashHex, iterations } = await hashPin(newPin);
    const updatedConfig: PinConfig = {
      saltHex,
      hashHex,
      iterations,
      autoLockTimeout: activeConfig.autoLockTimeout,
    };

    await savePinConfig(updatedConfig);
    setPinConfig(updatedConfig);
    resetThrottleState();
    setThrottle(getThrottleState());
    return { success: true };
  };

  const removePin = async (
    currentPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const currentThrottle = getThrottleState();
    if (currentThrottle.isLockedOut) {
      setThrottle(currentThrottle);
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${currentThrottle.remainingSeconds}s.`,
      };
    }

    const activeConfig = pinConfigRef.current || (await getStoredPinConfig());
    if (!activeConfig) {
      setIsLocked(false);
      return { success: true };
    }

    const isCurrentValid = await verifyPin(
      currentPin,
      activeConfig.saltHex,
      activeConfig.hashHex,
      activeConfig.iterations
    );

    if (!isCurrentValid) {
      const newThrottle = recordFailedAttempt();
      setThrottle(newThrottle);
      return {
        success: false,
        error: newThrottle.isLockedOut
          ? `Too many failed attempts. Try again in ${newThrottle.remainingSeconds}s.`
          : 'Incorrect current PIN.',
      };
    }

    await savePinConfig(null);
    setPinConfig(null);
    setIsLocked(false);
    resetThrottleState();
    setThrottle(getThrottleState());
    return { success: true };
  };

  const updateAutoLockTimeout = async (timeout: AutoLockTimeout): Promise<void> => {
    const activeConfig = pinConfigRef.current || (await getStoredPinConfig());
    if (!activeConfig) return;
    const updated: PinConfig = {
      ...activeConfig,
      autoLockTimeout: timeout,
    };
    await savePinConfig(updated);
    setPinConfig(updated);
  };

  const lockApp = () => {
    if (pinConfig) {
      setIsLocked(true);
    }
  };

  const value: PinLockContextValue = {
    isPinSet: pinConfig !== null,
    isLocked: isLocked && pinConfig !== null,
    autoLockTimeout: pinConfig?.autoLockTimeout ?? '1min',
    throttle,
    unlock,
    setPin,
    changePin,
    removePin,
    updateAutoLockTimeout,
    lockApp,
    refreshPinConfig,
  };

  return <PinLockContext.Provider value={value}>{children}</PinLockContext.Provider>;
};

export function usePinLock(): PinLockContextValue {
  const context = useContext(PinLockContext);
  if (!context) {
    throw new Error('usePinLock must be used within a PinLockProvider');
  }
  return context;
}
