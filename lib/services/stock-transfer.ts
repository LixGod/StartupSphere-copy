import { createClient } from "@/lib/supabase/client"

export class StockTransferService {
  private static supabase = createClient()

  static async transferStock(params: {
    productId: string
    fromLocationId: string
    toLocationId: string
    quantity: number
    ownerId: string
  }) {
    // This would typically be a database transaction or a stored procedure (RPC)
    // For now, we perform two updates and a log entry
    
    // 1. Decrease from source
    const { error: decError } = await this.supabase.rpc('adjust_inventory', {
      p_product_id: params.productId,
      p_location_id: params.fromLocationId,
      p_quantity: -params.quantity,
      p_owner_id: params.ownerId
    })

    if (decError) throw decError

    // 2. Increase at destination
    const { error: incError } = await this.supabase.rpc('adjust_inventory', {
      p_product_id: params.productId,
      p_location_id: params.toLocationId,
      p_quantity: params.quantity,
      p_owner_id: params.ownerId
    })

    if (incError) throw incError

    // 3. Log the transfer
    await this.supabase.from('inventory_logs').insert({
      product_id: params.productId,
      location_id: params.toLocationId,
      owner_id: params.ownerId,
      change_amount: params.quantity,
      change_type: 'transfer',
      notes: `Transfer from ${params.fromLocationId}`
    })

    return true
  }
}
