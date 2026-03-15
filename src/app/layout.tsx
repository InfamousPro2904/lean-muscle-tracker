import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lean Muscle Tracker',
  description: 'Fitness routine planning, diet tracking, and progress monitoring for lean muscle building',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
