/**
 * Precision decimal arithmetic helper to avoid JS floating-point precision errors.
 * Replicates calculations for Type A, B, and C billing.
 */

export interface InvoiceItemInput {
  quantity: number
  price: number
  gstPercentage: number
}

export interface CalculationResult {
  subtotal: number
  gst: number
  carrying: number
  grandTotal: number
}

/**
 * Rounds a number to exactly 2 decimal places.
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

/**
 * Calculates totals for an invoice based on item inputs and billing config.
 * 
 * @param items List of invoice items
 * @param carryingPercentage Carrying charges percentage (e.g. 15 for 15%)
 * @param billingType The billing type: 'TYPE_A' | 'TYPE_B' | 'TYPE_C'
 */
export function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  carryingPercentage: number,
  billingType: 'TYPE_A' | 'TYPE_B' | 'TYPE_C'
): CalculationResult {
  let subtotal = 0
  let totalGst = 0

  items.forEach(item => {
    const itemTotal = roundToTwoDecimals(item.quantity * item.price)
    const itemGst = roundToTwoDecimals(itemTotal * (item.gstPercentage / 100))
    subtotal += itemTotal
    totalGst += itemGst
  })

  subtotal = roundToTwoDecimals(subtotal)
  totalGst = roundToTwoDecimals(totalGst)

  let carrying = 0
  let gst = 0
  let grandTotal = 0

  if (billingType === 'TYPE_A') {
    // Type A: No GST, no carrying charge added to total
    carrying = 0
    gst = 0
    grandTotal = subtotal
  } else if (billingType === 'TYPE_B') {
    // Type B: GST and Carrying show in condition box but NOT mathematically added to grand total
    carrying = 0
    gst = 0
    grandTotal = subtotal
  } else if (billingType === 'TYPE_C') {
    // Type C: Full mathematical sum
    carrying = roundToTwoDecimals(subtotal * (carryingPercentage / 100))
    // Note: GST is calculated on the subtotal items
    gst = totalGst
    grandTotal = roundToTwoDecimals(subtotal + carrying + gst)
  }

  return {
    subtotal,
    gst,
    carrying,
    grandTotal
  }
}
