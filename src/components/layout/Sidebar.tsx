'use client';

import { 
  LayoutDashboard, 
  Bell, 
  Settings, 
  Wallet, 
  Activity,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Signals', href: '/signals', icon: Bell },
  { name: 'Analytics', href: '/analytics', icon: Activity },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-gray-800 z-40 overflow-y-auto hidden lg:block">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <Zap className="w-8 h-8 text-primary" />
        <span className="ml-3 text-xl font-bold bg-gradient-to-r from-primary to-whale bg-clip-text text-transparent">
          Whale Screener
        </span>
      </div>

      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'hover:bg-surface2 hover:text-primary',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-gray-400'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>WebSocket Connected</span>
        </div>
      </div>
    </aside>
  );
}
