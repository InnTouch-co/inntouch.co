'use client'

import { Service } from '@/lib/guest/types'
import { Phone, Mail } from 'lucide-react'

interface ContactInfoProps {
  service: Service
}

export function ContactInfo({ service }: ContactInfoProps) {
  // Check if contact exists and has any data
  const hasContact = service.contact && (
    service.contact.phone || 
    service.contact.email || 
    service.contact.extension
  )
  
  if (!hasContact) {
    return null
  }
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <h4 className="font-semibold text-white mb-4">Contact</h4>
      <div className="space-y-3">
        {service.contact.phone && (
          <div className="flex items-center gap-3">
            <Phone size={20} className="text-gray-300" />
            <a href={`tel:${service.contact.phone}`} className="text-white hover:text-gray-300">
              {service.contact.phone}
            </a>
            {service.contact.extension && (
              <span className="text-gray-400">ext. {service.contact.extension}</span>
            )}
          </div>
        )}
        {service.contact.email && (
          <div className="flex items-center gap-3">
            <Mail size={20} className="text-gray-300" />
            <a href={`mailto:${service.contact.email}`} className="text-white hover:text-gray-300">
              {service.contact.email}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

