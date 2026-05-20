import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/api-auth'
import { getPuppeteerBrowser } from '@/lib/puppeteer'
import { calculateInvoiceTotals, roundToTwoDecimals } from '@/lib/calculations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Optional auth check for PDF access - since we want to be able to share links,
  // we can either require auth or make it public. Let's require auth for security
  // but allow token-based access later if needed. For now, check standard auth.
  const user = await getAuthUser()
  if (!user) {
    // If not authenticated via session, check if there's an api_token or bypass for printing
    // For safety, let's look at the cookies or query params. We will require auth for now.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
      },
    })

    if (!invoice || invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Invoice not found or access denied' }, { status: 404 })
    }

    // Get profile details (company settings)
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    })

    const companyName = profile?.companyName || profile?.fullName || 'LOGISTICS BILLING INC.'
    const companyAddress = profile?.companyAddress || 'China-to-India Cargo Hub, Terminal 3, Custom Gateway'
    const companyPhone = profile?.companyPhone || '+91 XXXXX XXXXX'
    const companyEmail = user.email || 'billing@logistics.com'
    const companyGst = profile?.companyGstin || 'GSTIN Pending'

    // Process items for rowspan images
    const items = invoice.items
    const processedItems: any[] = items.map((item) => ({
      ...item,
      rowSpan: 1,
      showImage: true,
    }))

    for (let i = 0; i < processedItems.length; i++) {
      if (!processedItems[i].showImage) continue
      let span = 1
      const currentImg = processedItems[i].productImage
      const currentArticle = processedItems[i].articleNo

      if (!currentImg) {
        processedItems[i].showImage = false
        continue
      }

      for (let j = i + 1; j < processedItems.length; j++) {
        if (
          processedItems[j].productImage === currentImg &&
          processedItems[j].articleNo === currentArticle
        ) {
          span++
          processedItems[j].showImage = false
        } else {
          break
        }
      }
      processedItems[i].rowSpan = span
    }

    // Calculation details for display
    const subtotal = parseFloat(invoice.subtotal.toString())
    const carryingPercentage = parseFloat(invoice.carryingPercentage.toString())
    const carrying = parseFloat(invoice.carrying.toString())
    const totalGst = parseFloat(invoice.gst.toString())
    const grandTotal = parseFloat(invoice.grandTotal.toString())

    const displayCarrying = roundToTwoDecimals(subtotal * (carryingPercentage / 100))
    const displayGst = totalGst

    // Generate HTML for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNo}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 30px;
      color: #000;
      background-color: #fff;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-table td {
      border: none;
      padding: 0;
      vertical-align: top;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 5px 0;
    }
    .meta-label {
      font-weight: bold;
      color: #555;
    }
    .meta-value {
      font-weight: normal;
    }
    .party-container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
      gap: 20px;
    }
    .party-box {
      flex: 1;
      border: 2px solid #000;
      padding: 10px;
    }
    .party-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11px;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .grid-table th {
      border: 2px solid #000;
      background-color: #f0f0f0;
      padding: 6px 4px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10px;
      text-align: center;
    }
    .grid-table td {
      border: 2px solid #000;
      padding: 6px 4px;
      text-align: center;
      vertical-align: middle;
    }
    .grid-table td.desc-cell {
      text-align: left;
    }
    .product-img {
      max-width: 50px;
      max-height: 50px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
      border: 1px solid #ccc;
    }
    .totals-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 15px;
      page-break-inside: avoid;
    }
    .condition-box {
      width: 55%;
      border: 2px solid #000;
      padding: 10px;
      background-color: #fafafa;
    }
    .condition-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10px;
      margin-bottom: 6px;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
    }
    .final-box {
      width: 38%;
      border-collapse: collapse;
    }
    .final-box td {
      border: 2px solid #000;
      padding: 6px 8px;
      font-size: 11px;
    }
    .final-box td.label {
      font-weight: bold;
      background-color: #f5f5f5;
      width: 60%;
    }
    .final-box td.val {
      text-align: right;
      font-weight: bold;
    }
    .final-box tr.grand-total-row td {
      background-color: #000;
      color: #fff;
      font-size: 13px;
    }
    .stamp-signature {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-box {
      width: 200px;
      border-top: 1.5px solid #000;
      text-align: center;
      padding-top: 5px;
      font-weight: bold;
      font-size: 10px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>

  <table class="header-table">
    <tr>
      <td style="width: 50%;">
        <div class="title">${companyName}</div>
        <div style="font-size: 10px; color: #44px;">
          ${companyAddress}<br>
          Phone: ${companyPhone} | Email: ${companyEmail}<br>
          <strong>GSTIN: ${companyGst}</strong>
        </div>
      </td>
      <td style="width: 50%; text-align: right; font-size: 11px;">
        <div style="font-size: 20px; font-weight: 800; margin-bottom: 5px; color: #333;">INVOICE</div>
        <strong>Invoice No:</strong> ${invoice.invoiceNo}<br>
        <strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}<br>
        <strong>Billing Type:</strong> ${
          invoice.billingType === 'TYPE_A'
            ? 'Type A (Without GST)'
            : invoice.billingType === 'TYPE_B'
            ? 'Type B (GST Condition Box)'
            : 'Type C (Final Bill)'
        }
      </td>
    </tr>
  </table>

  <div class="party-container">
    <div class="party-box">
      <div class="party-title">Consignor (Supplier)</div>
      <strong>Guangzhou Forwarding Logistics Co.</strong><br>
      Tianyuan Road, Tianhe District, Guangzhou, China<br>
      Origin Port: Guangzhou Port<br>
      Logistics Mode: Sea Freight (LCL)
    </div>
    <div class="party-box">
      <div class="party-title">Consignee (Buyer / Bill To)</div>
      <strong>${invoice.customer.companyName}</strong><br>
      Address: ${invoice.customer.address}<br>
      Phone: ${invoice.customer.phone}<br>
      <strong>GSTIN: ${invoice.customer.gstNo}</strong>
    </div>
  </div>

  <table class="grid-table">
    <thead>
      <tr>
        <th style="width: 5%;">S.No</th>
        <th style="width: 12%;">Picture</th>
        <th style="width: 15%;">Article No</th>
        <th style="width: 33%;">Description / HSN</th>
        <th style="width: 8%;">Qty</th>
        <th style="width: 12%;">Rate (INR)</th>
        <th style="width: 15%;">Total (INR)</th>
      </tr>
    </thead>
    <tbody>
      ${processedItems
        .map((item, idx) => {
          return `
        <tr>
          <td>${idx + 1}</td>
          ${
            item.showImage
              ? `<td rowspan="${item.rowSpan}">
                  ${
                    item.productImage
                      ? `<img class="product-img" src="${item.productImage}" alt="Product">`
                      : '<div style="font-size: 8px; color: #888;">No Image</div>'
                  }
                 </td>`
              : ''
          }
          <td><strong>${item.articleNo}</strong></td>
          <td class="desc-cell">
            ${item.productName}
            ${item.hsnCode ? `<div style="font-size: 9px; color: #555; margin-top: 2px;">HSN: ${item.hsnCode}</div>` : ''}
          </td>
          <td>${item.quantity}</td>
          <td>${parseFloat(item.price).toFixed(2)}</td>
          <td><strong>${parseFloat(item.total).toFixed(2)}</strong></td>
        </tr>
      `
        })
        .join('')}
    </tbody>
  </table>

  <div class="totals-container">
    <div class="condition-box">
      ${
        invoice.billingType === 'TYPE_B'
          ? `
        <div class="condition-title">Special Conditions / Import Logistics Clauses</div>
        <div style="font-size: 9.5px; line-height: 1.5;">
          1. <strong>Carrying Charges:</strong> Levied @ ${carryingPercentage}% of subtotal (amounting to <strong>INR ${displayCarrying.toFixed(
              2
            )}</strong>).<br>
          2. <strong>GST:</strong> Applicable @ 18% on carrying and 18% general slab (equivalent to <strong>INR ${displayGst.toFixed(
              2
            )}</strong>).<br>
          3. <em>Important:</em> These carrying & GST charges are displayed here for compliance and customs reporting, and are <strong>NOT</strong> added mathematically to the invoice total.
        </div>
      `
          : `
        <div class="condition-title">Terms & Conditions</div>
        <div style="font-size: 9px; line-height: 1.4;">
          - Payment term: 100% advance or on custom release.<br>
          - Goods once imported cannot be returned or exchanged.<br>
          - Standard transit times apply. Subject to customs clearance delay.<br>
          - Interest @ 18% p.a. will be charged for delayed payments beyond 7 days.
        </div>
      `
      }
    </div>

    <table class="final-box">
      <tr>
        <td class="label">Subtotal</td>
        <td class="val">INR ${subtotal.toFixed(2)}</td>
      </tr>
      ${
        invoice.billingType === 'TYPE_C'
          ? `
        <tr>
          <td class="label">Carrying (@${carryingPercentage}%)</td>
          <td class="val">INR ${carrying.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">IGST / GST (Slab)</td>
          <td class="val">INR ${totalGst.toFixed(2)}</td>
        </tr>
        <tr class="grand-total-row">
          <td class="label" style="color: #fff;">Grand Total</td>
          <td class="val" style="color: #fff;">INR ${grandTotal.toFixed(2)}</td>
        </tr>
      `
          : `
        <tr class="grand-total-row">
          <td class="label" style="color: #fff;">Total Payable</td>
          <td class="val" style="color: #fff;">INR ${subtotal.toFixed(2)}</td>
        </tr>
      `
      }
    </table>
  </div>

  <div class="stamp-signature">
    <div class="sig-box" style="border: none; text-align: left;">
      <div style="height: 40px;"></div>
      <div style="font-size: 9px; color: #666;">Prepared by: ${user.email}</div>
    </div>
    <div class="sig-box">
      <div style="height: 40px;"></div>
      Authorized Signatory
    </div>
  </div>

</body>
</html>
    `

    // Run Puppeteer to compile to PDF
    const browser = await getPuppeteerBrowser()
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'load' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    })
    await browser.close()

    // Convert Uint8Array → Buffer so it satisfies the Response BodyInit type
    const pdfNode = Buffer.from(pdfBuffer)

    return new Response(pdfNode, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNo}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('PDF Generation Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
