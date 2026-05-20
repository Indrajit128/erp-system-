import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/api-auth'

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  try {
    const products = await prisma.product.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { articleNo: { contains: q, mode: 'insensitive' } },
          { hsnCode: { contains: q, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(products)
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
    const { name, articleNo, price, gstPercentage, hsnCode, imageUrl } = body

    if (!name || !articleNo || price === undefined || !hsnCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name,
        articleNo,
        price: parseFloat(price),
        gstPercentage: parseFloat(gstPercentage || 18.0),
        hsnCode,
        imageUrl: imageUrl || null
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
