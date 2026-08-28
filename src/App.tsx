import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { onForegroundPush } from '@/lib/messaging';
import { AppShell } from '@/components/layout/AppShell';
import { CursorGlow } from '@/components/motion/CursorGlow';
import { SignIn } from '@/features/auth/SignIn';
import { Home } from '@/features/home/Home';
import { Agent } from '@/features/agent/Agent';
import { Results } from '@/features/search/Results';
import { Passengers } from '@/features/booking/Passengers';
import { Review } from '@/features/booking/Review';
import { Payment } from '@/features/booking/Payment';
import { Success } from '@/features/booking/Success';
import { Trips } from '@/features/trips/Trips';
import { Track } from '@/features/track/Track';
import { Explore } from '@/features/explore/Explore';
import { Profile } from '@/features/profile/Profile';
import { Skeleton } from '@/components/ui';

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
      <>
        <CursorGlow />
        <SignIn />
      </>
    );
  }

  return (
    <>
      <CursorGlow />
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Agent />} />
          <Route path="/book/passengers" element={<Passengers />} />
          <Route path="/book/review" element={<Review />} />
          <Route path="/book/payment" element={<Payment />} />
          <Route path="/book/success/:journeyId" element={<Success />} />
          <Route path="/search" element={<Results />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/track" element={<Track />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/you" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </>
  );
}
