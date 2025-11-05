import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  onClick?: () => void
}

export function Card({ children, className = '', title, onClick }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}
      onClick={onClick}
    >
      {title && (
        <h2 className="text-lg font-semibold mb-4 text-gray-900">{title}</h2>
      )}
      <div className="h-full">
        {children}
      </div>
    </div>
  )
}

