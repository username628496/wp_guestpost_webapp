import { useEffect } from 'react'

/**
 * Custom hook to handle keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to handlers
 * Example: { 'ctrl+s': handleSave, 'escape': handleClose }
 */
export default function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Build the key combination string
      const keys = []
      if (event.ctrlKey || event.metaKey) keys.push('ctrl')
      if (event.shiftKey) keys.push('shift')
      if (event.altKey) keys.push('alt')

      // Get the actual key (lowercase)
      const key = event.key.toLowerCase()
      keys.push(key)

      const combination = keys.join('+')

      // Check if we have a handler for this combination
      if (shortcuts[combination]) {
        // Prevent default browser behavior
        event.preventDefault()
        shortcuts[combination](event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
