import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardShell({ children }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm transition-colors ${
        location.pathname === to
          ? 'text-[var(--color-bone)]'
          : 'text-[var(--color-bone-dim)] hover:text-[var(--color-bone)]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-[var(--color-bone)]">
      <nav className="border-b border-[var(--color-ink-line)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="font-[var(--font-display)] text-lg tracking-tight">
              Pulse<span className="text-[var(--color-blood)]">.</span>
            </Link>
            <div className="hidden md:flex gap-6">
              {navLink('/dashboard', 'Dashboard')}
              {navLink('/profile', 'Profile')}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm text-[var(--color-bone)]">{profile?.full_name || profile?.hospital_name}</p>
              <p className="text-xs text-[var(--color-bone-dim)] capitalize font-mono">{profile?.role}</p>
            </div>
            <button
              onClick={signOut}
              className="text-sm px-4 py-2 border border-[var(--color-ink-line)] hover:border-[var(--color-bone-dim)] rounded-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
