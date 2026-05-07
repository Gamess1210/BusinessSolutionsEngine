import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from '../../lib/auth'

export default function Layout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-grey-light flex flex-col">
      
      {/* Top nav */}
      <header className="bg-navy text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-wide">
            <span className="text-white">C</span>
            <span className="text-cgreen">O</span>
            <span className="text-white">M</span>
            <span className="text-cblue">O</span>
            <span className="text-white">T</span>
            <span className="text-cred">I</span>
            <span className="text-white">ON</span>
          </span>
          <span className="text-grey-mid text-sm font-medium tracking-widest uppercase ml-2">
            Business Solutions Engine
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'text-cgreen font-semibold' : 'text-grey-mid hover:text-white transition-colors'
            }
          >
            Engagements
          </NavLink>
          <NavLink
            to="/new"
            className={({ isActive }) =>
              isActive ? 'text-cgreen font-semibold' : 'text-grey-mid hover:text-white transition-colors'
            }
          >
            + New
          </NavLink>
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            className="text-grey-mid hover:text-white transition-colors"
          >
            Sign out
          </button>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-grey-mid px-6 py-3 text-xs text-grey-dark flex justify-between">
        <span>Comotion Business Solutions</span>
        <span>INTERNAL</span>
      </footer>

    </div>
  )
}