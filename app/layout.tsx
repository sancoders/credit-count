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
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
          {children}
        </main>
        <footer className="site-footer px-4 py-5 text-center text-xs sm:px-6">
          Credit Count v1 <span className="mx-1 text-[#f5c661]">•</span> A credit is a unique coaster
          ridden at least once.
        </footer>
      </body>
    </html>
  )
}
