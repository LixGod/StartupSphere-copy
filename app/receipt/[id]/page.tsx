"use client"

import { useEffect, useState, use } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { brandingFromSearchParams } from "@/lib/utils/receipt-branding"
import { Printer, CheckCircle2, Package, Calendar, User, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const searchParams = useSearchParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadReceipt() {
      const { data: orderData, error } = await supabase
        .from("sales_orders")
        .select("*, order_items(*, products(name))")
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error loading receipt details:", error.message, error.details, error.hint, error.code)
      } else if (orderData) {
        setOrder(orderData)
        if (orderData.owner_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("company_name, address, email, gstin, branding_settings")
            .eq("id", orderData.owner_id)
            .single()
          setProfile(profileData)
        }
      }
      setLoading(false)
    }
    loadReceipt()
  }, [id, supabase])

  const branding = brandingFromSearchParams(searchParams, profile?.branding_settings)
  const accentColor = branding.accentColor || "#2563eb"
  const theme = branding.theme || "standard"

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invoice Not Found</h1>
          <p className="text-slate-400">The requested receipt could not be located.</p>
        </div>
      </div>
    )
  }

  const renderRetailReceipt = () => (
    <div className="max-w-sm mx-auto bg-white p-6 font-mono text-sm border shadow-sm">
       <div className="text-center mb-6">
         {branding.logoUrl && <img src={branding.logoUrl} className="h-12 mx-auto mb-3 grayscale object-contain" alt="Logo" />}
         <h1 className="font-bold text-xl uppercase">{profile?.company_name}</h1>
         <p className="text-xs mt-1 text-slate-600 max-w-[200px] mx-auto leading-tight">{profile?.address}</p>
         <p className="text-xs mt-1 font-bold">GSTIN: {profile?.gstin || "N/A"}</p>
       </div>
       <div className="border-t border-b border-dashed border-slate-400 py-3 mb-4 space-y-1">
         <div className="flex justify-between"><span>RCPT:</span><span>#{order.id.slice(-6).toUpperCase()}</span></div>
         <div className="flex justify-between"><span>DATE:</span><span>{new Date(order.order_date).toLocaleDateString()}</span></div>
         <div className="flex justify-between"><span>TIME:</span><span>{new Date(order.order_date).toLocaleTimeString()}</span></div>
         <div className="flex justify-between"><span>CUST:</span><span className="truncate max-w-[150px] text-right">{order.customer_name || "Walk-in"}</span></div>
         {order.customer_phone && (
           <div className="flex justify-between"><span>PHONE:</span><span>{order.customer_phone}</span></div>
         )}
         {order.customer_email && (
           <div className="flex justify-between"><span>EMAIL:</span><span className="truncate max-w-[150px] text-right">{order.customer_email}</span></div>
         )}
         {order.notes && (
           <div className="flex justify-between gap-2"><span>ADDR:</span><span className="text-right text-[10px] leading-tight">{order.notes.replace(/^Address:\s*/i, "")}</span></div>
         )}
       </div>
       <div className="border-b border-dashed border-slate-400 pb-2 mb-2 font-bold flex justify-between uppercase">
         <span>Item</span><span>Total</span>
       </div>
       <div className="space-y-3 mb-4">
         {order.order_items?.map((item: any) => (
            <div key={item.id}>
               <div className="flex justify-between font-bold">
                 <span className="truncate max-w-[180px]">{item.products?.name}</span>
                 <span>₹{item.line_total.toFixed(2)}</span>
               </div>
               <div className="text-xs text-slate-500">{item.quantity} x ₹{item.unit_price.toFixed(2)}</div>
            </div>
         ))}
       </div>
       <div className="border-t border-dashed border-slate-400 pt-3 space-y-1">
         <div className="flex justify-between"><span>SUBTOTAL</span><span>₹{(order.total_amount - order.gst_amount).toFixed(2)}</span></div>
         {branding.showTaxSummary !== false && (
            <div className="flex justify-between"><span>GST (18%)</span><span>₹{order.gst_amount.toFixed(2)}</span></div>
         )}
         <div className="flex justify-between font-black text-lg mt-3 pt-3 border-t border-dashed border-slate-400">
            <span>TOTAL</span><span>₹{order.total_amount.toFixed(2)}</span>
         </div>
       </div>
       <div className="text-center mt-8 space-y-1">
         <p className="font-bold text-xs uppercase">*** {order.status} ***</p>
         <p className="text-[10px] text-slate-500">Thank you for shopping with us!</p>
       </div>
    </div>
  )

  const renderWholesaleReceipt = () => (
    <div className="max-w-5xl mx-auto bg-white p-12 border border-slate-200 shadow-xl">
      <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
        <div>
          {branding.logoUrl && <img src={branding.logoUrl} className="h-20 object-contain mb-4" alt="Logo" />}
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">TAX INVOICE</h1>
          <p className="text-slate-500 font-medium mt-2">Invoice #: WHO-{order.id.slice(-8).toUpperCase()}</p>
          <p className="text-slate-500 font-medium">Date: {new Date(order.order_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-slate-900">{profile?.company_name}</h2>
          <p className="text-slate-600 mt-1 max-w-[300px] ml-auto">{profile?.address}</p>
          <p className="text-slate-600 font-bold mt-2">GSTIN: {profile?.gstin || "N/A"}</p>
          <p className="text-slate-600">{profile?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Billed To</h3>
          <p className="text-xl font-bold text-slate-900">{order.customer_name || "Walk-in Customer"}</p>
          <p className="text-slate-600 mt-1">{order.customer_phone || "No phone provided"}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Payment Status</h3>
          <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-full bg-green-500"></div>
             <p className="text-xl font-bold text-slate-900 capitalize">{order.status}</p>
          </div>
        </div>
      </div>

      <table className="w-full text-left mb-10 border-collapse">
        <thead>
          <tr className="bg-slate-900 text-white text-xs uppercase tracking-widest">
            <th className="p-4 rounded-tl-lg">Description</th>
            <th className="p-4 text-center">Quantity</th>
            <th className="p-4 text-right">Unit Price</th>
            <th className="p-4 text-right rounded-tr-lg">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items?.map((item: any, i: number) => (
            <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="p-4 font-bold text-slate-800 border-b border-slate-100">{item.products?.name}</td>
              <td className="p-4 text-center text-slate-600 border-b border-slate-100">{item.quantity}</td>
              <td className="p-4 text-right text-slate-600 border-b border-slate-100">₹{item.unit_price.toFixed(2)}</td>
              <td className="p-4 text-right font-bold text-slate-900 border-b border-slate-100">₹{item.line_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-12">
        <div className="w-96 space-y-3">
          <div className="flex justify-between text-slate-600 font-medium p-2">
             <span>Subtotal</span><span>₹{(order.total_amount - order.gst_amount).toFixed(2)}</span>
          </div>
          {branding.showTaxSummary !== false && (
            <div className="flex justify-between text-slate-600 font-medium p-2">
               <span>GST (18%)</span><span>₹{order.gst_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-2xl font-black text-slate-900 p-4 bg-slate-100 rounded-lg">
             <span>Total</span><span>₹{order.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-8 text-sm text-slate-500">
         <p className="font-bold text-slate-900 mb-1">Terms & Conditions</p>
         <p>1. All claims must be made within 7 days of delivery.</p>
         <p>2. Goods once sold will not be taken back without original invoice.</p>
         <p>3. Subject to local jurisdiction.</p>
      </div>
    </div>
  )

  const renderStandardOrModernReceipt = () => {
    const isModern = theme === 'modern'
    const isMinimal = theme === 'minimal'

    const containerClass = isModern 
      ? "max-w-4xl mx-auto bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-t-[12px] overflow-hidden" 
      : isMinimal 
      ? "max-w-2xl mx-auto bg-white border-4 border-slate-900 rounded-none shadow-none"
      : "max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"

    return (
      <div className={containerClass} style={isModern ? { borderTopColor: accentColor } : {}}>
        {/* Header Section */}
        {isMinimal ? (
          <div className="p-8 text-center text-slate-900 border-b-4 border-slate-900">
            <h1 className="text-3xl font-black uppercase tracking-tight">Receipt</h1>
            <p className="font-bold mt-2">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
        ) : (
          <div className="p-8 text-center text-white relative overflow-hidden" style={{ backgroundColor: accentColor }}>
            <div className="relative z-10">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 animate-bounce" />
              <h1 className="text-3xl font-bold uppercase tracking-tight">Payment Successful</h1>
              <p className="opacity-90 mt-1 text-sm">Thank you for your purchase from {profile?.company_name}</p>
            </div>
            {/* Decorative background element for modern */}
            {isModern && <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>}
          </div>
        )}

        <div className="p-8 md:p-12">
          {/* Business & Customer Header */}
          <div className={`flex flex-col md:flex-row justify-between gap-8 border-b-2 pb-8 ${isMinimal ? 'border-slate-900' : 'border-slate-100'} ${branding.logoAlignment === 'right' ? 'md:flex-row-reverse' : ''}`}>
            <div>
              {branding.logoUrl && (
                <img src={branding.logoUrl} alt={profile?.company_name} className={`h-16 object-contain mb-4 ${isMinimal ? 'grayscale' : ''}`} />
              )}
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Issued By</h2>
              <div className="space-y-1">
                <p className="text-xl font-black text-slate-900">{profile?.company_name}</p>
                <p className="text-slate-500 text-sm max-w-[250px]">{profile?.address}</p>
                <p className="text-slate-500 text-sm">GSTIN: {profile?.gstin || "N/A"}</p>
              </div>
            </div>
            <div className={`md:${branding.logoAlignment === 'right' ? 'text-left' : 'text-right'}`}>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Order Details</h2>
              <div className="space-y-1">
                <p className="text-slate-900 font-bold">#{order.id.slice(-8).toUpperCase()}</p>
                <p className="text-slate-500 text-sm">{new Date(order.order_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full uppercase mt-2 ${isMinimal ? 'border-2 border-slate-900 text-slate-900' : 'bg-green-100 text-green-700'}`}>
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className={`mt-10 mb-6 flex items-center gap-2 text-slate-900 font-bold border-b-2 pb-2 ${isMinimal ? 'border-slate-900' : 'border-slate-100'}`}>
             <Package className="w-5 h-5" />
             Order Items
          </div>

          <table className="w-full text-left mb-10">
            <thead>
              <tr className={`text-slate-500 text-xs uppercase tracking-widest ${isMinimal ? 'border-b-2 border-slate-900 text-slate-900' : 'border-b border-slate-100'}`}>
                <th className="py-4 font-bold">Item</th>
                <th className="py-4 font-bold text-center">Qty</th>
                <th className="py-4 font-bold text-right">Price</th>
                <th className="py-4 font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {order.order_items?.map((item: any) => (
                <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-5 font-bold text-slate-800">{item.products?.name || "Product"}</td>
                  <td className="py-5 text-center text-slate-600">
                    <span className={isModern ? "bg-slate-100 px-3 py-1 rounded-full text-xs font-bold" : ""}>{item.quantity}</span>
                  </td>
                  <td className="py-5 text-right text-slate-600">₹{item.unit_price.toFixed(2)}</td>
                  <td className="py-5 text-right font-black text-slate-900">₹{item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className={`flex flex-col md:flex-row items-start md:items-end justify-between gap-8 pt-8 border-t-2 ${isMinimal ? 'border-slate-900' : 'border-slate-100'}`}>
             <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                   <User className="w-4 h-4" />
                   <div className="text-sm">
                      <p className="font-bold text-slate-900">{order.customer_name || "Walk-in Customer"}</p>
                      <p className="text-xs text-slate-500">{order.customer_phone || "No phone provided"}</p>
                   </div>
                </div>
             </div>

             <div className={`p-6 w-full md:w-80 ${isMinimal ? 'border-4 border-slate-900' : isModern ? 'bg-slate-50 rounded-2xl' : 'bg-slate-50 rounded-xl'}`}>
                <div className="flex justify-between text-slate-600 mb-2 font-medium">
                   <span>Subtotal</span>
                   <span>₹{(order.total_amount - order.gst_amount).toFixed(2)}</span>
                </div>
                {branding.showTaxSummary !== false && (
                  <div className={`flex justify-between text-slate-600 mb-4 pb-4 border-b ${isMinimal ? 'border-slate-900 border-b-2' : 'border-slate-200'}`}>
                     <span>GST (18%)</span>
                     <span>₹{order.gst_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-black text-slate-900 mt-2">
                   <span>Total Paid</span>
                   <span style={isModern ? { color: accentColor } : {}}>₹{order.total_amount.toFixed(2)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4" style={{ '--accent-color': accentColor } as any}>
      
      {theme === 'retail' && renderRetailReceipt()}
      {theme === 'wholesale' && renderWholesaleReceipt()}
      {(theme === 'standard' || theme === 'modern' || theme === 'minimal') && renderStandardOrModernReceipt()}

      <div className="max-w-md mx-auto mt-12 text-center no-print">
        <Button 
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 w-full md:w-auto"
        >
          <Printer className="w-5 h-5 mr-2" />
          Download / Print Receipt
        </Button>
        <p className="text-slate-500 text-xs mt-6">
          This is a digital receipt for your transaction at {profile?.company_name}.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .min-h-screen { py-0 !important; }
          .shadow-2xl, .shadow-xl, .shadow-sm, .shadow-\\[0_20px_50px_rgba\\(0\\,0\\,0\\,0\\.1\\)\\] { shadow: none !important; }
        }
      `}</style>
    </div>
  )
}
