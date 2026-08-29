import { useEffect, useState } from 'react';
import type { Train } from '@/types';
import { minutesOf } from '@/engine/search';

export interface LiveStop {
  station: string;
  scheduled: string;
  /** Scheduled time shifted by the running delay. */
  expected: string;
  state: 'departed' | 'current' | 'upcoming';
  delay_minutes: number;
}

export interface LiveTrain {
  train: Train;
  delay_minutes: number;
  /** 0..1 along the route. */
  progress: number;
  current_index: number;
  status: 'not_started' | 'running' | 'arrived';
  stops: LiveStop[];
  speed_kmh: number;
  platform: number;
  updated_at: number;
}

/** Stable per-train pseudo-random in [0,1). */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function clock(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/**
 * Simulates a train actually running (addendum §3). Position is derived from
 * the wall clock against the timetable, and the delay drifts slowly rather
 * than jumping, so the dashboard card and the Live Status screen agree and
 * visibly advance while you watch them.
 */
export function computeLive(train: Train, dateISO: string, now = Date.now()): LiveTrain {
  const base = hash(`${train.number}|${dateISO}`);
  const d = new Date(now);
  const minutesNow = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

  // Delay wanders between 0 and ~22 minutes over a slow cycle.
  const cycle = Math.sin(now / 900000 + base * 6.28);
  const delay = Math.max(0, Math.round(base * 14 + cycle * 8));

  const depart = minutesOf(train.departure_time);
  const totalKm = train.stops[train.stops.length - 1]?.distance_km || train.distance_km || 1;

  // Elapsed since departure, wrapped so an overnight run still reads sensibly.
  let elapsed = minutesNow - depart;
  if (elapsed < -720) elapsed += 1440;
  if (elapsed > train.duration_minutes + 720) elapsed -= 1440;

  const progress = Math.max(0, Math.min(1, elapsed / Math.max(1, train.duration_minutes)));

  const stops: LiveStop[] = train.stops.map((s) => {
    const sched = s.departure ?? s.arrival ?? train.departure_time;
    const schedMin = minutesOf(sched);
    const reachedAt = (s.distance_km / totalKm) * train.duration_minutes;
    const state: LiveStop['state'] =
      elapsed <= 0 ? 'upcoming' : elapsed >= reachedAt + 2 ? 'departed' : 'upcoming';
    return {
      station: s.station,
      scheduled: sched,
      expected: clock(schedMin + delay),
      state,
      delay_minutes: delay,
    };
  });

  const status: LiveTrain['status'] =
    elapsed <= 0 ? 'not_started' : progress >= 1 ? 'arrived' : 'running';

  // The first not-yet-departed stop is where the train currently is heading.
  // Once it has arrived every stop is behind it, so nothing is still pending.
  let currentIndex = stops.findIndex((s) => s.state === 'upcoming');
  if (currentIndex === -1) currentIndex = stops.length - 1;
  if (status === 'arrived') {
    for (const s of stops) s.state = 'departed';
    currentIndex = stops.length - 1;
  } else if (status === 'running') {
    stops[currentIndex].state = 'current';
  }

  return {
    train,
    delay_minutes: delay,
    progress,
    current_index: currentIndex,
    status,
    stops,
    speed_kmh: status === 'running' ? Math.round(58 + base * 46 + cycle * 12) : 0,
    platform: 1 + Math.floor(base * 8),
    updated_at: now,
  };
}

/** Re-computes on an interval so the card advances while it is on screen. */
export function useLiveTrain(train: Train | undefined, dateISO: string, everyMs = 5000): LiveTrain | null {
  const [live, setLive] = useState<LiveTrain | null>(() =>
    train ? computeLive(train, dateISO) : null,
  );

  useEffect(() => {
    if (!train) {
      setLive(null);
      return;
    }
    setLive(computeLive(train, dateISO));
    const id = setInterval(() => setLive(computeLive(train, dateISO)), everyMs);
    return () => clearInterval(id);
  }, [train, dateISO, everyMs]);

  return live;
}
