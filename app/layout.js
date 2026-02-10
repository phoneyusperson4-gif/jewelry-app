import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'Atelier Production',
  description: 'Jewelry Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        {/* NAVIGATION BAR */}
        <nav className="bg-black text-white p-4 sticky top-0 z-50 shadow-lg print:hidden">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <span className="font-black tracking-tighter text-xl">ATELIER</span>
            <div className="flex gap-6 text-xs font-bold uppercase tracking-widest">
              <Link href="/" className="hover:text-blue-400">Order Entry</Link>
              <Link href="/casting" className="hover:text-blue-400">Casting Arrival</Link>
              <Link href="/workshop" className="hover:text-blue-400">Workshop</Link>
              <Link href="/admin" className="hover:text-blue-400">Admin</Link>
            </div>
          </div>
        </nav>

        <main>{children}</main>
      </body>
    </html>
  )
}