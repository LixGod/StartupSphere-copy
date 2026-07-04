import { createClient } from "@/lib/supabase/client"
import { encrypt, decrypt } from "@/lib/utils/encryption"

/**
 * Service to manage tenant-specific communication credentials
 */
export const TenantCommsService = {
  /**
   * Saves or updates credentials for a provider
   */
  async saveCredentials(ownerId: string, provider: string, credentials: any) {
    const supabase = createClient()
    const encryptedData = encrypt(JSON.stringify(credentials))

    const { data, error } = await supabase
      .from("tenant_comms_credentials")
      .upsert({
        owner_id: ownerId,
        provider,
        credentials: encryptedData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Fetches and decrypts credentials for a provider
   */
  async getCredentials(ownerId: string, provider: string) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("tenant_comms_credentials")
      .select("credentials")
      .eq("owner_id", ownerId)
      .eq("provider", provider)
      .single()

    if (error || !data) return null
    
    try {
      const decrypted = decrypt(data.credentials)
      return JSON.parse(decrypted)
    } catch (err) {
      console.error(`Failed to decrypt credentials for ${provider}:`, err)
      return null
    }
  },

  /**
   * Saves communication settings
   */
  async saveSettings(ownerId: string, settings: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("comms_settings")
      .upsert({
        owner_id: ownerId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Fetches communication settings
   */
  async getSettings(ownerId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("comms_settings")
      .select("*")
      .eq("owner_id", ownerId)
      .single()

    if (error) return null
    return data
  }
}
