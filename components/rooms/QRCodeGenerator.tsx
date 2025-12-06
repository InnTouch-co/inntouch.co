'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Download, Printer, X } from 'lucide-react'
import QRCode from 'qrcode'
import { logger } from '@/lib/utils/logger'

interface QRCodeGeneratorProps {
  hotelId: string
  roomNumber: string
  onClose?: () => void
}

export function QRCodeGenerator({ hotelId, roomNumber, onClose }: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateQRCode()
  }, [hotelId, roomNumber])

  const generateQRCode = async () => {
    try {
      setLoading(true)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const url = `${baseUrl}/guest/${hotelId}?room=${encodeURIComponent(roomNumber)}`
      
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      
      setQrCodeDataUrl(dataUrl)
    } catch (error) {
      logger.error('Error generating QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!qrCodeDataUrl) return
    
    const link = document.createElement('a')
    link.download = `qr-code-room-${roomNumber}.png`
    link.href = qrCodeDataUrl
    link.click()
  }

  const handlePrint = () => {
    if (!qrCodeDataUrl) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Room ${roomNumber}</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
            }
            .qr-code {
              margin: 20px 0;
            }
            .room-label {
              font-size: 24px;
              font-weight: bold;
              margin-top: 20px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="room-label">Room ${roomNumber}</div>
            <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
            <p>Scan to access guest services</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating QR code...</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">QR Code - Room {roomNumber}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center space-y-4">
        {qrCodeDataUrl && (
          <div className="bg-white p-4 rounded-lg">
            <img 
              src={qrCodeDataUrl} 
              alt={`QR Code for Room ${roomNumber}`} 
              className="w-64 h-64 object-contain" 
            />
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Scan this QR code to access guest services for Room {roomNumber}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download size={18} />
            Download
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer size={18} />
            Print
          </Button>
        </div>
      </div>
    </Card>
  )
}

