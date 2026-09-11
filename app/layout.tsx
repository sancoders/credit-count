import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Credit Count',
  description:
    'Track the rollercoasters you have ridden. Log every ride, watch your credit count grow, and appear on the leaderboard only if you want to.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border px-4 py-5 text-center text-xs text-muted">
          Credit Count v1 — a credit is a unique coaster ridden at least once.
        </footer>
      </body>
    </html>
  )
}
