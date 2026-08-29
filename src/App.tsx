import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { onForegroundPush } from '@/lib/messaging';
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton, ToastProvider } from '@/components/ui';

import { Login } from '@/features/auth/Login';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { Assistant } from '@/features/assistant/Assistant';

import { Trains } from '@/features/trains/Trains';
import { Passengers } from '@/features/booking/Passengers';
import { Review } from '@/features/booking/Review';
import { Payment } from '@/features/booking/Payment';
import { Success } from '@/features/booking/Success';

import { Flights } from '@/features/travel/Flights';
import { Buses } from '@/features/travel/Buses';
import { Hotels } from '@/features/travel/Hotels';
import { Packages } from '@/features/travel/Packages';
import { Cabs } from '@/features/travel/Cabs';
import { Activities } from '@/features/travel/Activities';

import { Trips } from '@/features/journeys/Trips';
import { LiveStatus } from '@/features/journeys/LiveStatus';
import { PnrEnquiry } from '@/features/journeys/PnrEnquiry';
import { Cancelled } from '@/features/journeys/Cancelled';
import { Tdr } from '@/features/journeys/Tdr';

import { Food } from '@/features/services/Food';
import { RetiringRooms } from '@/features/services/RetiringRooms';
import { Lounge } from '@/features/services/Lounge';
import { RailMadad } from '@/features/services/RailMadad';
import { WalletScreen } from '@/features/services/WalletScreen';
import { Loyalty } from '@/features/services/Loyalty';
import { Offers } from '@/features/services/Offers';
import { Support } from '@/features/services/Support';

import { Tools, Schedule, PlatformLocator, CoachPosition } from '@/features/tools/Tools';
import { Explore } from '@/features/explore/Explore';
import { Profile } from '@/features/profile/Profile';

export default function App() {
  const user = useSession((s) => s.user);
  const ready = useSession((s) => s.ready);
  const bootstrap = useSession((s) => s.bootstrap);
  const applySettings = useSettings((s) => s.apply);

  useEffect(() => {
    applySettings();
    void bootstrap();
  }, [bootstrap, applySettings]);

  // Foreground web push feeds the in-app notification centre, so a message that
  // arrives while the tab is focused is not silently dropped. No-ops when push
  // is unconfigured or unsupported (master prompt §9).
  useEffect(() => {
    if (!user) return;
    let dispose = () => undefined as void;
    void onForegroundPush(({ title, body, data }) => {
      void useSession.getState().notify({
        priority: (data?.priority as 'critical' | 'important' | 'useful' | 'marketing') || 'important',
        type: (data?.type as never) || 'delay',
        title,
        body,
        journey_id: data?.journey_id,
      });
    }).then((d) => {
      dispose = d;
    });
    return () => dispose();
  }, [user]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-16">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <Login />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assistant" element={<Assistant />} />

          {/* trains — the golden path */}
          <Route path="/trains" element={<Trains />} />
          <Route path="/tatkal" element={<Trains tatkal />} />
          <Route path="/trains/passengers" element={<Passengers />} />
          <Route path="/trains/review" element={<Review />} />
          <Route path="/trains/payment" element={<Payment />} />
          <Route path="/trains/success/:journeyId" element={<Success />} />

          {/* other travel categories */}
          <Route path="/flights" element={<Flights />} />
          <Route path="/buses" element={<Buses />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/cabs" element={<Cabs />} />
          <Route path="/activities" element={<Activities />} />

          {/* my journeys */}
          <Route path="/trips" element={<Trips />} />
          <Route path="/live-status" element={<LiveStatus />} />
          <Route path="/pnr" element={<PnrEnquiry />} />
          <Route path="/cancelled" element={<Cancelled />} />
          <Route path="/tdr" element={<Tdr />} />

          {/* food & services */}
          <Route path="/food" element={<Food />} />
          <Route path="/retiring-rooms" element={<RetiringRooms />} />
          <Route path="/lounge" element={<Lounge />} />
          <Route path="/rail-madad" element={<RailMadad />} />
          <Route path="/wallet" element={<WalletScreen />} />

          {/* more */}
          <Route path="/offers" element={<Offers />} />
          <Route path="/loyalty" element={<Loyalty />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/support" element={<Support />} />

          {/* tools reachable from Quick Actions and the Assistant sidebar */}
          <Route path="/tools" element={<Tools />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/platform-locator" element={<PlatformLocator />} />
          <Route path="/coach-position" element={<CoachPosition />} />
          <Route path="/explore" element={<Explore />} />

          {/* legacy paths from the previous build */}
          <Route path="/book" element={<Navigate to="/trains" replace />} />
          <Route path="/search" element={<Navigate to="/trains" replace />} />
          <Route path="/you" element={<Navigate to="/profile" replace />} />
          <Route path="/track" element={<Navigate to="/live-status" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </ToastProvider>
  );
}
