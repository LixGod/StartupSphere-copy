import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, owner_id, can_manage_accounting, can_manage_sales")
      .eq("id", user.id)
      .single()

    const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id
    const canEdit =
      profile?.role === "owner" ||
      profile?.can_manage_accounting === true ||
      profile?.can_manage_sales === true

    if (!ownerId || !canEdit) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file")
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 })
    }

    const ext = file.type.split("/")[1] || "png"
    const path = `${ownerId}/branding/logo-${Date.now()}.${ext}`

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await service.storage.from("receipts").upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = service.storage.from("receipts").getPublicUrl(path)
    return NextResponse.json({ logoUrl: urlData.publicUrl })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
