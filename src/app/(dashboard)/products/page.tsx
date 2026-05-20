'use client'
import { useState, useEffect } from 'react'

interface Product {
  id: string
  articleNo: string
  name: string
  price: number
  gstPercentage: number
  hsnCode: string
  imageUrl: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [articleNo, setArticleNo] = useState('')
  const [price, setPrice] = useState('')
  const [gstPercentage, setGstPercentage] = useState('18.0')
  const [hsnCode, setHsnCode] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [search])

  async function fetchProducts() {
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (res.ok) {
        setProducts(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          articleNo,
          price: parseFloat(price),
          gstPercentage: parseFloat(gstPercentage),
          hsnCode,
          imageUrl: imageUrl || null
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create product')
      }

      // Refresh list and clear form
      setName('')
      setArticleNo('')
      setPrice('')
      setGstPercentage('18.0')
      setHsnCode('')
      setImageUrl('')
      setModalOpen(false)
      fetchProducts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Products (Article Master)</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>
            Manage imported items and searchable Article Numbers.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Add Product (Article)
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by name, article number or HSN..."
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading products...</p>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          No products found. Add your first article to start billing.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Image</th>
                <th>Article No</th>
                <th>Name / Description</th>
                <th>HSN Code</th>
                <th>Standard Rate</th>
                <th>GST Rate</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ width: 40, height: 40, objectFit: 'contain', border: '1px solid var(--border-light)', borderRadius: 4 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          background: 'var(--bg-hover)',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: 'var(--text-muted)'
                        }}
                      >
                        None
                      </div>
                    )}
                  </td>
                  <td>
                    <strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.articleNo}</strong>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                  </td>
                  <td>{p.hsnCode}</td>
                  <td>INR {p.price.toFixed(2)}</td>
                  <td>
                    <span className="badge badge-info">{p.gstPercentage}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal dialog */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div className="card" style={{ width: 500, background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add New Product / Article</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Article Number (Unique ID)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. ART-9021"
                  value={articleNo}
                  onChange={(e) => setArticleNo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Name / Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Luxury Velvet Cushion Cover"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">HSN Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 6304.92"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GST Slab (%)</label>
                  <select
                    className="form-select"
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(e.target.value)}
                  >
                    <option value="5.0">5% Slab</option>
                    <option value="12.0">12% Slab</option>
                    <option value="18.0">18% Slab (Default)</option>
                    <option value="28.0">28% Slab</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Rate / Unit Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 245.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>

              {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
