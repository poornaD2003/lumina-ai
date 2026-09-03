import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Package } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/restock-plan', label: 'Restock Plan', icon: Package },
];

export default function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-6 border-b border-slate-700/60">
        <img src="/favicon.svg" alt="Lumina" className="w-8 h-8 rounded-lg" />
        <span className="font-semibold text-white tracking-tight text-[15px]">
          Lumina
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
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

      {/* Footer spacer */}
      <div className="mt-auto px-5 py-4">
        <p className="text-slate-600 text-xs">Lumina v1.0.0</p>
      </div>
    </aside>
  );
}
