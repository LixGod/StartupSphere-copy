import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

async function resolveOwnerId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, owner_id, can_manage_accounting, can_manage_sales")
    .eq("id", userId)
    .single()

  if (error || !profile) return { error: "Profile not found" as const }

  const ownerId = profile.role === "owner" ? profile.id : profile.owner_id
  if (!ownerId) return { error: "Business owner not found" as const }

  const canEdit =
    profile.role === "owner" ||
    profile.can_manage_accounting === true ||
    profile.can_manage_sales === true

  if (!canEdit) return { error: "You do not have permission to edit invoice branding" as const }

  return { ownerId, profile }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const resolved = await resolveOwnerId(supabase, user.id)
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 403 })
    }

    const { data: ownerProfile, error } = await supabase
      .from("profiles")
      .select("id, company_name, gstin, address, email, branding_settings")
      .eq("id", resolved.ownerId)
      .single()

    if (error) {
      const service = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: ownerViaService, error: serviceError } = await service
        .from("profiles")
        .select("id, company_name, gstin, address, email, branding_settings")
        .eq("id", resolved.ownerId)
        .single()

      if (serviceError || !ownerViaService) {
        return NextResponse.json({ error: serviceError?.message || "Failed to load branding" }, { status: 500 })
      }
      return NextResponse.json({ profile: ownerViaService, ownerId: resolved.ownerId })
    }

    return NextResponse.json({ profile: ownerProfile, ownerId: resolved.ownerId })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load branding"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const resolved = await resolveOwnerId(supabase, user.id)
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 403 })
    }

    const body = await req.json()
    const branding_settings = {
      ...(typeof body.existing === "object" ? body.existing : {}),
      ...(typeof body.branding_settings === "object" ? body.branding_settings : {}),
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await service
      .from("profiles")
      .update({ branding_settings })
      .eq("id", resolved.ownerId)
      .select("id, branding_settings")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to save branding"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
