import './globals.css'
import Link from 'next/link'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <nav className="bg-black text-white p-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="font-black italic text-xl tracking-tighter hover:text-blue-400 transition-colors">
              ATELIER OS
            </Link>
            <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
              <Link href="/" className="hover:text-blue-400">Order Entry</Link>
              <Link href="/workshop" className="hover:text-blue-400 underline decoration-blue-500 underline-offset-4">Workshop</Link>
              <Link href="/admin" className="hover:text-blue-400">Admin</Link>
              <Link href="/analytics" className="hover:text-blue-400 text-orange-400">Analytics</Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}