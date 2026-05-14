import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms',   label: 'Terms of Service' },
  { to: '/refund',  label: 'Refund Policy' },
  { to: '/contact', label: 'Contact' },
]

export default function Footer({ mini = false }) {
  const year = new Date().getFullYear()

  if (mini) {
    return (
      <div className="py-6 px-4 text-center">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-2">
          {LINKS.map((l, i) => (
            <span key={l.to} className="flex items-center gap-4">
              {i > 0 && <span className="text-stone-200 select-none">·</span>}
              <Link to={l.to} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                {l.label}
              </Link>
            </span>
          ))}
        </div>
        <p className="text-xs text-stone-300">© {year} NatGlow. All rights reserved.</p>
      </div>
    )
  }

  return (
    <footer className="border-t border-stone-200 bg-white mt-8">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="NatGlow" className="w-7 h-7 rounded-lg" />
            <span className="text-sm font-semibold text-stone-500">NatGlow</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
            {LINKS.map(l => (
              <Link key={l.to} to={l.to} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-stone-400">© {year} NatGlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
