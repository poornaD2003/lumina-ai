import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Package, Boxes, FileUp, Moon, Sun } from 'lucide-react';
import { Calculator } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/restock-plan', label: 'Restock Plan', icon: Package },
  { to: '/competitor-comparison', label: 'Price Comparison', icon: LayoutDashboard },
  { to: '/sales-calculator', label: 'Sales Calculator', icon: Calculator },
  { to: '/products', label: 'Products', icon: Boxes },
  { to: '/invoices/upload', label: 'Upload Invoice', icon: FileUp },
];

export default function Sidebar() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('lumina-theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('lumina-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <aside className="flex w-full shrink-0 flex-col bg-slate-900 lg:min-h-screen lg:w-60">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-slate-700/60 px-4 py-4 sm:px-5 lg:py-6">
        <img src="/favicon.svg" alt="Lumina" className="w-8 h-8 rounded-lg" />
        <span className="font-semibold text-white tracking-tight text-[15px]">
          Lumina
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible lg:py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                ? 'bg-slate-700/80 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setDarkMode((current) => !current)}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="mx-3 mb-3 flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white lg:justify-start"
      >
        {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
      </button>

      {/* Footer spacer */}
      <div className="mt-auto hidden px-5 py-4 lg:block">
        <p className="text-slate-600 text-xs">Lumina v1.0.0</p>
      </div>
    </aside>
  );
}