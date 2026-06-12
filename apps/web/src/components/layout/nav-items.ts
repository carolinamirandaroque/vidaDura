import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Wallet,
  Users,
  ShoppingCart,
} from 'lucide-react';

export type NavItem = {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  mobileLabelKey?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', mobileLabelKey: 'nav.home' },
  { to: '/calendar', icon: Calendar, labelKey: 'nav.calendar' },
  { to: '/tasks', icon: CheckSquare, labelKey: 'nav.tasks' },
  { to: '/shopping', icon: ShoppingCart, labelKey: 'nav.shopping' },
  { to: '/expenses', icon: Wallet, labelKey: 'nav.expenses' },
  { to: '/contacts', icon: Users, labelKey: 'nav.contacts' },
];
