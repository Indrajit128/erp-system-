'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/invoices', label: 'Invoices', icon: '🧾' },
  { href: '/customers', label: 'Customers', icon: '🏢' },
  { href: '/products', label: 'Products', icon: '📦' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--accent)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
          }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>BillFlow</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Import Logistics</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7, marginBottom: 2,
                background: active ? 'var(--bg-hover)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: active ? 500 : 400, fontSize: 13,
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
                {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />}
              </div>
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-light)' }}>
        <button id="signout-btn" onClick={handleSignOut} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
