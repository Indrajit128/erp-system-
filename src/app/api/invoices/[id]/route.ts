import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/api-auth'
import { calculateInvoiceTotals } from '@/lib/calculations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true
      }
    })

    if (!invoice || invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const {
      invoiceNo,
      customerId,
      carryingPercentage,
      gstPercentage,
      billingType,
      items
    } = body

    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 })
    }

    // Verify new customer if changed
    if (customerId && customerId !== existing.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      })
      if (!customer || customer.userId !== user.id) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }
    }

    const finalCustomerId = customerId || existing.customerId
    const finalBillingType = billingType || existing.billingType
    const finalCarryingPercentage = carryingPercentage !== undefined ? parseFloat(carryingPercentage) : parseFloat(existing.carryingPercentage.toString())
    const finalGstPercentage = gstPercentage !== undefined ? parseFloat(gstPercentage) : parseFloat(existing.gstPercentage.toString())

    // If items are provided, recalculate totals
    let totals = {
      subtotal: parseFloat(existing.subtotal.toString()),
      carrying: parseFloat(existing.carrying.toString()),
      gst: parseFloat(existing.gst.toString()),
      grandTotal: parseFloat(existing.grandTotal.toString())
    }

    let finalItems = items || existing.items

    if (items) {
      const calculationItems = items.map((item: any) => ({
        quantity: parseInt(item.quantity) || 0,
        price: parseFloat(item.price) || 0,
        gstPercentage: parseFloat(item.gstPercentage) || 0
      }))
      totals = calculateInvoiceTotals(calculationItems, finalCarryingPercentage, finalBillingType)
    } else if (carryingPercentage !== undefined || billingType !== undefined) {
      // Recalculate with old items but new settings
      const calculationItems = existing.items.map((item: any) => ({
        quantity: item.quantity,
        price: parseFloat(item.price.toString()),
        gstPercentage: parseFloat(item.gstPercentage.toString())
      }))
      totals = calculateInvoiceTotals(calculationItems, finalCarryingPercentage, finalBillingType)
    }

    // Start Update Transaction
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // If new items, delete old items first
      if (items) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: id }
        })
      }

      // Update Invoice details
      const invoiceData = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNo: invoiceNo || existing.invoiceNo,
          customerId: finalCustomerId,
          carryingPercentage: finalCarryingPercentage,
          gstPercentage: finalGstPercentage,
          subtotal: totals.subtotal,
          carrying: totals.carrying,
          gst: totals.gst,
          grandTotal: totals.grandTotal,
          billingType: finalBillingType
        }
      })

      // Insert new items if provided
      if (items) {
        await Promise.all(
          items.map((item: any) => {
            const qty = parseInt(item.quantity) || 0
            const price = parseFloat(item.price) || 0
            const itemTotal = qty * price

            return tx.invoiceItem.create({
              data: {
                invoiceId: id,
                articleNo: item.articleNo,
                productName: item.productName,
                productImage: item.productImage || null,
                hsnCode: item.hsnCode || null,
                quantity: qty,
                price,
                gstPercentage: parseFloat(item.gstPercentage) || 0,
                total: itemTotal
              }
            })
          })
        )
      }

      return tx.invoice.findUnique({
        where: { id },
        include: { customer: true, items: true }
      })
    })

    return NextResponse.json(updatedInvoice)
  } catch (error: any) {
    console.error('Invoice update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.invoice.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 })
    }

    // Delete items and invoice in cascade or manually if constraints require
    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      })
      await tx.payment.deleteMany({
        where: { invoiceId: id }
      })
      await tx.invoice.delete({
        where: { id }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
