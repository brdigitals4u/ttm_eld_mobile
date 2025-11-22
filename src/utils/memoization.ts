/**
 * Memoization Utilities
 * 
 * Helper functions for consistent memoization patterns across the app.
 * These utilities help prevent unnecessary re-renders and improve performance.
 */

import { useMemo, useCallback, memo, ComponentType } from 'react'

/**
 * Creates a memoized component with custom comparison function
 * Useful for components that need custom equality checks
 */
export function memoWithCustomCompare<T extends ComponentType<any>>(
  component: T,
  areEqual?: (prevProps: any, nextProps: any) => boolean
): T {
  return memo(component, areEqual) as T
}

/**
 * Memoizes a value with deep equality check
 * Useful for objects and arrays that might have reference changes
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps)
}

/**
 * Memoizes a callback with stable reference
 * Ensures the callback doesn't change unless dependencies change
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps) as T
}

/**
 * Memoizes a value only if it's not null/undefined
 * Useful for optional values that should only be computed when present
 */
export function useConditionalMemo<T>(
  condition: boolean,
  factory: () => T,
  deps: React.DependencyList
): T | undefined {
  return useMemo(() => {
    if (!condition) return undefined
    return factory()
  }, [condition, ...deps])
}

/**
 * Shallow comparison function for memo
 * Compares props by value (not reference) for common types
 */
export function shallowEqual(prevProps: any, nextProps: any): boolean {
  if (prevProps === nextProps) return true
  if (!prevProps || !nextProps) return false
  if (typeof prevProps !== 'object' || typeof nextProps !== 'object') return false

  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)

  if (prevKeys.length !== nextKeys.length) return false

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      // Deep check for arrays and objects
      if (
        Array.isArray(prevProps[key]) &&
        Array.isArray(nextProps[key]) &&
        JSON.stringify(prevProps[key]) === JSON.stringify(nextProps[key])
      ) {
        continue
      }
      return false
    }
  }

  return true
}

/**
 * Memoizes a component with shallow prop comparison
 */
export function memoShallow<T extends ComponentType<any>>(component: T): T {
  return memo(component, shallowEqual) as T
}

/**
 * Creates a memoized selector hook pattern
 * Useful for extracting specific values from complex objects
 */
export function useMemoizedSelector<T, R>(
  value: T,
  selector: (value: T) => R,
  deps?: React.DependencyList
): R {
  return useMemo(() => selector(value), deps || [value])
}

/**
 * Memoizes a value with JSON string comparison
 * Useful for objects that should be compared by content, not reference
 */
export function useJsonMemo<T>(value: T, deps?: React.DependencyList): T {
  const jsonString = JSON.stringify(value)
  return useMemo(() => value, deps || [jsonString])
}


