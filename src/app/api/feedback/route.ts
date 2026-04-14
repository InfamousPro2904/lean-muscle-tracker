import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

// GET /api/feedback — list all feedback items, newest first
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status')

  let query = supabase
    .from('feedback')
    .select('*')
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })

  if (category && category !== 'all') query = query.eq('category', category)
  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

// POST /api/feedback — create a new feedback item
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { title, body: feedbackBody, category } = body

  if (!title?.trim()) {
    return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
  }

  const VALID_CATEGORIES = ['feature', 'bug', 'improvement', 'question']
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 })
  }

  // Get author display name from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      author_name: profile?.full_name ?? 'Anonymous',
      title: title.trim(),
      body: feedbackBody?.trim() ?? null,
      category,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data }, { status: 201 })
}

// PATCH /api/feedback — toggle upvote or update status
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { action, feedback_id, status } = body

  if (action === 'upvote') {
    // Toggle upvote
    const { data: existing } = await supabase
      .from('feedback_upvotes')
      .select('feedback_id')
      .eq('feedback_id', feedback_id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Remove upvote
      await supabase
        .from('feedback_upvotes')
        .delete()
        .eq('feedback_id', feedback_id)
        .eq('user_id', user.id)

      await supabase.rpc('decrement_feedback_upvotes', { fid: feedback_id })
    } else {
      // Add upvote
      await supabase
        .from('feedback_upvotes')
        .insert({ feedback_id, user_id: user.id })

      await supabase.rpc('increment_feedback_upvotes', { fid: feedback_id })
    }

    const { data } = await supabase
      .from('feedback')
      .select('upvotes')
      .eq('id', feedback_id)
      .single()

    return NextResponse.json({ success: true, data: { hasUpvoted: !existing, upvotes: data?.upvotes ?? 0 } })
  }

  if (action === 'status') {
    const VALID_STATUSES = ['open', 'under_review', 'planned', 'implemented', 'wont_fix']
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    // Only the author can update status
    const { error } = await supabase
      .from('feedback')
      .update({ status })
      .eq('id', feedback_id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
}
