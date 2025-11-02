import { supabase } from '@/lib/supabase/client'
import type { ServiceProduct } from '@/types/database'

export async function getServiceProducts(serviceId: string) {
  const { data, error } = await supabase
    .from('service_products')
    .select(`
      *,
      products (*)
    `)
    .eq('service_id', serviceId)
    .eq('is_deleted', false)

  if (error) throw error
  return data
}

export async function addProductToService(serviceId: string, productId: string) {
  const { data, error } = await supabase
    .from('service_products')
    .insert({
      service_id: serviceId,
      product_id: productId,
    })
    .select()
    .single()

  if (error) throw error
  return data as ServiceProduct
}

export async function removeProductFromService(serviceId: string, productId: string) {
  const { error } = await supabase
    .from('service_products')
    .update({ is_deleted: true })
    .eq('service_id', serviceId)
    .eq('product_id', productId)

  if (error) throw error
}

