import { ReactQueryProvider } from '@/lib/react-query/provider'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ReactQueryProvider>
      {children}
    </ReactQueryProvider>
  )
}

