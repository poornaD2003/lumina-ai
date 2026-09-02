import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

const colorMap: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  green: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  purple: { bg: 'bg-violet-50', icon: 'text-violet-600' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
};

export default function KPICard({ title, value, icon: Icon, color }: Props) {
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
        <Icon size={20} className={c.icon} />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </span>
        <span className="text-2xl font-semibold text-gray-900 mt-0.5 leading-tight">
          {value}
        </span>
      </div>
    </div>
  );
}
