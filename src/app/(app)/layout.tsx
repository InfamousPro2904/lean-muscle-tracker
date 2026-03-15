import Navbar from '@/components/Navbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <main className="md:ml-64 pt-16 md:pt-0 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
