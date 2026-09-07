import {
  Activity as ActivityIcon,
  Armchair,
  Award,
  Ban,
  BedDouble,
  Building2,
  Bus,
  Car,
  FileText,
  HelpCircle,
  Home,
  LifeBuoy,
  LogOut,
  Package,
  Percent,
  Plane,
  Radio,
  Search,
  Sparkles,
  Ticket,
  TrainFront,
  User,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  /** Route path, or 'logout' for the sign-out action row. */
  to: string;
  /** Key under `sidebar.*` in the translation tree. */
  label: string;
  icon: LucideIcon;
  /** The Assistant row is called out in orange (addendum §3). */
  accent?: boolean;
}

export interface NavGroup {
  /** Key under `sidebar.*` for the section label; absent for the top rows. */
  title?: string;
  items: NavItem[];
}

/**
 * The single source of truth for the left sidebar (addendum §3). Every row
 * here resolves to a real, populated screen — the routing table in App.tsx is
 * checked against this list, so a nav row can never become a dead link.
 */
export const NAV: NavGroup[] = [
  {
    items: [{ to: '/', label: 'home', icon: Home }],
  },
  {
    title: 'bookTravel',
    items: [
      { to: '/trains', label: 'trains', icon: TrainFront },
      { to: '/flights', label: 'flights', icon: Plane },
      { to: '/buses', label: 'buses', icon: Bus },
      { to: '/hotels', label: 'hotels', icon: Building2 },
      { to: '/packages', label: 'packages', icon: Package },
      { to: '/cabs', label: 'cabs', icon: Car },
      { to: '/assistant', label: 'assistant', icon: Sparkles, accent: true },
      { to: '/activities', label: 'activities', icon: ActivityIcon },
    ],
  },
  {
    title: 'myJourneys',
    items: [
      { to: '/trips', label: 'trips', icon: Ticket },
      { to: '/live-status', label: 'liveStatus', icon: Radio },
      { to: '/pnr', label: 'pnr', icon: Search },
      { to: '/cancelled', label: 'cancelled', icon: Ban },
      { to: '/tdr', label: 'tdr', icon: FileText },
    ],
  },
  {
    title: 'foodServices',
    items: [
      { to: '/food', label: 'food', icon: UtensilsCrossed },
      { to: '/retiring-rooms', label: 'retiring', icon: BedDouble },
      { to: '/lounge', label: 'lounge', icon: Armchair },
      { to: '/rail-madad', label: 'railMadad', icon: LifeBuoy },
      { to: '/wallet', label: 'wallet', icon: Wallet },
    ],
  },
  {
    title: 'more',
    items: [
      { to: '/offers', label: 'offers', icon: Percent },
      { to: '/loyalty', label: 'loyalty', icon: Award },
      { to: '/profile', label: 'profile', icon: User },
      { to: '/support', label: 'support', icon: HelpCircle },
      { to: 'logout', label: 'logout', icon: LogOut },
    ],
  },
];

/** Flat list of every real route the sidebar points at. */
export const NAV_ROUTES = NAV.flatMap((g) => g.items.map((i) => i.to)).filter((t) => t !== 'logout');
