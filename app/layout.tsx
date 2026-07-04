import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Unbounded, DM_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
}

export const metadata: Metadata = {
  title: "StartupSphere — AI-Powered Business OS",
  description:
    "The complete AI-powered business operating system. Manage operations, automate workflows, boost sales, and scale faster — all from one platform.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StartupSphere",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased ${unbounded.variable} ${dmSans.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

