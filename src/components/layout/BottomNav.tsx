'use client';

import {
  LayoutDashboard,
  Bell,
  Activity,
  Wallet,
  Settings
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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111827]/95 backdrop-blur-lg border-t border-gray-800 lg:hidden safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-lg transition-all',
                'active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-gray-500'
              )}
            >
              <Icon className={cn(
                'w-6 h-6',
                isActive && 'stroke-[2.5]'
              )} />
              <span className="text-[10px] font-medium truncate">
                {item.name}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
