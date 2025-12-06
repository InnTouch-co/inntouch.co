'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import type { Room } from '@/types/database-extended'
import { logger } from '@/lib/utils/logger'

interface QRCodePrintViewProps {
  hotelId: string
  rooms: Room[]
}

export function QRCodePrintView({ hotelId, rooms }: QRCodePrintViewProps) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateAllQRCodes()
  }, [hotelId, rooms])

  const generateAllQRCodes = async () => {
    try {
      setLoading(true)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const codes: Record<string, string> = {}

      for (const room of rooms) {
        const url = `${baseUrl}/guest/${hotelId}?room=${encodeURIComponent(room.room_number)}`
        const dataUrl = await QRCode.toDataURL(url, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
        codes[room.room_number] = dataUrl
      }

      setQrCodes(codes)
    } catch (error) {
      logger.error('Error generating QR codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating QR codes...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <h2 className="text-2xl font-bold text-gray-900">QR Codes for All Rooms</h2>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Print All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 qr-print-grid">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg qr-print-card"
            >
              <div className="text-center mb-2">
                <p className="text-lg font-semibold text-gray-900">Room {room.room_number}</p>
              </div>
              {qrCodes[room.room_number] && (
                <div className="bg-white p-2 rounded qr-print-code-container">
                  <img
                    src={qrCodes[room.room_number]}
                    alt={`QR Code for Room ${room.room_number}`}
                    className="w-48 h-48 object-contain qr-print-code"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2 text-center">
                Scan to access guest services
              </p>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: letter portrait;
            margin: 0.5in;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          /* Hide all non-essential elements */
          nav, aside, header, footer {
            display: none !important;
          }
          
          /* Print container */
          body > div {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Grid layout for print - 3 columns on letter paper */
          .qr-print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.5in !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Each QR code card */
          .qr-print-card {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0.3in !important;
            border: 1px solid #000 !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            min-height: 2.5in !important;
            box-sizing: border-box !important;
          }
          
          /* Room label */
          .qr-print-card > div:first-child {
            margin-bottom: 0.15in !important;
          }
          
          .qr-print-card > div:first-child p {
            font-size: 14pt !important;
            font-weight: bold !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* QR Code container - ensure square */
          .qr-print-code-container {
            width: 1.8in !important;
            height: 1.8in !important;
            min-width: 1.8in !important;
            min-height: 1.8in !important;
            max-width: 1.8in !important;
            max-height: 1.8in !important;
            padding: 0.1in !important;
            background: white !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }
          
          /* QR Code image - square and centered */
          .qr-print-code {
            width: 100% !important;
            height: 100% !important;
            min-width: 100% !important;
            min-height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Scan text */
          .qr-print-card > p {
            font-size: 8pt !important;
            margin-top: 0.1in !important;
            margin-bottom: 0 !important;
            text-align: center !important;
            padding: 0 !important;
          }
        }
      `}} />
    </>
  )
}

