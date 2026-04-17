import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Workout Routine',
  description: 'Plan workouts, track nutrition, and monitor progress — your complete training system.',
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
