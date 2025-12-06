'use client'

import type { Hotel } from '@/types/database'
import { MapPin, Phone, Mail, Globe, ArrowUp } from 'lucide-react'
import Link from 'next/link'

interface FooterProps {
  hotel: Hotel
  roomNumber?: string
  hotelId?: string
}

export function Footer({ hotel, roomNumber, hotelId }: FooterProps) {
  // Company name to display in footer
  const companyName = 'Inntouch.co'
  
  // Parse contact information
  const address = hotel.address || ''
  const phone = hotel.phone || ''
  const email = hotel.email || ''
  const website = hotel.site || ''

  const currentYear = new Date().getFullYear()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToServices = () => {
    const servicesSection = document.querySelector('[data-section="services"]')
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-6">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-bold text-xl mb-4">{companyName}</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md">
              Your trusted partner for exceptional hospitality experiences. 
              We're committed to providing world-class service and creating memorable stays for all our guests.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-base mb-5 uppercase tracking-wide">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={scrollToServices}
                  className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-2 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                  <span>All Services</span>
                </button>
              </li>
              <li>
                <button
                  onClick={scrollToTop}
                  className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-2 group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                  <span>Back to Top</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold text-base mb-5 uppercase tracking-wide">Contact Us</h4>
            <ul className="space-y-4">
              {address && (
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-400 text-sm leading-relaxed">{address}</span>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-gray-500 flex-shrink-0" />
                  <a 
                    href={`tel:${phone.replace(/\s/g, '')}`} 
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-gray-500 flex-shrink-0" />
                  <a 
                    href={`mailto:${email}`} 
                    className="text-gray-400 hover:text-white text-sm transition-colors break-all"
                  >
                    {email}
                  </a>
                </li>
              )}
              {website && (
                <li className="flex items-center gap-3">
                  <Globe size={18} className="text-gray-500 flex-shrink-0" />
                  <a 
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white text-sm transition-colors break-all"
                  >
                    {website}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Legal Links */}
        <div className="border-t border-gray-800 pt-6 mb-4">
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
            {hotelId && (
              <>
                <Link 
                  href={`/guest/${hotelId}/legal/privacy-policy${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`} 
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link 
                  href={`/guest/${hotelId}/legal/terms-of-service${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`} 
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
                <span>•</span>
                <Link 
                  href={`/guest/${hotelId}/legal/cookie-policy${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`} 
                  className="hover:text-white transition-colors"
                >
                  Cookie Policy
                </Link>
              </>
            )}
            {roomNumber && hotelId && (
              <>
                <span>•</span>
                <Link 
                  href={`/guest/${hotelId}/privacy-settings?room=${encodeURIComponent(roomNumber)}`} 
                  className="hover:text-white transition-colors"
                >
                  Privacy Settings
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm text-center md:text-left">
              © {currentYear} {companyName}. All rights reserved.
            </p>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors group"
              aria-label="Scroll to top"
            >
              <span>Back to Top</span>
              <ArrowUp size={16} className="group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

