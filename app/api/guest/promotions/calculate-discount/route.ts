import { NextRequest, NextResponse } from 'next/server'
import { calculateItemDiscount, checkPromotionMinimumOrder } from '@/lib/database/promotions'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/guest/promotions/calculate-discount
 * Calculate discount for cart items
 * Body: { hotel_id, items: [{ product_id, price, quantity, service_type }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotel_id, items } = body

    if (!hotel_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'hotel_id and items array are required' },
        { status: 400 }
      )
    }

    const discounts = await Promise.all(
      items.map(async (item: { product_id: string; price: number; quantity: number; service_type?: string; service_id?: string; menu_item_name?: string }) => {
        try {
          const discount = await calculateItemDiscount(
            hotel_id,
            item.product_id,
            item.price,
            item.service_type,
            item.service_id,
            item.menu_item_name
          )
          
          return {
            product_id: item.product_id,
            original_price: item.price,
            quantity: item.quantity,
            discount_amount: discount.discountAmount,
            discounted_price: item.price - discount.discountAmount,
            total_discount: discount.discountAmount * item.quantity,
            promotion_id: discount.promotionId,
            discount_type: discount.discountType,
          }
        } catch (error: any) {
          logger.error('Error calculating discount for item:', {
            product_id: item.product_id,
            error: error.message || error,
          })
          // Return zero discount if calculation fails for this item
          return {
            product_id: item.product_id,
            original_price: item.price,
            quantity: item.quantity,
            discount_amount: 0,
            discounted_price: item.price,
            total_discount: 0,
            promotion_id: null,
            discount_type: null,
          }
        }
      })
    )

    const totalDiscount = discounts.reduce((sum, d) => sum + d.total_discount, 0)
    const totalOriginal = items.reduce((sum: number, item: { price: number; quantity: number }) => 
      sum + (item.price * item.quantity), 0
    )

    // Check minimum order amount requirement
    // Note: Minimum order is checked per service type's subtotal if items have different service types
    const uniqueServiceTypes = [...new Set(items.map((i: any) => i.service_type).filter(Boolean))]
    
    let minOrderCheck = { meetsMinimum: true, promotionId: null, minOrderAmount: null }
    
    if (uniqueServiceTypes.length === 1) {
      // All items from same service, check minimum order for that service type
      const serviceType = uniqueServiceTypes[0]
      minOrderCheck = await checkPromotionMinimumOrder(hotel_id, totalOriginal, serviceType)
    } else if (uniqueServiceTypes.length > 1) {
      // Items from different services - check minimum order per service type's subtotal
      // Calculate subtotal per service type and check minimum order for each
      const serviceTypeTotals = uniqueServiceTypes.reduce((acc, st) => {
        const subtotal = items
          .filter((i: any) => i.service_type === st)
          .reduce((sum: number, item: { price: number; quantity: number }) => 
            sum + (item.price * item.quantity), 0)
        acc[st] = subtotal
        return acc
      }, {} as Record<string, number>)
      
      // Check minimum order for each service type
      const checks = await Promise.all(
        uniqueServiceTypes.map(async (st) => {
          const subtotal = serviceTypeTotals[st]
          return await checkPromotionMinimumOrder(hotel_id, subtotal, st)
        })
      )
      
      // If any service type doesn't meet minimum order, set meetsMinimum to false
      const allMeetMinimum = checks.every(check => check.meetsMinimum || !check.minOrderAmount || check.minOrderAmount === 0)
      minOrderCheck = {
        meetsMinimum: allMeetMinimum,
        promotionId: checks.find(c => !c.meetsMinimum)?.promotionId || null,
        minOrderAmount: checks.find(c => !c.meetsMinimum)?.minOrderAmount || null
      }
    } else {
      // No service types specified, skip minimum order check
      minOrderCheck = { meetsMinimum: true, promotionId: null, minOrderAmount: null }
    }
    
    // If minimum order amount is not met, return zero discounts
    if (!minOrderCheck.meetsMinimum && minOrderCheck.minOrderAmount && minOrderCheck.minOrderAmount > 0) {
      // Log only when minimum order is not met (important for debugging)
      logger.warn('Minimum order amount not met, returning zero discounts', {
        cartTotal: totalOriginal,
        minOrderAmount: minOrderCheck.minOrderAmount,
        promotionId: minOrderCheck.promotionId
      })
      
      // Return zero discounts for all items
      const zeroDiscounts = items.map((item: { product_id: string; price: number; quantity: number }) => ({
        product_id: item.product_id,
        original_price: item.price,
        quantity: item.quantity,
        discount_amount: 0,
        discounted_price: item.price,
        total_discount: 0,
        promotion_id: null,
        discount_type: null,
      }))

      return NextResponse.json({
        discounts: zeroDiscounts,
        summary: {
          total_original: totalOriginal,
          total_discount: 0,
          total_after_discount: totalOriginal,
        },
        min_order_requirement: {
          met: false,
          min_order_amount: minOrderCheck.minOrderAmount,
          current_total: totalOriginal,
          promotion_id: minOrderCheck.promotionId,
        },
      })
    }

    return NextResponse.json({
      discounts,
      summary: {
        total_original: totalOriginal,
        total_discount: totalDiscount,
        total_after_discount: totalOriginal - totalDiscount,
      },
    })
  } catch (error: any) {
    logger.error('Error calculating discount:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate discount' },
      { status: 500 }
    )
  }
}

