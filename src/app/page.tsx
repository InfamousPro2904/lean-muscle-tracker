'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Dumbbell } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? '/dashboard' : '/login')
    }
    check()
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 animate-pulse">
        <Dumbbell className="w-8 h-8 text-green-500" />
        <span className="text-xl font-bold">Loading...</span>
      </div>
    </div>
  )
}
