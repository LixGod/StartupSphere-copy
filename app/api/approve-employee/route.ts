import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!supabaseUrl) {
      console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase URL' },
        { status: 500 }
      )
    }

    if (!supabaseServiceKey) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server configuration error: Missing service role key' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      email,
      password,
      companyName,
      ownerId,
      requestId,
    } = body

    if (!email) {
      return NextResponse.json({ error: 'Missing employee email' }, { status: 400 })
    }

    const emailLower = String(email).toLowerCase()

    // Use service role key to bypass RLS and email verification
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    let userId: string | null = null

    // 1. Check if profile already exists for this email
    const { data: existingProf } = await adminSupabase
      .from('profiles')
      .select('id')
      .ilike('email', emailLower)
      .maybeSingle()

    if (existingProf?.id) {
      userId = existingProf.id
      // Update password of existing user
      try {
        await adminSupabase.auth.admin.updateUserById(userId, { password })
      } catch (pwErr) {
        console.warn('Password update for existing auth user skipped:', pwErr)
      }
    } else {
      // 2. Search auth users list
      try {
        const { data: userList } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 })
        const foundUser = userList?.users?.find((u) => u.email?.toLowerCase() === emailLower)
        if (foundUser?.id) {
          userId = foundUser.id
          await adminSupabase.auth.admin.updateUserById(userId, { password })
        }
      } catch (listErr) {
        console.warn('User search error:', listErr)
      }
    }

    // 3. If user still not found, attempt creation
    if (!userId) {
      const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          company_name: companyName,
          role: 'employee',
        },
      })

      if (authError) {
        console.warn('Auth creation error:', authError.message)
        // If auth user already exists in DB but wasn't returned, search profiles or fail gracefully
        const { data: fallbackProf } = await adminSupabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()

        if (fallbackProf?.id) {
          userId = fallbackProf.id
        } else {
          return NextResponse.json(
            { error: `Auth creation failed: ${authError.message}` },
            { status: 400 }
          )
        }
      } else if (newUser?.user?.id) {
        userId = newUser.user.id
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to create or find auth user for employee' },
        { status: 400 }
      )
    }

    // Upsert profile
    const { error: profileError } = await adminSupabase.from('profiles').upsert({
      id: userId,
      company_name: companyName,
      role: 'employee',
      owner_id: ownerId,
      email: email,
      status: 'active',
    }, {
      onConflict: 'id'
    })

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 400 }
      )
    }

    // Insert default permissions using the actual column names from the schema.
    // The table has a UNIQUE constraint on employee_id (not employee_id,branch_id).
    const { error: permError } = await adminSupabase
      .from('employee_permissions')
      .upsert({
        owner_id: ownerId,
        employee_id: userId,
        can_view_inventory: true,
        can_edit_inventory: false,
        can_view_sales: true,
        can_create_sales: true,
        can_view_accounting: false,
        can_manage_crm: false,
      }, {
        onConflict: 'employee_id'
      })

    if (permError) {
      console.error('❌ Permissions creation error:', permError)
      // Non-fatal — log but continue so the employee is still approved
    }

    // Mark the request as approved
    const { error: requestUpdateError } = await adminSupabase
      .from('employee_requests')
      .update({
        status: 'approved',
        employee_user_id: userId,
      })
      .eq('id', requestId)

    if (requestUpdateError) {
      console.error('❌ Request update error:', requestUpdateError)
      return NextResponse.json(
        { error: `Request update failed: ${requestUpdateError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      userId,
    })
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      { error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
