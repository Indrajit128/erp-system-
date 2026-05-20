import { create } from 'zustand'

export interface BillingItem {
  id?: string // DB item ID if editing existing
  articleNo: string
  productName: string
  productImage: string | null
  hsnCode: string | null
  quantity: number
  price: number
  gstPercentage: number
}

export interface Customer {
  id: string
  companyName: string
  gstNo: string
  address: string
  phone: string
  email: string | null
}

interface BillingState {
  customer: Customer | null
  items: BillingItem[]
  carryingPercentage: number
  gstPercentage: number
  billingType: 'TYPE_A' | 'TYPE_B' | 'TYPE_C'
  invoiceNo: string
  
  // Setters & Actions
  setCustomer: (customer: Customer | null) => void
  addItem: (product: {
    articleNo: string
    name: string
    imageUrl: string | null
    price: number
    gstPercentage: number
    hsnCode: string | null
  }) => void
  addManualItem: (item: BillingItem) => void
  updateItemQty: (articleNo: string, quantity: number) => void
  updateItemPrice: (articleNo: string, price: number) => void
  updateItemGst: (articleNo: string, gstPercentage: number) => void
  removeItem: (articleNo: string) => void
  setCarryingPercentage: (pct: number) => void
  setGstPercentage: (pct: number) => void
  setBillingType: (type: 'TYPE_A' | 'TYPE_B' | 'TYPE_C') => void
  setInvoiceNo: (no: string) => void
  loadInvoice: (invoice: any) => void
  clearStore: () => void
}

export const useBillingStore = create<BillingState>((set) => ({
  customer: null,
  items: [],
  carryingPercentage: 15.0,
  gstPercentage: 9.0,
  billingType: 'TYPE_A',
  invoiceNo: '',

  setCustomer: (customer) => set({ customer }),

  addItem: (product) =>
    set((state) => {
      const existingIndex = state.items.findIndex((item) => item.articleNo === product.articleNo)
      
      if (existingIndex > -1) {
        // Increment quantity of existing item
        const updatedItems = [...state.items]
        updatedItems[existingIndex].quantity += 1
        return { items: updatedItems }
      } else {
        // Add new item
        const newItem: BillingItem = {
          articleNo: product.articleNo,
          productName: product.name,
          productImage: product.imageUrl,
          hsnCode: product.hsnCode,
          quantity: 1,
          price: product.price,
          gstPercentage: product.gstPercentage,
        }
        return { items: [...state.items, newItem] }
      }
    }),

  addManualItem: (item) =>
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.articleNo === item.articleNo)
      if (existingIndex > -1) {
        const updatedItems = [...state.items]
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + item.quantity,
        }
        return { items: updatedItems }
      } else {
        return { items: [...state.items, item] }
      }
    }),

  updateItemQty: (articleNo, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.articleNo === articleNo ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    })),

  updateItemPrice: (articleNo, price) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.articleNo === articleNo ? { ...item, price: Math.max(0, price) } : item
      ),
    })),

  updateItemGst: (articleNo, gstPercentage) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.articleNo === articleNo ? { ...item, gstPercentage: Math.max(0, gstPercentage) } : item
      ),
    })),

  removeItem: (articleNo) =>
    set((state) => ({
      items: state.items.filter((item) => item.articleNo !== articleNo),
    })),

  setCarryingPercentage: (carryingPercentage) => set({ carryingPercentage }),
  setGstPercentage: (gstPercentage) => set({ gstPercentage }),
  setBillingType: (billingType) => set({ billingType }),
  setInvoiceNo: (invoiceNo) => set({ invoiceNo }),

  loadInvoice: (invoice) =>
    set({
      customer: invoice.customer,
      carryingPercentage: parseFloat(invoice.carryingPercentage.toString()),
      gstPercentage: parseFloat(invoice.gstPercentage.toString()),
      billingType: invoice.billingType,
      invoiceNo: invoice.invoiceNo,
      items: invoice.items.map((item: any) => ({
        id: item.id,
        articleNo: item.articleNo,
        productName: item.productName,
        productImage: item.productImage,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        price: parseFloat(item.price.toString()),
        gstPercentage: parseFloat(item.gstPercentage.toString()),
      })),
    }),

  clearStore: () =>
    set({
      customer: null,
      items: [],
      carryingPercentage: 15.0,
      gstPercentage: 9.0,
      billingType: 'TYPE_A',
      invoiceNo: '',
    }),
}))
