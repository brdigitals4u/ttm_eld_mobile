import React from 'react';
import { TTMEventSubscription } from '@/src/utils/TTMBLEManager';

/**
 * Utility function to safely remove event listeners
 */
export function safeRemoveListener(listener: TTMEventSubscription | null): void {
  if (listener && typeof listener.remove === 'function') {
    try {
      listener.remove();
    } catch (error) {
      console.warn('Error removing listener:', error);
    }
  }
}

/**
 * Hook to manage event listeners with proper cleanup
 */
export function useEventListener<T>(
  createListener: () => TTMEventSubscription | null,
  dependencies: any[] = []
): TTMEventSubscription | null {
  const [listener, setListener] = React.useState<TTMEventSubscription | null>(null);

  React.useEffect(() => {
    const newListener = createListener();
    setListener(newListener);

    return () => {
      safeRemoveListener(newListener);
    };
  }, dependencies);

  return listener;
}

/**
 * Hook to manage multiple event listeners
 */
export function useMultipleEventListeners(
  listeners: Array<() => TTMEventSubscription | null>,
  dependencies: any[] = []
): TTMEventSubscription[] {
  const [activeListeners, setActiveListeners] = React.useState<TTMEventSubscription[]>([]);

  React.useEffect(() => {
    const newListeners = listeners.map(createListener => createListener()).filter(Boolean);
    setActiveListeners(newListeners);

    return () => {
      newListeners.forEach(safeRemoveListener);
    };
  }, dependencies);

  return activeListeners;
} 