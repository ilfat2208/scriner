'use client';

import { Bell, User, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-surface/80 backdrop-blur border-b border-gray-800 fixed top-0 right-0 left-64 z-40">
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tokens..."
              className="bg-surface2 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-gray-400">Live</span>
          </div>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <Badge 
              variant="danger" 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">Admin</div>
              <div className="text-xs text-gray-400">Pro Plan</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-whale flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
