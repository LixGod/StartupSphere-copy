"use client"

import { useState, useCallback, useEffect } from "react"
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  deleteProducts,
  getLocations
} from "@/lib/api"
import type { Product, BusinessLocation } from "@/lib/types"
import { useRealTime } from "./use-realtime"
import { createClient } from "@/lib/supabase/client"

export function useInventory(ownerId: string | null, selectedLocationId: string = "global") {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<BusinessLocation[]>([])
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    if (!ownerId) return
    setLoading(true)
    try {
      const [locationsData] = await Promise.all([
        getLocations(ownerId)
      ])
      
      let productsData: Product[] = []
      
      if (selectedLocationId === "global") {
        productsData = await getProducts(ownerId)
      } else {
        const { getLocationInventory } = await import("@/lib/api")
        const locInv = await getLocationInventory(selectedLocationId)
        // Map location-specific stock to product objects
        productsData = locInv.map(item => ({
          ...item.products,
          stock_quantity: item.stock_quantity,
          min_stock_level: item.min_stock_level
        }))
      }

      setProducts(productsData)
      setLocations(locationsData)
      setError(null)
    } catch (err: any) {
      console.error("Error loading inventory data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [ownerId, selectedLocationId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time
  useRealTime({
    table: "products",
    filter: ownerId ? `owner_id=eq.${ownerId}` : undefined,
    callback: loadData,
    enabled: !!ownerId
  })

  const addProductToInv = async (product: any) => {
    if (!ownerId) return
    return await createProduct({ ...product, owner_id: ownerId })
  }

  const deleteProductsBulk = async (ids: string[]) => {
    try {
      await deleteProducts(ids)
    } catch (err) {
      console.error("Error deleting products:", err)
      throw err
    }
  }

  const updateProductStock = async (id: string, updates: Partial<Product>) => {
    try {
      await updateProduct(id, updates)
    } catch (err) {
      console.error("Error updating product:", err)
      throw err
    }
  }

  const removeProduct = async (id: string) => {
    try {
      await deleteProduct(id)
    } catch (err) {
      console.error("Error deleting product:", err)
      throw err
    }
  }

  return {
    loading,
    products,
    locations,
    error,
    refresh: loadData,
    addProduct: addProductToInv,
    updateProduct: updateProductStock,
    deleteProduct: removeProduct,
    deleteProducts: deleteProductsBulk
  }
}
