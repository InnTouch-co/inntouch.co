import jsPDF from 'jspdf'
import { extractTextFromJson } from '@/lib/utils/json-text'

interface OrderItem {
  menu_item_name: string
  quantity: number
  unit_price: number
  total_price: number
  special_instructions?: string | null
}

interface Order {
  id: string
  order_number: string
  subtotal: number
  discount_amount: number
  total_amount: number
  created_at: string
  items: OrderItem[]
  special_instructions?: string | null
}

interface FolioData {
  booking_id: string
  booking: {
    guest_name: string
    guest_email: string | null
    guest_phone: string | null
    room_number: string
    check_in_date: string
    check_out_date: string
  }
  orders: Order[]
  total_amount: number
  payment_status: 'pending' | 'paid'
  created_at: string
  adjustment?: {
    subtotal_amount: number
    tax_amount: number
    final_amount: number
    pos_receipt_number: string | null
    notes: string | null
    adjusted_at: string
    adjusted_by: string | null
  } | null
  hotel?: {
    title: string | { [key: string]: string }
    address: string | null
    phone: string | null
    email: string | null
    site: string | null
  } | null
}

export function generateFolioPDF(folioData: FolioData): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - 2 * margin
  let yPos = margin

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, fontStyle: string = 'normal') => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', fontStyle)
    const lines = doc.splitTextToSize(text, maxWidth)
    doc.text(lines, x, y)
    return lines.length * (fontSize * 0.4) // Approximate line height
  }

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('GUEST FOLIO', margin, yPos)
  yPos += 10

  // Hotel Information
  if (folioData.hotel) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const hotelName = extractTextFromJson(folioData.hotel.title)
    doc.text(hotelName, margin, yPos)
    yPos += 6

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (folioData.hotel.address) {
      doc.text(folioData.hotel.address, margin, yPos)
      yPos += 5
    }
    if (folioData.hotel.phone) {
      doc.text(`Phone: ${folioData.hotel.phone}`, margin, yPos)
      yPos += 5
    }
    if (folioData.hotel.email) {
      doc.text(`Email: ${folioData.hotel.email}`, margin, yPos)
      yPos += 5
    }
    if (folioData.hotel.site) {
      doc.text(`Website: ${folioData.hotel.site}`, margin, yPos)
      yPos += 5
    }
    yPos += 5
  }

  // Guest Information
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Guest Information', margin, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${folioData.booking.guest_name}`, margin, yPos)
  yPos += 6
  doc.text(`Room: ${folioData.booking.room_number}`, margin, yPos)
  yPos += 6
  if (folioData.booking.guest_email) {
    doc.text(`Email: ${folioData.booking.guest_email}`, margin, yPos)
    yPos += 6
  }
  if (folioData.booking.guest_phone) {
    doc.text(`Phone: ${folioData.booking.guest_phone}`, margin, yPos)
    yPos += 6
  }
  doc.text(`Check-in: ${new Date(folioData.booking.check_in_date).toLocaleDateString()}`, margin, yPos)
  yPos += 6
  doc.text(`Check-out: ${new Date(folioData.booking.check_out_date).toLocaleDateString()}`, margin, yPos)
  yPos += 10

  // Orders Section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Order Details', margin, yPos)
  yPos += 8

  folioData.orders.forEach((order, orderIndex) => {
    checkPageBreak(30)

    // Order Header
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Order #${order.order_number}`, margin, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, margin, yPos)
    yPos += 6

    // Order Items Table Header
    const tableTop = yPos
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Item', margin, yPos)
    doc.text('Qty', margin + 80, yPos)
    doc.text('Price', margin + 100, yPos)
    doc.text('Total', margin + 140, yPos)
    yPos += 6

    // Order Items
    doc.setFont('helvetica', 'normal')
    order.items.forEach((item) => {
      checkPageBreak(15)

      const itemName = item.menu_item_name || 'Unknown Item'
      const itemLines = doc.splitTextToSize(itemName, 70)
      const itemHeight = itemLines.length * 4

      doc.text(itemLines, margin, yPos)
      doc.text(item.quantity.toString(), margin + 80, yPos)
      doc.text(`$${item.unit_price.toFixed(2)}`, margin + 100, yPos)
      doc.text(`$${item.total_price.toFixed(2)}`, margin + 140, yPos)

      if (item.special_instructions) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        const instructionLines = doc.splitTextToSize(`Note: ${item.special_instructions}`, 70)
        doc.text(instructionLines, margin + 5, yPos + itemHeight)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        yPos += instructionLines.length * 3
      }

      yPos += itemHeight + 2
    })

    // Order Special Instructions
    if (order.special_instructions) {
      checkPageBreak(10)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(`Order Note: ${order.special_instructions}`, margin, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
    }

    // Order Totals
    checkPageBreak(15)
    yPos += 3
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Subtotal: $${order.subtotal.toFixed(2)}`, margin + 100, yPos)
    yPos += 5
    if (order.discount_amount > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 128, 0) // Green
      doc.text(`Discount: -$${order.discount_amount.toFixed(2)}`, margin + 100, yPos)
      doc.setTextColor(0, 0, 0) // Black
      doc.setFont('helvetica', 'normal')
      yPos += 5
    }
    doc.setFont('helvetica', 'bold')
    doc.text(`Total: $${order.total_amount.toFixed(2)}`, margin + 100, yPos)
    doc.setFont('helvetica', 'normal')
    yPos += 10

    // Separator line between orders
    if (orderIndex < folioData.orders.length - 1) {
      doc.setLineWidth(0.5)
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 8
    }
  })

  // Folio Summary
  checkPageBreak(40)
  yPos += 5
  doc.setLineWidth(1)
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Folio Summary', margin, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const totalSubtotal = folioData.orders.reduce((sum, o) => sum + o.subtotal, 0)
  const totalDiscount = folioData.orders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
  
  doc.text(`Subtotal: $${totalSubtotal.toFixed(2)}`, margin + 100, yPos)
  yPos += 6
  if (totalDiscount > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 128, 0) // Green
    doc.text(`Total Discount: -$${totalDiscount.toFixed(2)}`, margin + 100, yPos)
    doc.setTextColor(0, 0, 0) // Black
    doc.setFont('helvetica', 'normal')
    yPos += 6
  }

  if (folioData.adjustment) {
    doc.text(`Tax: $${folioData.adjustment.tax_amount.toFixed(2)}`, margin + 100, yPos)
    yPos += 6
    if (folioData.adjustment.pos_receipt_number) {
      doc.text(`POS Receipt #: ${folioData.adjustment.pos_receipt_number}`, margin, yPos)
      yPos += 6
    }
    if (folioData.adjustment.notes) {
      const noteLines = doc.splitTextToSize(`Notes: ${folioData.adjustment.notes}`, maxWidth)
      doc.text(noteLines, margin, yPos)
      yPos += noteLines.length * 5
    }
    if (folioData.adjustment.adjusted_by) {
      doc.setFontSize(8)
      doc.text(`Adjusted by: ${folioData.adjustment.adjusted_by} on ${new Date(folioData.adjustment.adjusted_at).toLocaleString()}`, margin, yPos)
      yPos += 5
      doc.setFontSize(10)
    }
  }

  yPos += 3
  doc.setLineWidth(1)
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const finalAmount = folioData.adjustment 
    ? folioData.adjustment.final_amount 
    : folioData.total_amount
  doc.text(`Final Amount: $${finalAmount.toFixed(2)}`, margin + 100, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Payment Status: ${folioData.payment_status.toUpperCase()}`, margin, yPos)
  yPos += 6
  doc.text(`Folio Created: ${new Date(folioData.created_at).toLocaleString()}`, margin, yPos)

  // Footer
  const footerY = pageHeight - 15
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(128, 128, 128)
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  )

  // Save PDF
  const fileName = `Folio_${folioData.booking.room_number}_${folioData.booking.guest_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

