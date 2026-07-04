export function formatIndianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('91') && cleaned.length === 12) return '+' + cleaned
  if (cleaned.length === 10) return '+91' + cleaned
  return '+91' + cleaned
}

export function generateInvoiceWhatsAppLink({
  phone,
  businessName,
  invoiceNumber,
  date,
  items,
  subtotal,
  gstAmount,
  total,
  upiId,
}: {
  phone: string
  businessName: string
  invoiceNumber: string
  date: string
  items: { name: string; qty: number; amount: number }[]
  subtotal: number
  gstAmount: number
  total: number
  upiId?: string
}): string {
  const itemLines = items
    .map((i) => `  • ${i.name} x${i.qty} = ₹${i.amount.toLocaleString('en-IN')}`)
    .join('\n')

  const upiLine = upiId ? `\nPay via UPI: ${upiId}` : ''

  const message = `*${businessName}*
Invoice #${invoiceNumber}
Date: ${date}

Items:
${itemLines || '  • See invoice for details'}

Subtotal: ₹${subtotal.toLocaleString('en-IN')}
GST: ₹${gstAmount.toLocaleString('en-IN')}
*Total: ₹${total.toLocaleString('en-IN')}*${upiLine}

Thank you for your business! 🙏`

  const formattedPhone = formatIndianPhone(phone)
  return `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(message)}`
}

export function generateReminderWhatsAppLink({
  phone,
  customerName,
  invoiceNumber,
  amount,
  businessName,
  daysOverdue,
  upiId,
}: {
  phone: string
  customerName: string
  invoiceNumber: string
  amount: number
  businessName: string
  daysOverdue: number
  upiId?: string
}): string {
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`
  const upiLine = upiId ? ` Pay here: ${upiId}` : ''
  let message = ''

  if (daysOverdue <= 3) {
    message = `Hello ${customerName}, friendly reminder that invoice #${invoiceNumber} for ${formattedAmount} from ${businessName} was due ${daysOverdue} day(s) ago. Please make the payment at your earliest convenience.${upiLine} 🙏`
  } else if (daysOverdue <= 7) {
    message = `Dear ${customerName}, your payment of ${formattedAmount} for invoice #${invoiceNumber} is now ${daysOverdue} days overdue. Please clear this at the earliest to avoid any inconvenience. Contact us if you have any concerns.`
  } else {
    message = `URGENT: ${customerName}, invoice #${invoiceNumber} for ${formattedAmount} is significantly overdue (${daysOverdue} days). Please make immediate payment or contact ${businessName} to discuss. This may affect future transactions.`
  }

  const formattedPhone = formatIndianPhone(phone)
  return `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(message)}`
}
