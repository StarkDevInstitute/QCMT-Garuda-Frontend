import React from 'react'

/**
 * Debounce utility for preventing excessive function calls
 * Commonly used for: sliders, text input, API calls
 */

/**
 * Create a debounced function that delays execution until after the specified wait time
 * @param fn Function to debounce
 * @param delayMs Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delayMs)
  }
}

/**
 * Create a debounced function that executes immediately on first call,
 * then blocks subsequent calls until after the wait time
 * @param fn Function to debounce
 * @param delayMs Delay in milliseconds
 * @returns Debounced function
 */
export function debounceLeading<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let isBlocked = false

  return function (...args: Parameters<T>) {
    if (!isBlocked) {
      fn(...args)
      isBlocked = true

      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        isBlocked = false
        timeoutId = null
      }, delayMs)
    }
  }
}

/**
 * React Hook: useDebounce
 * Debounces a callback function
 * @param callback Function to debounce
 * @param delayMs Delay in milliseconds
 * @returns Debounced callback
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  const debouncedRef = React.useRef<ReturnType<typeof debounce> | null>(null)

  React.useEffect(() => {
    debouncedRef.current = debounce(callback, delayMs)

    return () => {
      if (debouncedRef.current) {
        // Cleanup if needed
      }
    }
  }, [callback, delayMs])

  return (...args: Parameters<T>) => {
    debouncedRef.current?.(...args)
  }
}

/**
 * React Hook: useDebouncedCallback
 * Similar to useCallback but with debouncing
 * @param callback Function to debounce
 * @param delayMs Delay in milliseconds
 * @param deps Dependencies array
 * @returns Debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number,
  deps?: React.DependencyList
): (...args: Parameters<T>) => void {
  const debouncedRef = React.useRef<ReturnType<typeof debounce> | null>(null)
  const callbackRef = React.useRef(callback)

  React.useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  React.useEffect(() => {
    debouncedRef.current = debounce(
      (...args: Parameters<T>) => callbackRef.current(...args),
      delayMs
    )

    return () => {
      // Cleanup
    }
  }, [delayMs, ...(deps || [])])

  return (...args: Parameters<T>) => {
    debouncedRef.current?.(...args)
  }
}
