"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Palette, Layout, Image as ImageIcon, Check, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useBusinessContext } from "@/lib/hooks/use-business-context"

export interface BrandingSettings {
  theme?: string
  showTaxSummary?: boolean
  logoAlignment?: "left" | "right"
  showQRCode?: boolean
  accentColor?: string
  logoUrl?: string
  upi_id?: string
}

interface InvoiceDesignStudioProps {
  currentTheme: string
  onThemeChange: (theme: string) => void
  onBrandingChange?: (settings: BrandingSettings, theme: string) => void
}

const defaultSettings = (branding?: BrandingSettings | null): BrandingSettings => ({
  showTaxSummary: branding?.showTaxSummary ?? true,
  logoAlignment: branding?.logoAlignment ?? "left",
  showQRCode: branding?.showQRCode ?? false,
  accentColor: branding?.accentColor ?? "#2563eb",
  logoUrl: branding?.logoUrl ?? "",
  theme: branding?.theme ?? "standard",
  upi_id: branding?.upi_id ?? "",
})

export function InvoiceDesignStudio({
  currentTheme,
  onThemeChange,
  onBrandingChange,
}: InvoiceDesignStudioProps) {
  const { ownerId, refreshProfile } = useBusinessContext()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState<{
    company_name?: string
    gstin?: string
    address?: string
    branding_settings?: BrandingSettings
  } | null>(null)
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings())

  const loadBranding = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/profile/branding")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load branding")
      }
      const data = await res.json()
      setOwnerProfile(data.profile)
      const branding = data.profile?.branding_settings as BrandingSettings | undefined
      setSettings(defaultSettings(branding))
      if (branding?.theme && branding.theme !== currentTheme) {
        onThemeChange(branding.theme)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load design settings")
    } finally {
      setIsLoading(false)
    }
  }, [currentTheme, onThemeChange])

  useEffect(() => {
    if (ownerId) loadBranding()
  }, [ownerId, loadBranding])

  useEffect(() => {
    onBrandingChange?.({ ...settings, theme: currentTheme }, currentTheme)
  }, [settings, currentTheme, onBrandingChange])

  const themes = [
    { id: "standard", name: "Standard GST", description: "Classic Indian GST format", color: "bg-blue-600" },
    { id: "modern", name: "Modern Corporate", description: "Sleek, colorful and premium", color: "bg-purple-600" },
    { id: "minimal", name: "Minimalist", description: "Clean, black and white focus", color: "bg-slate-900" },
    { id: "retail", name: "Retail POS", description: "Compact for thermal printers", color: "bg-emerald-600" },
    { id: "wholesale", name: "Wholesale", description: "Detailed for bulk transactions", color: "bg-amber-600" },
  ]

  const handleSaveSettings = async () => {
    if (!ownerId) {
      toast.error("Business account not loaded. Refresh the page.")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/profile/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding_settings: {
            ...settings,
            theme: currentTheme,
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      await refreshProfile()
      await loadBranding()
      onBrandingChange?.({ ...settings, theme: currentTheme }, currentTheme)
      toast.success("Invoice branding saved as default")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !ownerId) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB")
      return
    }

    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/profile/branding/logo", {
        method: "POST",
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setSettings((prev) => ({ ...prev, logoUrl: data.logoUrl }))
      toast.success("Logo uploaded — click Save as Default to apply")
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Logo upload failed")
    }
  }

  const toggleSetting = (key: "showTaxSummary" | "showQRCode") => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Invoice Design Studio</h3>
            <p className="text-sm text-slate-500">
              Templates for {ownerProfile?.company_name || "your business"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
          <Button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save as Default"
            )}
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="mb-8 flex justify-center bg-slate-950/50 rounded-xl p-6 border border-slate-800">
          {currentTheme === "retail" ? (
            <div className="max-w-xs w-full bg-white p-5 font-mono text-xs border shadow-sm text-slate-900">
              <div className="text-center mb-4">
                {settings.logoUrl && (
                  <img src={settings.logoUrl} alt="" className="h-10 mx-auto mb-2 grayscale object-contain" />
                )}
                <p className="font-bold uppercase">{ownerProfile?.company_name || "Your Business"}</p>
                <p className="text-[10px] text-slate-600 mt-1">{ownerProfile?.address || "Address"}</p>
              </div>
              <div className="border-y border-dashed border-slate-400 py-2 mb-3 space-y-0.5">
                <div className="flex justify-between">
                  <span>RCPT:</span>
                  <span>#SAMPLE</span>
                </div>
                <div className="flex justify-between">
                  <span>CUST:</span>
                  <span>Walk-in</span>
                </div>
              </div>
              <div className="flex justify-between font-bold border-b border-dashed pb-1 mb-2">
                <span>Item</span>
                <span>Total</span>
              </div>
              <div className="flex justify-between mb-3">
                <span>Sample Product</span>
                <span>₹1,000</span>
              </div>
              {settings.showTaxSummary !== false && (
                <div className="flex justify-between text-slate-600">
                  <span>GST</span>
                  <span>₹180</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base mt-2 pt-2 border-t border-dashed">
                <span>TOTAL</span>
                <span>₹1,180</span>
              </div>
            </div>
          ) : currentTheme === "wholesale" ? (
            <div className="max-w-2xl w-full bg-white p-8 border-2 border-slate-900 text-slate-900 shadow-lg">
              <div className="flex justify-between border-b-4 border-slate-900 pb-4 mb-6">
                <h4 className="text-2xl font-black uppercase">Tax Invoice</h4>
                <div className="text-right text-sm">
                  <p className="font-bold">{ownerProfile?.company_name || "Your Business"}</p>
                  <p className="text-slate-600">{ownerProfile?.gstin || "GSTIN —"}</p>
                </div>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs">
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 font-bold">Sample Product</td>
                    <td className="p-2 text-right">₹1,000</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-2xl font-black text-right">Total ₹1,180</p>
            </div>
          ) : currentTheme === "minimal" ? (
            <div className="max-w-md w-full bg-white border-4 border-slate-900 p-8 text-slate-900">
              <h4 className="text-2xl font-black uppercase text-center border-b-4 border-slate-900 pb-4">
                Receipt
              </h4>
              <p className="text-center font-bold mt-4">#{ownerProfile?.company_name || "Your Business"}</p>
              <table className="w-full text-sm mt-6 border-t-2 border-slate-900 pt-4">
                <tbody>
                  <tr>
                    <td>Sample Product</td>
                    <td className="text-right font-bold">₹1,000</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xl font-black text-right mt-4 border-t-4 border-slate-900 pt-4">
                Total ₹1,180
              </p>
            </div>
          ) : (
            <div
              className={`max-w-lg w-full bg-white overflow-hidden shadow-xl text-slate-900 ${
                currentTheme === "modern" ? "rounded-[1.5rem] border-t-[10px]" : "rounded-2xl"
              }`}
              style={
                currentTheme === "modern"
                  ? { borderTopColor: settings.accentColor }
                  : undefined
              }
            >
              <div
                className="p-6 text-center text-white"
                style={{ backgroundColor: settings.accentColor }}
              >
                <p className="text-lg font-bold uppercase">
                  {currentTheme === "modern" ? "Invoice" : "Payment Successful"}
                </p>
                <p className="text-xs opacity-90 mt-1">{ownerProfile?.company_name || "Your Business"}</p>
              </div>
              <div className="p-6">
                <div
                  className={`flex mb-4 ${settings.logoAlignment === "right" ? "flex-row-reverse text-right" : ""}`}
                >
                  {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="" className="h-12 object-contain mr-3" />
                  )}
                  <div>
                    <p className="font-bold">{ownerProfile?.company_name}</p>
                    <p className="text-xs text-slate-500">{ownerProfile?.address}</p>
                  </div>
                </div>
                <table className="w-full text-sm border-t pt-3">
                  <tbody>
                    <tr>
                      <td className="py-1">Sample Product</td>
                      <td className="py-1 text-right font-bold">₹1,000</td>
                    </tr>
                  </tbody>
                </table>
                {settings.showTaxSummary !== false && (
                  <p className="text-sm text-right mt-3 text-slate-600">GST: ₹180</p>
                )}
                <p
                  className="text-lg font-bold text-right mt-2"
                  style={{ color: settings.accentColor }}
                >
                  Total: ₹1,180
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {themes.map((theme) => (
          <button
            type="button"
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all text-left ${
              currentTheme === theme.id
                ? "border-blue-600 bg-blue-600/5"
                : "border-slate-800 bg-slate-950 hover:border-slate-700"
            }`}
          >
            <div
              className={`w-full h-24 rounded-lg mb-3 ${theme.color} opacity-40 relative flex items-center justify-center`}
            >
              {currentTheme === theme.id && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full">
                  <Check className="w-3 h-3" />
                </div>
              )}
              <Layout className="w-8 h-8 text-white/50" />
            </div>
            <p className="font-bold text-sm text-white">{theme.name}</p>
            <p className="text-[10px] text-slate-500 mt-1">{theme.description}</p>
          </button>
        ))}
      </div>

      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Layout Settings</h4>
          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onChange={handleLogoUpload}
              accept="image/*"
            />
            <Button type="button" variant="ghost" size="sm" className="text-xs text-slate-400 pointer-events-none">
              <ImageIcon className="w-3 h-3 mr-2" />
              {settings.logoUrl ? "Change Logo" : "Upload Logo"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => toggleSetting("showTaxSummary")}
            className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between hover:border-slate-700"
          >
            <span className="text-xs text-slate-400">Tax Summary</span>
            <div
              className={`w-8 h-4 rounded-full relative ${settings.showTaxSummary ? "bg-blue-600" : "bg-slate-700"}`}
            >
              <div
                className={`absolute top-1 w-2 h-2 bg-white rounded-full ${settings.showTaxSummary ? "right-1" : "left-1"}`}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                logoAlignment: prev.logoAlignment === "left" ? "right" : "left",
              }))
            }
            className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between hover:border-slate-700"
          >
            <span className="text-xs text-slate-400">Logo Alignment</span>
            <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-0.5 rounded uppercase">
              {settings.logoAlignment}
            </span>
          </button>

          <button
            type="button"
            onClick={() => toggleSetting("showQRCode")}
            className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between hover:border-slate-700"
          >
            <span className="text-xs text-slate-400">Show QR Code</span>
            <div className={`w-8 h-4 rounded-full relative ${settings.showQRCode ? "bg-blue-600" : "bg-slate-700"}`}>
              <div
                className={`absolute top-1 w-2 h-2 bg-white rounded-full ${settings.showQRCode ? "right-1" : "left-1"}`}
              />
            </div>
          </button>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Accent Color</span>
            <div className="relative">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => setSettings((prev) => ({ ...prev, accentColor: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">UPI ID (shown on WhatsApp invoices)</label>
          <input
            type="text"
            value={settings.upi_id || ""}
            onChange={(e) => setSettings((prev) => ({ ...prev, upi_id: e.target.value }))}
            placeholder="business@upi"
            className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm"
          />
        </div>

        {settings.logoUrl && (
          <div className="p-3 bg-blue-600/5 border border-blue-600/20 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded p-1 shrink-0">
              <img src={settings.logoUrl} alt="Company Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-white">Active Company Logo</p>
              <p className="text-[9px] text-slate-500 truncate">Theme: {currentTheme}</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, logoUrl: "" }))}
              className="text-red-400 hover:text-red-300 text-[10px] font-bold shrink-0"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
