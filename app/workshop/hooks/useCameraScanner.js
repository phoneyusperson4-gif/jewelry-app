import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Manages the lifecycle of an Html5Qrcode camera scanner attached to a given DOM element.
 *
 * The scanner is lazy-loaded so `html5-qrcode` is never included in the initial bundle.
 *
 * @param {string} containerId - The `id` of the DOM element that will host the scanner video feed.
 *
 * @returns {{
 *   initialized:      boolean,
 *   error:            string | null,
 *   permissionDenied: boolean,
 *   start:            () => Promise<void>,
 *   stop:             () => Promise<void>,
 *   setOnScan:        (cb: (text: string) => void) => void,
 * }}
 *
 * @example
 * const { initialized, error, start, stop, setOnScan } = useCameraScanner('qr-reader')
 *
 * useEffect(() => { setOnScan((text) => console.log('Scanned:', text)) }, [setOnScan])
 * useEffect(() => { start(); return () => stop() }, [start, stop])
 */
export function useCameraScanner(containerId) {
  const scannerRef = useRef(null)
  const onScanRef  = useRef(null)

  const [initialized,      setInitialized]      = useState(false)
  const [error,            setError]            = useState(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  /** Register a callback that fires whenever a QR code is decoded. */
  const setOnScan = useCallback((cb) => {
    onScanRef.current = cb
  }, [])

  /** Request camera access and start the scanner. */
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
        undefined // verbose error suppressed intentionally
      )
      setInitialized(true)
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
    }
  }, [containerId])

  /** Stop and clear the scanner instance. */
  const stop = useCallback(async () => {
    if (!scannerRef.current) return
    try {
      await scannerRef.current.stop()
      await scannerRef.current.clear()
    } catch (e) {
      console.error('[useCameraScanner] Error stopping camera:', e)
    }
    scannerRef.current = null
    setInitialized(false)
    setError(null)
    setPermissionDenied(false)
  }, [])

  // Cleanup on unmount — fire-and-forget; errors are non-critical
  useEffect(() => () => {
    scannerRef.current?.stop().catch(console.error)
    scannerRef.current?.clear()
  }, [])

  return { initialized, error, permissionDenied, start, stop, setOnScan }
}
