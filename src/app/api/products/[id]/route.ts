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
    const { name, articleNo, price, gstPercentage, hsnCode, imageUrl } = body

    // Check ownership
    const existing = await prisma.product.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 })
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        articleNo: articleNo !== undefined ? articleNo : existing.articleNo,
        price: price !== undefined ? parseFloat(price) : existing.price,
        gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : existing.gstPercentage,
        hsnCode: hsnCode !== undefined ? hsnCode : existing.hsnCode,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl
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
    const existing = await prisma.product.findUnique({
      where: { id }
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Product not found or access denied' }, { status: 404 })
    }

    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
