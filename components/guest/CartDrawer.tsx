'use client'

import { CartItem } from '@/lib/guest/types'
import { calculateTotal } from '@/lib/guest/utils/serviceHelpers'
import { X, Plus, Minus, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  onUpdateQuantity: (itemId: string, delta: number) => void
  onRemoveItem: (itemId: string) => void
  onCheckout: () => void
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  const total = calculateTotal(cart)
  
  if (!isOpen) return null
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 z-50 shadow-2xl flex flex-col border-l border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-semibold text-white">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center mb-4">
                <X size={48} className="text-white/60" />
              </div>
              <p className="text-white/80 text-lg">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => {
                const imageUrl = (item.menuItem as any).image || (item.menuItem as any).photo
                return (
                  <div key={item.menuItem.id} className="flex gap-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                    {imageUrl && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                        <Image
                          src={imageUrl}
                          alt={item.menuItem.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1">{item.menuItem.name}</h3>
                      <p className="text-sm text-white/70 mb-2">${item.menuItem.price.toFixed(2)} each</p>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 border border-white/20 rounded-lg bg-white/5">
                          <button
                            onClick={() => onUpdateQuantity(item.menuItem.id, -1)}
                            className="p-1.5 hover:bg-white/10 transition-colors"
                          >
                            <Minus size={16} className="text-white" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium text-white min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.menuItem.id, 1)}
                            className="p-1.5 hover:bg-white/10 transition-colors"
                          >
                            <Plus size={16} className="text-white" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => onRemoveItem(item.menuItem.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        ${(item.menuItem.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-white/10 p-6 space-y-4 bg-gray-900/95 backdrop-blur-sm">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-300">
                💡 Prices shown are before tax. Taxes will be calculated at checkout.
              </p>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-white/80">Subtotal:</span>
              <span className="font-bold text-white">${total.toFixed(2)}</span>
            </div>
            
            <button
              onClick={onCheckout}
              className="w-full py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-all hover:scale-105"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  )
}

