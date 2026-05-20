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
    const customers = await prisma.customer.findMany({
      where: {
        userId: user.id,
        OR: [
          { companyName: { contains: q, mode: 'insensitive' } },
          { gstNo: { contains: q, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(customers)
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
    const { companyName, gstNo, address, phone, email } = body

    if (!companyName || !gstNo || !address || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        companyName,
        gstNo,
        address,
        phone,
        email: email || null
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
