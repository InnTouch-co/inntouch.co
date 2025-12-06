'use client'

import { useState } from 'react'
import Slider from 'react-slick'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface ImageGalleryCarouselProps {
  images: string[]
  title?: string
}

function CustomArrow({ direction, onClick }: { direction: 'prev' | 'next'; onClick?: () => void }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  
  return (
    <button
      onClick={onClick}
      className={`
        absolute top-1/2 -translate-y-1/2 z-20
        ${direction === 'prev' ? 'left-4' : 'right-4'}
        w-14 h-14 rounded-full bg-white shadow-2xl
        flex items-center justify-center
        hover:scale-110 transition-transform
        group
      `}
      aria-label={direction === 'prev' ? 'Previous' : 'Next'}
    >
      <Icon size={20} className="text-gray-900 group-hover:text-gray-700" strokeWidth={2.5} />
    </button>
  )
}

export function ImageGalleryCarousel({ images, title }: ImageGalleryCarouselProps) {
  if (!images || images.length === 0) {
    return null
  }
  
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: true,
    prevArrow: <CustomArrow direction="prev" />,
    nextArrow: <CustomArrow direction="next" />,
  }
  
  return (
    <div className="w-full">
      {title && <h3 className="text-2xl font-semibold mb-4 text-gray-900">{title}</h3>}
      <div className="relative rounded-3xl overflow-hidden">
        <Slider {...settings}>
          {images.map((image, index) => (
            <div key={index} className="relative h-96">
              <Image
                src={image}
                alt={title ? `${title} - Image ${index + 1}` : `Gallery image ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </Slider>
      </div>
    </div>
  )
}

