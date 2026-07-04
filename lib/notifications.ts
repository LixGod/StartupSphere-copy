import { createClient } from "@/lib/supabase/client"

export async function sendNotification(params: {
  actionType:
    | "inventory_updated"
    | "sale_created"
    | "accounting_updated"
    | "inventory_added"
    | "sale_updated"
    | "expense_added"
    | "invoice_added"
    | "low_stock_alert"
    | "out_of_stock_alert"
    | "high_value_sale"
    | "lead_captured"
    | "deal_won"
    | "deal_lost"
    | "membership_approved"
  entityType: "product" | "order" | "expense" | "invoice" | "lead" | "deal" | "membership"
  entityId: string
  message: string
  ownerId: string
  userId: string
}) {
  const supabase = createClient()

  try {
    // Get all employees for this owner
    const { data: employees } = await supabase
      .from("profiles")
      .select("id")
      .eq("owner_id", params.ownerId)
      .eq("role", "employee")

    // Create notifications for owner and all employees
    const notifications = [
      {
        owner_id: params.ownerId,
        user_id: params.ownerId,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        message: params.message,
      },
      ...(employees || []).map((emp: any) => ({
        owner_id: params.ownerId,
        user_id: emp.id,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        message: params.message,
      })),
    ]

    await supabase.from("notifications").insert(notifications)
  } catch (error) {
    console.error("Error sending notification:", error)
  }
}
