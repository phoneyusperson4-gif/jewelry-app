import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { INITIAL_FORM } from '@/app/order-entry/constants'

/**
 * Manages all form state and submission logic for the order entry page.
 *
 * Keeps field updates, array toggles, and Supabase insertion in one place
 * so the form component stays a pure render layer.
 *
 * @returns {{
 *   formData:      object,
 *   savedOrder:    object | null,
 *   loading:       boolean,
 *   error:         string | null,
 *   updateField:   (field: string, value: any) => void,
 *   toggleArray:   (field: string, option: string) => void,
 *   handleSubmit:  (e: React.FormEvent) => Promise<void>,
 *   resetSaved:    () => void,
 * }}
 */
export function useOrderForm() {
  const [formData,   setFormData]   = useState(INITIAL_FORM)
  const [savedOrder, setSavedOrder] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  /**
   * Update a single form field by key.
   * Uses functional setState to avoid stale-closure issues in rapid updates.
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  /**
   * Toggle a value in one of the multi-select array fields
   * (setting_central, setting_small, finish).
   */
  const toggleArray = useCallback((field, option) => {
    setFormData(prev => {
      const current = prev[field] ?? []
      return {
        ...prev,
        [field]: current.includes(option)
          ? current.filter(i => i !== option)
          : [...current, option],
      }
    })
  }, [])

  /** Insert the order into Supabase, show the label preview on success. */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: sbError } = await supabase
      .from('orders')
      .insert([formData])
      .select()
      .single()

    if (sbError) {
      setError(sbError.message)
    } else {
      setSavedOrder(data)
      setFormData(INITIAL_FORM)
    }
    setLoading(false)
  }, [formData])

  /** Clear the saved order so the user can create another one. */
  const resetSaved = useCallback(() => setSavedOrder(null), [])

  return { formData, savedOrder, loading, error, updateField, toggleArray, handleSubmit, resetSaved }
}
