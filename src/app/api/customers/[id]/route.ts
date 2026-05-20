import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/api-auth'

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
    const { companyName, gstNo, address, phone, email } = body

    // Check ownership
    const existing = await prisma.customer.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Customer not found or access denied' }, { status: 404 })
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        companyName: companyName !== undefined ? companyName : existing.companyName,
        gstNo: gstNo !== undefined ? gstNo : existing.gstNo,
        address: address !== undefined ? address : existing.address,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
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
    // Check ownership
    const existing = await prisma.customer.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Customer not found or access denied' }, { status: 404 })
    }

    // Note: Due to Restrict onDelete rule in schema.prisma, we might fail to delete if invoices exist
    await prisma.customer.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
