'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBillingStore, BillingItem, Customer } from '@/store/useBillingStore'
import { calculateInvoiceTotals, roundToTwoDecimals } from '@/lib/calculations'

export default function NewInvoicePage() {
  const router = useRouter()
  
  // Zustand store bindings
  const {
    customer,
    items,
    carryingPercentage,
    gstPercentage,
    billingType,
    invoiceNo,
    setCustomer,
    addItem,
    addManualItem,
    updateItemQty,
    updateItemPrice,
    updateItemGst,
    removeItem,
    setCarryingPercentage,
    setGstPercentage,
    setBillingType,
    setInvoiceNo,
    clearStore
  } = useBillingStore()

  // Client local states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productsList, setProductsList] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Custom product manual entry form
  const [manualMode, setManualMode] = useState(false)
  const [mArticleNo, setMArticleNo] = useState('')
  const [mName, setMName] = useState('')
  const [mPrice, setMPrice] = useState('')
  const [mHsn, setMHsn] = useState('')
  const [mGst, setMGst] = useState('18')
  const [mImg, setMImg] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')

  // Load customer and initial product lists
  useEffect(() => {
    fetchCustomers()
    fetchProducts()
    
    // Set client-side date safely to prevent SSR hydration mismatch
    setInvoiceDate(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }))
    
    // Auto-generate invoice number if empty
    if (!invoiceNo) {
      const randomNo = 'INV-' + Math.floor(100000 + Math.random() * 900000)
      setInvoiceNo(randomNo)
    }
  }, [])

  // Refetch products when search query changes
  useEffect(() => {
    fetchProducts()
  }, [productSearch])

  async function fetchCustomers() {
    try {
      const res = await fetch('/api/customers')
      const data = await res.json()
      if (res.ok) setCustomers(data)
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(productSearch)}`)
      const data = await res.json()
      if (res.ok) setProductsList(data)
    } catch (err) {
      console.error(err)
    }
  }

  // Rowspan calculations for digital twin preview
  const previewItems = items.map((item) => ({
    ...item,
    rowSpan: 1,
    showImage: true,
  }))

  for (let i = 0; i < previewItems.length; i++) {
    if (!previewItems[i].showImage) continue
    let span = 1
    const currentImg = previewItems[i].productImage
    const currentArticle = previewItems[i].articleNo

    if (!currentImg) {
      previewItems[i].showImage = false
      continue
    }

    for (let j = i + 1; j < previewItems.length; j++) {
      if (
        previewItems[j].productImage === currentImg &&
        previewItems[j].articleNo === currentArticle
      ) {
        span++
        previewItems[j].showImage = false
      } else {
        break
      }
    }
    previewItems[i].rowSpan = span
  }

  // Math Calculations (client-side mirroring)
  const calculationItems = items.map(item => ({
    quantity: item.quantity,
    price: item.price,
    gstPercentage: item.gstPercentage
  }))
  const totals = calculateInvoiceTotals(calculationItems, carryingPercentage, billingType)

  const displayCarrying = roundToTwoDecimals(totals.subtotal * (carryingPercentage / 100))
  const displayGst = totals.gst

  function handleSelectProduct(p: any) {
    addItem({
      articleNo: p.articleNo,
      name: p.name,
      imageUrl: p.imageUrl,
      price: p.price,
      gstPercentage: p.gstPercentage,
      hsnCode: p.hsnCode
    })
    setProductSearch('')
    setShowProductDropdown(false)
  }

  function handleAddManual() {
    if (!mArticleNo || !mName || !mPrice) {
      alert('Please fill Article No, Name, and Price')
      return
    }

    addManualItem({
      articleNo: mArticleNo,
      productName: mName,
      productImage: mImg || null,
      hsnCode: mHsn || null,
      quantity: 1,
      price: parseFloat(mPrice) || 0,
      gstPercentage: parseFloat(mGst) || 0
    })

    // Reset manual form
    setMArticleNo('')
    setMName('')
    setMPrice('')
    setMHsn('')
    setMGst('18')
    setMImg('')
    setManualMode(false)
  }

  async function handleSaveInvoice() {
    if (!customer) {
      setError('Please select a customer')
      return
    }
    if (items.length === 0) {
      setError('Please add at least one item to the invoice')
      return
    }
    if (!invoiceNo) {
      setError('Please set an invoice number')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo,
          customerId: customer.id,
          carryingPercentage,
          gstPercentage,
          billingType,
          items: items.map(i => ({
            articleNo: i.articleNo,
            productName: i.productName,
            productImage: i.productImage,
            hsnCode: i.hsnCode,
            quantity: i.quantity,
            price: i.price,
            gstPercentage: i.gstPercentage
          }))
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to save invoice')
      }

      const createdInvoice = await res.json()
      clearStore()
      
      // Open generated PDF in new tab
      window.open(`/api/invoices/${createdInvoice.id}/pdf`, '_blank')
      
      // Redirect to list page
      router.push('/invoices')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Split-Screen Invoice Creator</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>
            Build, edit, and audit invoices dynamically with a printed digital-twin preview.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => { clearStore(); router.push('/invoices') }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSaveInvoice} disabled={submitting}>
            {submitting ? 'Creating Invoice...' : '💾 Save & Print PDF'}
          </button>
        </div>
      </div>

      <div className="split-container">
        {/* Left Side: Controls */}
        <div className="builder-controls">
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
              1. General Details
            </h2>
            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Invoice Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Billing Type Format</label>
                <select
                  className="form-select"
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as any)}
                >
                  <option value="TYPE_A">Type A (No GST / Zero Tax)</option>
                  <option value="TYPE_B">Type B (GST Info Condition Box)</option>
                  <option value="TYPE_C">Type C (Full Mathematical Sum)</option>
                </select>
              </div>
            </div>

            <div className="grid-cols-3">
              <div className="form-group">
                <label className="form-label">Customer (Consignee)</label>
                <select
                  className="form-select"
                  value={customer?.id || ''}
                  onChange={(e) => {
                    const found = customers.find(c => c.id === e.target.value)
                    setCustomer(found || null)
                  }}
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Carrying Charges (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={carryingPercentage}
                  onChange={(e) => setCarryingPercentage(parseFloat(e.target.value) || 0)}
                  disabled={billingType === 'TYPE_A'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GST Rate for Carrying (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={gstPercentage}
                  onChange={(e) => setGstPercentage(parseFloat(e.target.value) || 0)}
                  disabled={billingType === 'TYPE_A'}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700 }}>2. Invoice Products / Items</h2>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: 11 }}
                onClick={() => setManualMode(!manualMode)}
              >
                {manualMode ? 'Cancel' : '+ Custom Manual Item'}
              </button>
            </div>

            {/* Manual Custom Item Adder */}
            {manualMode && (
              <div style={{ background: 'var(--bg-hover)', padding: 12, borderRadius: 6, marginBottom: 16, border: '1px dashed var(--border-light)' }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Add Custom Item Manually</h4>
                <div className="grid-cols-3">
                  <div className="form-group">
                    <label className="form-label">Article No</label>
                    <input type="text" className="form-input" placeholder="e.g. CUSTOM-01" value={mArticleNo} onChange={e => setMArticleNo(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Product Name / Description</label>
                    <input type="text" className="form-input" placeholder="Custom Pillow Cover" value={mName} onChange={e => setMName(e.target.value)} />
                  </div>
                </div>
                <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">HSN</label>
                    <input type="text" className="form-input" value={mHsn} onChange={e => setMHsn(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price (INR)</label>
                    <input type="number" className="form-input" value={mPrice} onChange={e => setMPrice(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST %</label>
                    <input type="number" className="form-input" value={mGst} onChange={e => setMGst(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Image URL</label>
                    <input type="text" className="form-input" placeholder="https://..." value={mImg} onChange={e => setMImg(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button className="btn btn-secondary" onClick={() => setManualMode(false)} style={{ padding: '6px 12px' }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleAddManual} style={{ padding: '6px 12px' }}>Add to Invoice</button>
                </div>
              </div>
            )}

            {/* Product Selector Dropdown */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <label className="form-label">Search & Add Product from Article Master</label>
              <input
                type="text"
                className="form-input"
                placeholder="Type Article No, HSN or product name to search..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value)
                  setShowProductDropdown(true)
                }}
                onFocus={() => setShowProductDropdown(true)}
              />
              
              {showProductDropdown && productsList.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 20,
                    maxHeight: 200,
                    overflowY: 'auto',
                    marginTop: 4
                  }}
                >
                  {productsList.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'between',
                        fontSize: 13,
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.imageUrl && <img src={p.imageUrl} style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                        <div>
                          <strong>{p.articleNo}</strong> - {p.name}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
                        INR {p.price} | HSN: {p.hsnCode}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showProductDropdown && productSearch && productsList.length === 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 6, zIndex: 20, fontSize: 13 }}>
                  No article matches found. Try "+ Custom Manual Item" above.
                </div>
              )}
            </div>

            {/* Editable Items List */}
            {items.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No items added. Use the search box above to load articles.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Qty</th>
                      <th>Rate (INR)</th>
                      <th>GST %</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.articleNo}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {item.productImage && <img src={item.productImage} style={{ width: 20, height: 20, objectFit: 'contain' }} />}
                            <div>
                              <strong>{item.articleNo}</strong>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.productName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: 60, padding: '4px 6px' }}
                            value={item.quantity}
                            onChange={(e) => updateItemQty(item.articleNo, parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: 80, padding: '4px 6px' }}
                            value={item.price}
                            onChange={(e) => updateItemPrice(item.articleNo, parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: 50, padding: '4px 6px' }}
                            value={item.gstPercentage}
                            onChange={(e) => updateItemGst(item.articleNo, parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <strong>INR {(item.quantity * item.price).toFixed(2)}</strong>
                        </td>
                        <td>
                          <button
                            onClick={() => removeItem(item.articleNo)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>

        {/* Right Side: Digital-Twin Live A4 Preview */}
        <div className="preview-pane" onClick={() => setShowProductDropdown(false)}>
          <div className="a4-preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 15 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase' }}>LOGISTICS BILLING INC.</div>
                <div style={{ fontSize: 9, color: '#444', marginTop: 2 }}>
                  China-to-India Cargo Hub, Terminal 3, Custom Gateway<br/>
                  Phone: +91 XXXXX XXXXX | GSTIN: GSTIN Pending
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#333' }}>INVOICE PREVIEW</div>
                <div style={{ marginTop: 2 }}>
                  <strong>No:</strong> {invoiceNo || 'INV-XXXXXX'}<br/>
                  <strong>Date:</strong> {invoiceDate || '—'}<br/>
                  <span style={{ fontSize: 9, fontWeight: 'bold', background: '#eee', padding: '1px 4px', borderRadius: 2 }}>
                    {billingType === 'TYPE_A' ? 'Type A (No GST)' : billingType === 'TYPE_B' ? 'Type B (GST Info)' : 'Type C (Full GST)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Consignee boxes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 15, marginBottom: 15 }}>
              <div style={{ flex: 1, border: '2px solid #000', padding: 8 }}>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: 9, borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4 }}>
                  Consignor (Supplier)
                </div>
                <strong>Guangzhou Forwarding Logistics Co.</strong><br/>
                Tianyuan Road, Guangzhou, China<br/>
                Origin Port: Guangzhou Port
              </div>
              <div style={{ flex: 1, border: '2px solid #000', padding: 8 }}>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: 9, borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4 }}>
                  Consignee (Buyer)
                </div>
                {customer ? (
                  <>
                    <strong>{customer.companyName}</strong><br/>
                    {customer.address}<br/>
                    <strong>GSTIN: {customer.gstNo}</strong>
                  </>
                ) : (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>No customer selected</span>
                )}
              </div>
            </div>

            {/* High-Contrast Grid with rowspans */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 15 }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ border: '2px solid #000', padding: 4, width: '5%' }}>S.N</th>
                  <th style={{ border: '2px solid #000', padding: 4, width: '15%' }}>Picture</th>
                  <th style={{ border: '2px solid #000', padding: 4, width: '18%' }}>Article No</th>
                  <th style={{ border: '2px solid #000', padding: 4, width: '32%' }}>Description / HSN</th>
                  <th style={{ border: '2px solid #000', padding: 4, width: '8%' }}>Qty</th>
                  <th style={{ border: '2px solid #000', padding: 4, width: '10%' }}>Rate</th>
                  <th style={{ border: '2px solid #000', padding: 4, width: '12%' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ border: '2px solid #000', padding: 20, textAlign: 'center', color: '#888' }}>
                      No items added yet. Complete the builder form.
                    </td>
                  </tr>
                ) : (
                  previewItems.map((item, idx) => (
                    <tr key={item.articleNo}>
                      <td style={{ border: '2px solid #000', padding: 4, textAlign: 'center' }}>{idx + 1}</td>
                      {item.showImage ? (
                        <td rowSpan={item.rowSpan} style={{ border: '2px solid #000', padding: 4, textAlign: 'center', verticalAlign: 'middle' }}>
                          {item.productImage ? (
                            <img src={item.productImage} style={{ maxWidth: 40, maxHeight: 40, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                          ) : (
                            <div style={{ fontSize: 7, color: '#aaa' }}>No Image</div>
                          )}
                        </td>
                      ) : null}
                      <td style={{ border: '2px solid #000', padding: 4, textAlign: 'center' }}><strong>{item.articleNo}</strong></td>
                      <td style={{ border: '2px solid #000', padding: 4, textAlign: 'left' }}>
                        {item.productName}
                        {item.hsnCode && <div style={{ fontSize: 8, color: '#555', marginTop: 1 }}>HSN: {item.hsnCode}</div>}
                      </td>
                      <td style={{ border: '2px solid #000', padding: 4, textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ border: '2px solid #000', padding: 4, textAlign: 'center' }}>{item.price.toFixed(2)}</td>
                      <td style={{ border: '2px solid #000', padding: 4, textAlign: 'center' }}><strong>{(item.quantity * item.price).toFixed(2)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Bottom Calculations section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '55%', border: '2px solid #000', padding: 8, backgroundColor: '#fcfcfc' }}>
                {billingType === 'TYPE_B' ? (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: 9, borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4 }}>
                      SPECIAL COMPLIANCE CLAUSE
                    </div>
                    <div style={{ fontSize: 8.5, lineHeight: 1.4 }}>
                      1. <strong>Carrying Charges:</strong> Levied @ {carryingPercentage}% of subtotal (equivalent to <strong>INR {displayCarrying.toFixed(2)}</strong>).<br/>
                      2. <strong>GST:</strong> Applicable @ 18% slab (equivalent to <strong>INR {displayGst.toFixed(2)}</strong>).<br/>
                      3. <em>Important:</em> These figures are for customs reporting only and are <strong>NOT</strong> added to total payable.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: 9, borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4 }}>
                      STANDARD IMPORT TERMS
                    </div>
                    <div style={{ fontSize: 8, lineHeight: 1.3 }}>
                      - Payment due on delivery / release.<br/>
                      - Standard sea customs rules apply.<br/>
                      - Overdue interest @ 18% per annum.
                    </div>
                  </>
                )}
              </div>

              <table style={{ width: '40%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '2px solid #000', padding: 4, fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Subtotal</td>
                    <td style={{ border: '2px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>INR {totals.subtotal.toFixed(2)}</td>
                  </tr>
                  {billingType === 'TYPE_C' ? (
                    <>
                      <tr>
                        <td style={{ border: '2px solid #000', padding: 4, fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Carrying (@{carryingPercentage}%)</td>
                        <td style={{ border: '2px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>INR {totals.carrying.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '2px solid #000', padding: 4, fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>GST</td>
                        <td style={{ border: '2px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>INR {totals.gst.toFixed(2)}</td>
                      </tr>
                      <tr style={{ background: '#000', color: '#fff' }}>
                        <td style={{ border: '2px solid #000', padding: 4, fontWeight: 'bold', color: '#fff' }}>Grand Total</td>
                        <td style={{ border: '2px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>INR {totals.grandTotal.toFixed(2)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr style={{ background: '#000', color: '#fff' }}>
                      <td style={{ border: '2px solid #000', padding: 4, fontWeight: 'bold', color: '#fff' }}>Total Payable</td>
                      <td style={{ border: '2px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>INR {totals.subtotal.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
              <div style={{ fontSize: 8, color: '#777' }}>
                Digital twins preview matches A4 paper size.
              </div>
              <div style={{ width: 120, borderTop: '1px solid #000', textAlign: 'center', paddingTop: 3, fontWeight: 'bold', fontSize: 9 }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
