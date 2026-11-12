// src/components/VirtualList.tsx
/**
 * Lightweight, zero-dependency virtualized list for rendering large datasets
 * (e.g. 5,000+ transaction rows) with minimal DOM nodes and fast 60fps scrolling.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

function findScrollParent(element: HTMLElement | null): HTMLElement | Window {
  if (!element) return window;
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
    parent = parent.parentElement;
  }
  return window;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  getItemKey,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const rafId = useRef<number | null>(null);

  const updateScroll = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollParent = findScrollParent(containerRef.current);

    let offsetFromTop = 0;
    let viewHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    if (scrollParent !== window) {
      const parentEl = scrollParent as HTMLElement;
      const parentRect = parentEl.getBoundingClientRect();
      offsetFromTop = parentRect.top - rect.top;
      const parentHeight = parentEl.clientHeight;
      viewHeight = parentHeight > 0 ? Math.min(parentHeight, window.innerHeight) : window.innerHeight;
    } else {
      offsetFromTop = -rect.top;
      viewHeight = window.innerHeight;
    }

    const currentScroll = Math.max(0, offsetFromTop);
    setScrollTop(currentScroll);
    setViewportHeight(viewHeight > 0 ? viewHeight : 800);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scrollParent = findScrollParent(container);

    const onScroll = () => {
      if (rafId.current !== null) return;
      rafId.current = requestAnimationFrame(() => {
        updateScroll();
        rafId.current = null;
      });
    };

    updateScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    if (scrollParent !== window) {
      (scrollParent as HTMLElement).addEventListener('scroll', onScroll, { passive: true });
    }

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (scrollParent !== window) {
        (scrollParent as HTMLElement).removeEventListener('scroll', onScroll);
      }
    };
  }, [updateScroll]);

  const totalCount = items.length;
  const totalHeight = totalCount * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalCount,
    Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{ height: totalHeight > 0 ? `${totalHeight}px` : 'auto' }}
    >
      <div
        className="w-full"
        style={{
          transform: `translateY(${offsetY}px)`,
          willChange: 'transform',
        }}
      >
        {visibleItems.map((item, i) => {
          const index = startIndex + i;
          const key = getItemKey ? getItemKey(item, index) : index;
          return (
            <div key={key} style={{ minHeight: `${itemHeight}px` }}>
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
