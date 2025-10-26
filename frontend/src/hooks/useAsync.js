/**
 * useAsync - Generic hook for handling async operations
 * Provides loading, error, and retry functionality
 */
import { useState, useCallback, useRef, useEffect } from 'react'

export function useAsync(asyncFunction, immediate = false) {
  const [status, setStatus] = useState('idle') // idle, pending, success, error
  const [value, setValue] = useState(null)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  /**
   * Execute async function
   */
  const execute = useCallback(async (...params) => {
    setStatus('pending')
    setValue(null)
    setError(null)

    try {
      const response = await asyncFunction(...params)

      if (mountedRef.current) {
        setValue(response)
        setStatus('success')
      }

      return response
    } catch (error) {
      if (mountedRef.current) {
        setError(error)
        setStatus('error')
      }

      throw error
    }
  }, [asyncFunction])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setStatus('idle')
    setValue(null)
    setError(null)
  }, [])

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return {
    execute,
    reset,
    status,
    value,
    error,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error'
  }
}

/**
 * useAsyncRetry - useAsync with automatic retry logic
 */
export function useAsyncRetry(asyncFunction, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    immediate = false
  } = options

  const [retryCount, setRetryCount] = useState(0)
  const asyncState = useAsync(asyncFunction, false)

  /**
   * Execute with retry logic
   */
  const executeWithRetry = useCallback(async (...params) => {
    let currentRetry = 0

    while (currentRetry <= maxRetries) {
      try {
        const result = await asyncState.execute(...params)
        setRetryCount(0) // Reset on success
        return result
      } catch (error) {
        currentRetry++
        setRetryCount(currentRetry)

        if (currentRetry > maxRetries) {
          throw error
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * currentRetry))
      }
    }
  }, [asyncState, maxRetries, retryDelay])

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      executeWithRetry()
    }
  }, [executeWithRetry, immediate])

  return {
    ...asyncState,
    execute: executeWithRetry,
    retryCount,
    canRetry: retryCount < maxRetries
  }
}
