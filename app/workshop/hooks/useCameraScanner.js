import { useState, useEffect, useRef, useCallback } from 'react'

export function useCameraScanner(containerId) {
  const scannerRef = useRef(null)
  const onScanRef  = useRef(null)
  const isActiveRef = useRef(false) // <-- new: track whether scanner is actively running

  const [initialized,      setInitialized]      = useState(false)
  const [error,            setError]            = useState(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const setOnScan = useCallback((cb) => {
    onScanRef.current = cb
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setPermissionDenied(false)

    if (!document.getElementById(containerId)) {
      setError('Scanner container not found')
      return
    }

    if (!scannerRef.current) {
      const { Html5Qrcode } = await import('html5-qrcode')
      scannerRef.current = new Html5Qrcode(containerId)
    }

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => onScanRef.current?.(text),
        undefined
      )
      setInitialized(true)
      isActiveRef.current = true // <-- mark as active
    } catch (err) {
      const isDenied =
        err.name === 'NotAllowedError' || err.message?.includes('permission')

      setPermissionDenied(isDenied)
      setError(
        isDenied
          ? 'Camera access denied. Please enable camera permissions in your browser settings.'
          : 'Could not access camera. Please check your device permissions.'
      )
      setInitialized(false)
      isActiveRef.current = false // ensure it's false on failure
    }
  }, [containerId])

  const stop = useCallback(async () => {
    // Only act if scanner exists AND we believe it's active
    if (!scannerRef.current || !isActiveRef.current) return

    try {
      await scannerRef.current.stop()
      await scannerRef.current.clear()
      isActiveRef.current = false // <-- now inactive
    } catch (e) {
      // If an error still occurs, log it but keep isActiveRef false
      console.error('[useCameraScanner] Error stopping camera:', e)
    } finally {
      scannerRef.current = null
      setInitialized(false)
      setError(null)
      setPermissionDenied(false)
    }
  }, [])

  // Cleanup on unmount – uses the same guard
  useEffect(() => {
    return () => {
      if (scannerRef.current && isActiveRef.current) {
        scannerRef.current.stop().catch(console.error)
        scannerRef.current.clear()
      }
    }
  }, [])

  return { initialized, error, permissionDenied, start, stop, setOnScan }
}