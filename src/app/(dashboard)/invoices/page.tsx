'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Invoice {
  id: string
  invoiceNo: string
  billingType: 'TYPE_A' | 'TYPE_B' | 'TYPE_C'
  subtotal: number
  grandTotal: number
  createdAt: string
  customer: {
    companyName: string
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchInvoices()
  }, [search])

  async function fetchInvoices() {
    try {
      const res = await fetch(`/api/invoices?q=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (res.ok) {
        setInvoices(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this invoice? This action is irreversible.')) {
      return
    }

    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchInvoices()
      } else {
        const errData = await res.json()
        alert(errData.error || 'Failed to delete invoice')
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Invoices Master</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>
            Review, download and manage import logistics invoices.
          </p>
        </div>
        <Link href="/invoices/new" className="btn btn-primary" id="new-invoice-nav-btn">
          ⚡ Create Invoice
        </Link>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by invoice number or customer name..."
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          No invoices found. Create your first invoice using the button above.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Consignee / Customer</th>
                <th>Billing Type</th>
                <th>Payable Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <strong style={{ fontSize: 13 }}>{inv.invoiceNo}</strong>
                  </td>
                  <td>
                    {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.customer.companyName}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        inv.billingType === 'TYPE_A'
                          ? 'badge-secondary'
                          : inv.billingType === 'TYPE_B'
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}
                    >
                      {inv.billingType === 'TYPE_A'
                        ? 'Type A (No GST)'
                        : inv.billingType === 'TYPE_B'
                        ? 'Type B (GST Info)'
                        : 'Type C (Full GST)'}
                    </span>
                  </td>
                  <td>
                    <strong>INR {parseFloat(inv.grandTotal.toString()).toFixed(2)}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                      >
                        🖨️ PDF
                      </a>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="btn btn-secondary"
                        style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.2)'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
