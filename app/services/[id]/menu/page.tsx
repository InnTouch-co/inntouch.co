'use client'

import { Suspense } from 'react'
import { MenuManagementPage } from '@/components/services/MenuManagementPage'

export default function ServiceMenuPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    }>
      <MenuManagementPage menuType="restaurant" />
    </Suspense>
  )
}



