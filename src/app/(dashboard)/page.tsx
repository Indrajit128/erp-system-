import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header" style={{ paddingBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>Welcome to BillFlow — your import logistics billing hub.</p>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Invoices', value: '—', icon: '🧾', href: '/invoices' },
            { label: 'Total Customers', value: '—', icon: '🏢', href: '/customers' },
            { label: 'Total Products', value: '—', icon: '📦', href: '/products' },
          ].map(stat => (
            <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{stat.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{stat.label}</div>
              </div>
            </Link>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/invoices/new" className="btn btn-primary" id="create-invoice-btn">⚡ New Invoice</Link>
            <Link href="/products" className="btn btn-secondary" id="add-product-btn">+ Add Product</Link>
            <Link href="/customers" className="btn btn-secondary" id="add-customer-btn">+ Add Customer</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
