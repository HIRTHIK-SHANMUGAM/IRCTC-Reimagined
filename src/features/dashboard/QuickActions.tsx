import { Link } from 'react-router-dom';
import {
  Ban,
  BedDouble,
  LayoutGrid,
  MapPin,
  Radio,
  Route,
  Search,
  Timer,
  UtensilsCrossed,
} from 'lucide-react';

const ACTIONS = [
  { to: '/pnr', label: 'Check PNR', icon: Search },
  { to: '/live-status', label: 'Live Status', icon: Radio },
  { to: '/schedule', label: 'Train Schedule', icon: Timer },
  { to: '/platform-locator', label: 'Platform Locator', icon: MapPin },
  { to: '/coach-position', label: 'Coach Position', icon: Route },
  { to: '/food', label: 'Order Food', icon: UtensilsCrossed },
  { to: '/retiring-rooms', label: 'Retiring Room', icon: BedDouble },
  { to: '/trips', label: 'Cancel Ticket', icon: Ban },
  { to: '/tools', label: 'More', icon: LayoutGrid },
];

/** The icon-tile row from the reference. Every tile is a real destination. */
export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
      {ACTIONS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="lift group flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-3 text-center"
        >
          <span className="icon-tile h-10 w-10 transition-colors group-hover:bg-navy-700 group-hover:text-white">
            <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </span>
          <span className="text-[0.6875rem] font-semibold leading-tight text-ink-muted">{label}</span>
        </Link>
      ))}
    </div>
  );
}
