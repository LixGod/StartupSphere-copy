import type { BrandingSettings } from "@/components/accounting/invoice-design-studio"

export function mergeBranding(
  saved: BrandingSettings | null | undefined,
  overrides: BrandingSettings & { theme?: string }
): BrandingSettings & { theme: string } {
  return {
    showTaxSummary: overrides.showTaxSummary ?? saved?.showTaxSummary ?? true,
    logoAlignment: overrides.logoAlignment ?? saved?.logoAlignment ?? "left",
    showQRCode: overrides.showQRCode ?? saved?.showQRCode ?? false,
    accentColor: overrides.accentColor ?? saved?.accentColor ?? "#2563eb",
    logoUrl: overrides.logoUrl ?? saved?.logoUrl ?? "",
    upi_id: overrides.upi_id ?? saved?.upi_id ?? "",
    theme: overrides.theme ?? saved?.theme ?? "standard",
  }
}

export function buildReceiptSearchParams(branding: BrandingSettings & { theme?: string }): string {
  const theme = branding.theme || "standard"
  const params = new URLSearchParams()
  params.set("theme", theme)
  if (branding.accentColor) params.set("accent", branding.accentColor)
  if (branding.logoUrl) params.set("logo", branding.logoUrl)
  if (branding.logoAlignment) params.set("logoAlign", branding.logoAlignment)
  params.set("tax", branding.showTaxSummary === false ? "0" : "1")
  if (branding.showQRCode) params.set("qr", "1")
  return params.toString()
}

export function brandingFromSearchParams(
  searchParams: URLSearchParams,
  saved: BrandingSettings | null | undefined
): BrandingSettings & { theme: string } {
  const fromQuery: BrandingSettings = {}
  const theme = searchParams.get("theme")
  const accent = searchParams.get("accent")
  const logo = searchParams.get("logo")
  const logoAlign = searchParams.get("logoAlign")
  const tax = searchParams.get("tax")
  const qr = searchParams.get("qr")

  if (theme) fromQuery.theme = theme
  if (accent) fromQuery.accentColor = accent
  if (logo) fromQuery.logoUrl = logo
  if (logoAlign === "left" || logoAlign === "right") fromQuery.logoAlignment = logoAlign
  if (tax === "0") fromQuery.showTaxSummary = false
  if (tax === "1") fromQuery.showTaxSummary = true
  if (qr === "1") fromQuery.showQRCode = true

  return mergeBranding(saved, fromQuery)
}
