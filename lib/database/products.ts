import { supabase } from '@/lib/supabase/client'
import type { Product, ProductInsert } from '@/types/database'

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, sort, title, descr, price, image, ext_data, active, is_deleted, created_at, updated_at')
    .eq('is_deleted', false)
    .order('sort', { ascending: true })

  if (error) throw error
  return data as Product[]
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('id, sort, title, descr, price, image, ext_data, active, is_deleted, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Product
}

export async function createProduct(product: ProductInsert) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProduct(id: string, product: Partial<ProductInsert>) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...product, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

