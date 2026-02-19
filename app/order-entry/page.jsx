'use client'
import { useOrderForm }                    from '@/app/order-entry/hooks/useOrderForm'
import { OrderForm }                       from '@/app/order-entry/components/OrderForm'
import { OrderLabel, LabelPlaceholder }    from '@/app/order-entry/components/OrderLabel'

/**
 * Order entry page.
 *
 * Layout: two-column grid on md+.
 * Left  → OrderForm   (controlled; all logic in useOrderForm)
 * Right → OrderLabel  (preview + A4 print) or LabelPlaceholder
 *
 * This component owns zero business logic — it only wires the hook to the components.
 */
export default function OrderEntryPage() {
  const {
    formData,
    savedOrder,
    loading,
    error,
    updateField,
    toggleArray,
    handleSubmit,
    resetSaved,
  } = useOrderForm()

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">

      <OrderForm
        formData={formData}
        loading={loading}
        error={error}
        updateField={updateField}
        toggleArray={toggleArray}
        onSubmit={handleSubmit}
      />

      <div className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-300 rounded-4xl p-6 bg-white">
        {savedOrder
          ? <OrderLabel order={savedOrder} onReset={resetSaved} />
          : <LabelPlaceholder />
        }
      </div>
    </div>
  )
}
