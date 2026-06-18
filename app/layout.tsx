import type { Metadata } from "next"
import {
  Geist,
  Geist_Mono,
  Inter,
  Instrument_Serif,
  Newsreader,
} from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic"],
})

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "Invoice Layouts | Payment Hub",
  description: "Configure invoice templates within the Payments hub",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${newsreader.variable} ${instrumentSerif.variable} min-h-0 antialiased`}
      >
        <div className="h-full min-h-0">{children}</div>
      </body>
    </html>
  )
}
