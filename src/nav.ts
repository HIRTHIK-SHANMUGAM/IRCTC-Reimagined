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
  label: string;
  icon: LucideIcon;
  /** The Assistant row is called out in orange (addendum §3). */
  accent?: boolean;
}

export interface NavGroup {
  /** Section label above the group; absent for the ungrouped top rows. */
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
    items: [{ to: '/', label: 'Home', icon: Home }],
  },
  {
    title: 'Book & Travel',
    items: [
      { to: '/trains', label: 'Trains', icon: TrainFront },
      { to: '/flights', label: 'Flights', icon: Plane },
      { to: '/buses', label: 'Buses', icon: Bus },
      { to: '/hotels', label: 'Hotels', icon: Building2 },
      { to: '/packages', label: 'Holiday Packages', icon: Package },
      { to: '/cabs', label: 'Cabs', icon: Car },
      { to: '/assistant', label: 'Assistant', icon: Sparkles, accent: true },
      { to: '/activities', label: 'Activities & Attractions', icon: ActivityIcon },
    ],
  },
  {
    title: 'My Journeys',
    items: [
      { to: '/trips', label: 'My Trips', icon: Ticket },
      { to: '/live-status', label: 'Live Status', icon: Radio },
      { to: '/pnr', label: 'PNR Enquiry', icon: Search },
      { to: '/cancelled', label: 'Cancelled Tickets', icon: Ban },
      { to: '/tdr', label: 'TDR Status', icon: FileText },
    ],
  },
  {
    title: 'Food & Services',
    items: [
      { to: '/food', label: 'Order Food on Train', icon: UtensilsCrossed },
      { to: '/retiring-rooms', label: 'Retiring Rooms', icon: BedDouble },
      { to: '/lounge', label: 'Lounge Access', icon: Armchair },
      { to: '/rail-madad', label: 'Rail Madad', icon: LifeBuoy },
      { to: '/wallet', label: 'IRCTC eWallet', icon: Wallet },
    ],
  },
  {
    title: 'More',
    items: [
      { to: '/offers', label: 'Offers', icon: Percent },
      { to: '/loyalty', label: 'Loyalty & Rewards', icon: Award },
      { to: '/profile', label: 'Profile', icon: User },
      { to: '/support', label: 'Support', icon: HelpCircle },
      { to: 'logout', label: 'Log Out', icon: LogOut },
    ],
  },
];

/** Flat list of every real route the sidebar points at. */
export const NAV_ROUTES = NAV.flatMap((g) => g.items.map((i) => i.to)).filter((t) => t !== 'logout');
