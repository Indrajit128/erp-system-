import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/api-auth'
import { calculateInvoiceTotals } from '@/lib/calculations'

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: user.id,
        OR: [
          { invoiceNo: { contains: q, mode: 'insensitive' } },
          { customer: { companyName: { contains: q, mode: 'insensitive' } } }
        ]
      },
      include: {
        customer: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(invoices)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    if (!invoiceNo || !customerId || !billingType || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields or empty items list' }, { status: 400 })
    }

    // Verify customer exists and belongs to this user
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer || customer.userId !== user.id) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate totals server-side
    const calculationItems = items.map(item => ({
      quantity: parseInt(item.quantity) || 0,
      price: parseFloat(item.price) || 0,
      gstPercentage: parseFloat(item.gstPercentage) || 0
    }))

    const cPercentage = parseFloat(carryingPercentage || 0)
    const totals = calculateInvoiceTotals(calculationItems, cPercentage, billingType)

    // Start Transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          userId: user.id,
          invoiceNo,
          customerId,
          carryingPercentage: cPercentage,
          gstPercentage: parseFloat(gstPercentage || 9.0),
          subtotal: totals.subtotal,
          carrying: totals.carrying,
          gst: totals.gst,
          grandTotal: totals.grandTotal,
          billingType,
        }
      })

      // 2. Create Invoice Items
      const createdItems = await Promise.all(
        items.map((item, idx) => {
          const qty = parseInt(item.quantity) || 0
          const price = parseFloat(item.price) || 0
          const itemTotal = totals.subtotal > 0 ? (qty * price) : 0 // Snapshot individual total

          return tx.invoiceItem.create({
            data: {
              invoiceId: createdInvoice.id,
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

      return {
        ...createdInvoice,
        items: createdItems,
        customer
      }
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error('Invoice creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
