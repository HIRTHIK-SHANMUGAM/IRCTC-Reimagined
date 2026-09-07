import type { Train, TrainStop, TravelClass } from '@/types';
import { STATION_BY_CODE } from './stations';
import { translitName } from './translit';

/** Compact seed table. Each row expands into a full Train with stops,
 *  class pricing and running days. MOCK data — read-only to clients. */
interface TrainSeed {
  number: string;
  /** English name. Every other language is composed from it (./translit). */
  name: string;
  route: string[]; // station codes, origin .. destination
  dep: string; // HH:MM at origin
  durationMin: number;
  classes: TravelClass[];
  runsOn?: number[];
  rating: number;
  punctuality: number; // 0..1
  pantry?: boolean;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const SEEDS: TrainSeed[] = [
  // ---- Chennai <-> Bengaluru ----
  { number: '12007', name: 'Mysuru Shatabdi Express', route: ['MAS', 'KPD', 'SBC2', 'SBC'], dep: '06:00', durationMin: 300, classes: ['CC', 'EC'], runsOn: [1, 2, 3, 4, 5, 6], rating: 4.6, punctuality: 0.93, pantry: true },
  { number: '20607', name: 'Chennai–Mysuru Vande Bharat', route: ['MAS', 'KPD', 'SBC2', 'SBC'], dep: '05:50', durationMin: 275, classes: ['CC', 'EC'], runsOn: [0, 1, 2, 4, 5, 6], rating: 4.8, punctuality: 0.95, pantry: true },
  { number: '12609', name: 'Bengaluru Express', route: ['MAS', 'KPD', 'JTJ', 'SBC2', 'SBC'], dep: '13:35', durationMin: 390, classes: ['SL', '3A', '2A'], rating: 4.0, punctuality: 0.82, pantry: true },
  { number: '12639', name: 'Brindavan Express', route: ['MAS', 'KPD', 'JTJ', 'SBC2', 'SBC'], dep: '07:15', durationMin: 375, classes: ['2S', 'CC'], rating: 4.2, punctuality: 0.86 },
  { number: '22625', name: 'Double Decker Express', route: ['MAS', 'KPD', 'SBC2', 'SBC'], dep: '16:25', durationMin: 360, classes: ['CC'], runsOn: [1, 2, 3, 4, 5], rating: 4.1, punctuality: 0.84 },
  { number: '12657', name: 'Bengaluru Mail', route: ['MAS', 'KPD', 'JTJ', 'SBC2', 'SBC'], dep: '23:40', durationMin: 375, classes: ['SL', '3A', '2A', '1A'], rating: 4.4, punctuality: 0.88, pantry: true },
  { number: '12027', name: 'Bengaluru Shatabdi', route: ['MAS', 'KPD', 'SBC'], dep: '17:30', durationMin: 300, classes: ['CC', 'EC'], runsOn: [1, 2, 3, 4, 5, 6], rating: 4.5, punctuality: 0.91, pantry: true },
  { number: '22691', name: 'Rajdhani Express', route: ['SBC', 'SBC2', 'KPD', 'BZA', 'NDLS'], dep: '20:00', durationMin: 2075, classes: ['3A', '2A', '1A'], runsOn: [0, 2, 4, 6], rating: 4.7, punctuality: 0.9, pantry: true },

  // ---- Chennai <-> Coimbatore / Kerala ----
  { number: '12675', name: 'Kovai Express', route: ['MAS', 'SA', 'ED', 'CBE'], dep: '06:15', durationMin: 435, classes: ['2S', 'CC'], rating: 4.3, punctuality: 0.89, pantry: true },
  { number: '12673', name: 'Cheran Express', route: ['MAS', 'SA', 'ED', 'CBE'], dep: '22:10', durationMin: 465, classes: ['SL', '3A', '2A'], rating: 4.1, punctuality: 0.85 },
  { number: '20643', name: 'Chennai–Coimbatore Vande Bharat', route: ['MAS', 'SA', 'CBE'], dep: '05:50', durationMin: 365, classes: ['CC', 'EC'], runsOn: [0, 1, 2, 3, 4, 5], rating: 4.8, punctuality: 0.94, pantry: true },
  { number: '12671', name: 'Nilgiri Express', route: ['MAS', 'SA', 'ED', 'CBE'], dep: '21:15', durationMin: 480, classes: ['SL', '3A', '2A'], rating: 4.0, punctuality: 0.83 },
  { number: '12695', name: 'Trivandrum Express', route: ['MAS', 'SA', 'ED', 'ERS', 'KTYM', 'TVC'], dep: '15:20', durationMin: 915, classes: ['SL', '3A', '2A', '1A'], rating: 4.2, punctuality: 0.8, pantry: true },
  { number: '12623', name: 'Chennai–Trivandrum Mail', route: ['MAS', 'SA', 'ED', 'ERS', 'TVC'], dep: '19:45', durationMin: 950, classes: ['SL', '3A', '2A'], rating: 3.9, punctuality: 0.78, pantry: true },

  // ---- Chennai <-> Madurai / Trichy / Kanyakumari ----
  { number: '12635', name: 'Vaigai Express', route: ['MS', 'TPJ', 'MDU'], dep: '13:20', durationMin: 480, classes: ['2S', 'CC'], rating: 4.4, punctuality: 0.9, pantry: true },
  { number: '12637', name: 'Pandian Express', route: ['MS', 'TPJ', 'MDU'], dep: '21:30', durationMin: 510, classes: ['SL', '3A', '2A'], rating: 4.2, punctuality: 0.87 },
  { number: '22661', name: 'Chennai–Rameswaram Express', route: ['MS', 'TPJ', 'MDU'], dep: '19:00', durationMin: 540, classes: ['SL', '3A', '2A'], runsOn: [0, 2, 4], rating: 3.8, punctuality: 0.76 },
  { number: '12633', name: 'Kanyakumari Express', route: ['MS', 'TPJ', 'MDU', 'CAPE'], dep: '17:35', durationMin: 810, classes: ['SL', '3A', '2A'], rating: 4.0, punctuality: 0.81, pantry: true },
  { number: '16101', name: 'Chennai–Trichy Express', route: ['MS', 'TPJ'], dep: '08:00', durationMin: 345, classes: ['2S', 'SL', '3A'], rating: 3.9, punctuality: 0.84 },

  // ---- Chennai <-> Hyderabad / Vijayawada / Vizag ----
  { number: '12759', name: 'Charminar Express', route: ['MAS', 'BZA', 'SC', 'HYB'], dep: '18:25', durationMin: 795, classes: ['SL', '3A', '2A', '1A'], rating: 4.1, punctuality: 0.83, pantry: true },
  { number: '12603', name: 'Hyderabad Express', route: ['MAS', 'BZA', 'SC'], dep: '16:50', durationMin: 780, classes: ['SL', '3A', '2A'], rating: 3.9, punctuality: 0.79, pantry: true },
  { number: '12841', name: 'Coromandel Express', route: ['MAS', 'BZA', 'VSKP', 'HWH'], dep: '08:45', durationMin: 1590, classes: ['SL', '3A', '2A', '1A'], rating: 4.3, punctuality: 0.85, pantry: true },
  { number: '22415', name: 'Andhra Pradesh Express', route: ['BZA', 'SC', 'NDLS'], dep: '06:20', durationMin: 1650, classes: ['3A', '2A', '1A'], rating: 4.2, punctuality: 0.86, pantry: true },
  { number: '20889', name: 'Vizag–Secunderabad Vande Bharat', route: ['VSKP', 'BZA', 'SC'], dep: '05:45', durationMin: 495, classes: ['CC', 'EC'], runsOn: [0, 1, 2, 3, 4, 6], rating: 4.7, punctuality: 0.93 },

  // ---- Mumbai <-> Delhi / Pune / Ahmedabad ----
  { number: '12951', name: 'Mumbai Rajdhani', route: ['BCT', 'ADI', 'JP', 'NDLS'], dep: '17:00', durationMin: 950, classes: ['3A', '2A', '1A'], rating: 4.8, punctuality: 0.94, pantry: true },
  { number: '12009', name: 'Shatabdi Express Ahmedabad', route: ['BCT', 'ADI'], dep: '06:25', durationMin: 415, classes: ['CC', 'EC'], runsOn: [1, 2, 3, 4, 5, 6], rating: 4.5, punctuality: 0.91, pantry: true },
  { number: '11007', name: 'Deccan Express', route: ['CSMT', 'PUNE'], dep: '07:00', durationMin: 220, classes: ['2S', 'CC'], rating: 4.0, punctuality: 0.88 },
  { number: '12123', name: 'Deccan Queen', route: ['CSMT', 'PUNE'], dep: '17:10', durationMin: 195, classes: ['CC', 'EC'], runsOn: [1, 2, 3, 4, 5, 6], rating: 4.6, punctuality: 0.92, pantry: true },
  { number: '12263', name: 'Pune–Delhi Duronto', route: ['PUNE', 'JP', 'NDLS'], dep: '11:10', durationMin: 1420, classes: ['3A', '2A', '1A'], runsOn: [0, 3, 5], rating: 4.4, punctuality: 0.89, pantry: true },
  { number: '12953', name: 'August Kranti Rajdhani', route: ['BCT', 'ADI', 'NDLS'], dep: '17:40', durationMin: 1010, classes: ['3A', '2A', '1A'], rating: 4.6, punctuality: 0.9, pantry: true },

  // ---- Delhi <-> Kolkata / Patna / Jaipur ----
  { number: '12301', name: 'Howrah Rajdhani', route: ['HWH', 'PNBE', 'NDLS'], dep: '16:50', durationMin: 1020, classes: ['3A', '2A', '1A'], rating: 4.7, punctuality: 0.92, pantry: true },
  { number: '12259', name: 'Sealdah Duronto', route: ['HWH', 'NDLS'], dep: '20:05', durationMin: 1000, classes: ['3A', '2A', '1A'], runsOn: [1, 3, 5], rating: 4.4, punctuality: 0.88, pantry: true },
  { number: '12309', name: 'Patna Rajdhani', route: ['PNBE', 'NDLS'], dep: '19:15', durationMin: 705, classes: ['3A', '2A', '1A'], rating: 4.5, punctuality: 0.89, pantry: true },
  { number: '12015', name: 'Ajmer Shatabdi', route: ['NDLS', 'JP'], dep: '06:05', durationMin: 285, classes: ['CC', 'EC'], rating: 4.5, punctuality: 0.9, pantry: true },
  { number: '12958', name: 'Swarna Jayanti Rajdhani', route: ['ADI', 'JP', 'NDLS'], dep: '18:50', durationMin: 840, classes: ['3A', '2A', '1A'], rating: 4.3, punctuality: 0.87, pantry: true },

  // ---- Kerala / South-west ----
  { number: '12626', name: 'Kerala Express', route: ['TVC', 'ERS', 'CBE', 'NDLS'], dep: '11:15', durationMin: 2790, classes: ['SL', '3A', '2A'], rating: 4.0, punctuality: 0.76, pantry: true },
  { number: '16525', name: 'Island Express', route: ['SBC', 'SA', 'ERS', 'KTYM', 'CAPE'], dep: '19:20', durationMin: 1010, classes: ['SL', '3A', '2A'], rating: 3.8, punctuality: 0.75 },
  { number: '12678', name: 'Ernakulam Intercity', route: ['SBC', 'SA', 'ED', 'ERS'], dep: '06:15', durationMin: 720, classes: ['2S', 'CC', '3A'], rating: 4.1, punctuality: 0.85 },
  { number: '20631', name: 'Kasaragod Vande Bharat', route: ['TVC', 'KTYM', 'ERS'], dep: '05:20', durationMin: 245, classes: ['CC', 'EC'], runsOn: [0, 1, 2, 3, 5, 6], rating: 4.7, punctuality: 0.94 },

  // ---- Cross-country / misc ----
  { number: '12621', name: 'Tamil Nadu Express', route: ['MAS', 'BZA', 'NDLS'], dep: '22:00', durationMin: 1920, classes: ['SL', '3A', '2A', '1A'], rating: 4.3, punctuality: 0.84, pantry: true },
  { number: '12269', name: 'Chennai Duronto', route: ['MAS', 'NDLS'], dep: '06:40', durationMin: 1700, classes: ['3A', '2A', '1A'], runsOn: [2, 4, 6], rating: 4.5, punctuality: 0.9, pantry: true },
  { number: '12163', name: 'Dadar Chennai Express', route: ['CSMT', 'PUNE', 'SBC2', 'MAS'], dep: '20:35', durationMin: 1425, classes: ['SL', '3A', '2A'], rating: 3.9, punctuality: 0.78, pantry: true },
  { number: '11013', name: 'Coimbatore Express', route: ['CSMT', 'PUNE', 'SA', 'CBE'], dep: '00:15', durationMin: 1620, classes: ['SL', '3A', '2A'], rating: 3.7, punctuality: 0.74, pantry: true },
  { number: '12707', name: 'Sabari Express', route: ['SC', 'BZA', 'ERS', 'TVC'], dep: '12:30', durationMin: 1500, classes: ['SL', '3A', '2A'], rating: 3.8, punctuality: 0.76, pantry: true },
  { number: '17235', name: 'Nagarjuna Express', route: ['SC', 'BZA', 'MAS'], dep: '17:45', durationMin: 840, classes: ['SL', '3A', '2A'], rating: 3.6, punctuality: 0.72 },
];

/* ---------- expansion ---------- */

/** Deterministic hash → the demo looks the same on every machine. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const CLASS_RATE: Record<TravelClass, number> = {
  '2S': 0.28,
  SL: 0.42,
  CC: 0.95,
  '3A': 1.1,
  EC: 1.85,
  '2A': 1.65,
  '1A': 2.8,
};

const CLASS_SEATS: Record<TravelClass, number> = {
  '2S': 320,
  SL: 480,
  CC: 240,
  '3A': 192,
  EC: 56,
  '2A': 96,
  '1A': 24,
};

function addMinutes(time: string, minutes: number): { time: string; day: number } {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const day = Math.floor(total / 1440);
  const rem = ((total % 1440) + 1440) % 1440;
  return {
    time: `${String(Math.floor(rem / 60)).padStart(2, '0')}:${String(rem % 60).padStart(2, '0')}`,
    day,
  };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 1.22); // rail is longer than the crow flies
}

function buildStops(seed: TrainSeed): { stops: TrainStop[]; distance: number } {
  const legs = seed.route.length - 1;
  let cumulativeKm = 0;
  const legKm: number[] = [];
  for (let i = 0; i < legs; i++) {
    const a = STATION_BY_CODE.get(seed.route[i])!;
    const b = STATION_BY_CODE.get(seed.route[i + 1])!;
    legKm.push(haversineKm(a, b));
  }
  const totalKm = legKm.reduce((s, v) => s + v, 0) || 1;

  const stops: TrainStop[] = [];
  let elapsed = 0;
  for (let i = 0; i < seed.route.length; i++) {
    const code = seed.route[i];
    const isFirst = i === 0;
    const isLast = i === seed.route.length - 1;
    if (!isFirst) {
      elapsed += Math.round((legKm[i - 1] / totalKm) * seed.durationMin);
      cumulativeKm += legKm[i - 1];
    }
    const arrival = isFirst ? null : addMinutes(seed.dep, elapsed);
    // Intermediate halts get a short dwell.
    const dwell = isFirst || isLast ? 0 : 3;
    const departure = isLast ? null : addMinutes(seed.dep, elapsed + dwell);
    stops.push({
      station: code,
      arrival: arrival ? arrival.time : null,
      departure: departure ? departure.time : null,
      day: (arrival ?? departure!).day,
      distance_km: cumulativeKm,
      platform: 1 + Math.floor(hash(seed.number + code) * 8),
    });
    elapsed += dwell;
  }
  return { stops, distance: totalKm };
}

function expand(seed: TrainSeed): Train {
  const { stops, distance } = buildStops(seed);
  const arrival = addMinutes(seed.dep, seed.durationMin);
  const name = translitName(seed.name);

  const classes = seed.classes.map((c) => {
    const base = 90 + distance * 0.62 * CLASS_RATE[c];
    // Round to the nearest 5 rupees — fares never show stray paise.
    const price = Math.round(base / 5) * 5;
    const total = CLASS_SEATS[c];
    const r = hash(seed.number + c);
    const available = Math.round(total * r * 0.9);
    return {
      name: c,
      price,
      total_seats: total,
      available_seats: available,
      state: 'available' as const,
    };
  });

  return {
    id: `T${seed.number}`,
    number: seed.number,
    name,
    from_station: seed.route[0],
    to_station: seed.route[seed.route.length - 1],
    departure_time: seed.dep,
    arrival_time: arrival.time,
    duration_minutes: seed.durationMin,
    distance_km: distance,
    rating: seed.rating,
    runs_on: seed.runsOn ?? ALL_DAYS,
    classes,
    stops,
    has_pantry: seed.pantry ?? false,
    is_overnight: arrival.day > 0 || Number(seed.dep.split(':')[0]) >= 20,
    punctuality: seed.punctuality,
  };
}

export const TRAINS: Train[] = SEEDS.map(expand);

export const TRAIN_BY_ID = new Map(TRAINS.map((t) => [t.id, t]));
export const TRAIN_BY_NUMBER = new Map(TRAINS.map((t) => [t.number, t]));

export function getTrain(idOrNumber: string): Train | undefined {
  return TRAIN_BY_ID.get(idOrNumber) ?? TRAIN_BY_NUMBER.get(idOrNumber);
}
