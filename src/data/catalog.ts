/**
 * MOCK catalogue for every non-train product in the sidebar (addendum §5).
 *
 * All values are invented but internally consistent — real city pairs, plausible
 * fares and durations — so every listing screen has something believable to
 * filter, sort and book against. Nothing here talks to a real inventory system.
 */

export type Scene =
  | 'temple'
  | 'beach'
  | 'hills'
  | 'city'
  | 'heritage'
  | 'backwater'
  | 'desert'
  | 'rail';

/* ------------------------------------------------------------ Flights -- */

export interface Airport {
  code: string;
  city: string;
  name: string;
}

export const AIRPORTS: Airport[] = [
  { code: 'MAA', city: 'Chennai', name: 'Chennai International' },
  { code: 'BLR', city: 'Bengaluru', name: 'Kempegowda International' },
  { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International' },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj' },
  { code: 'DEL', city: 'Delhi', name: 'Indira Gandhi International' },
  { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhas Chandra Bose' },
  { code: 'COK', city: 'Kochi', name: 'Cochin International' },
  { code: 'GOI', city: 'Goa', name: 'Dabolim' },
  { code: 'PNQ', city: 'Pune', name: 'Pune International' },
  { code: 'JAI', city: 'Jaipur', name: 'Jaipur International' },
  { code: 'TRV', city: 'Thiruvananthapuram', name: 'Trivandrum International' },
  { code: 'AMD', city: 'Ahmedabad', name: 'Sardar Vallabhbhai Patel' },
];

export interface Flight {
  id: string;
  airline: string;
  code: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration_minutes: number;
  stops: number;
  fare: { economy: number; premium: number; business: number };
  seats_left: number;
  on_time: number;
}

const AIRLINES = [
  { name: 'IndiGo', prefix: '6E' },
  { name: 'Air India', prefix: 'AI' },
  { name: 'Vistara', prefix: 'UK' },
  { name: 'SpiceJet', prefix: 'SG' },
  { name: 'Akasa Air', prefix: 'QP' },
];

function clock(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Deterministic pseudo-random so every reload shows the same catalogue. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FLIGHT_ROUTES: [string, string, number][] = [
  ['MAA', 'BLR', 60],
  ['MAA', 'HYD', 85],
  ['MAA', 'BOM', 120],
  ['MAA', 'DEL', 165],
  ['MAA', 'COK', 75],
  ['BLR', 'DEL', 160],
  ['BLR', 'BOM', 105],
  ['BLR', 'GOI', 70],
  ['BLR', 'HYD', 70],
  ['BOM', 'DEL', 130],
  ['DEL', 'JAI', 55],
  ['MAA', 'CCU', 145],
  ['BLR', 'PNQ', 90],
  ['MAA', 'TRV', 85],
  ['BOM', 'AMD', 70],
];

export const FLIGHTS: Flight[] = FLIGHT_ROUTES.flatMap(([from, to, base], ri) => {
  const rnd = seeded(9001 + ri * 37);
  return Array.from({ length: 5 }).map((_, i) => {
    const airline = AIRLINES[Math.floor(rnd() * AIRLINES.length)];
    const dep = 5 * 60 + Math.floor(rnd() * 15) * 60 + Math.floor(rnd() * 12) * 5;
    const stops = rnd() > 0.78 ? 1 : 0;
    const duration = base + (stops ? 70 + Math.floor(rnd() * 40) : 0);
    const economy = Math.round((2200 + base * 14 + rnd() * 2600) / 50) * 50;
    return {
      id: `fl-${from}-${to}-${i}`,
      airline: airline.name,
      code: `${airline.prefix}-${2000 + Math.floor(rnd() * 7000)}`,
      from,
      to,
      departure: clock(dep),
      arrival: clock(dep + duration),
      duration_minutes: duration,
      stops,
      fare: {
        economy,
        premium: Math.round((economy * 1.55) / 50) * 50,
        business: Math.round((economy * 2.6) / 50) * 50,
      },
      seats_left: 3 + Math.floor(rnd() * 40),
      on_time: 68 + Math.floor(rnd() * 28),
    };
  });
});

/* --------------------------------------------------------------- Buses -- */

export interface Bus {
  id: string;
  operator: string;
  type: string;
  ac: boolean;
  sleeper: boolean;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration_minutes: number;
  fare: number;
  seats_left: number;
  rating: number;
  boarding: string;
}

const BUS_OPERATORS = [
  'KPN Travels',
  'SRS Travels',
  'VRL Travels',
  'Orange Tours',
  'SETC',
  'KSRTC Airavat',
  'Parveen Travels',
  'Jabbar Travels',
];

const BUS_ROUTES: [string, string, number][] = [
  ['Chennai', 'Bengaluru', 360],
  ['Chennai', 'Coimbatore', 480],
  ['Chennai', 'Madurai', 510],
  ['Bengaluru', 'Hyderabad', 540],
  ['Bengaluru', 'Mysuru', 210],
  ['Chennai', 'Tirupati', 240],
  ['Coimbatore', 'Kochi', 300],
  ['Hyderabad', 'Vijayawada', 330],
  ['Mumbai', 'Pune', 210],
  ['Bengaluru', 'Goa', 720],
];

export const BUSES: Bus[] = BUS_ROUTES.flatMap(([from, to, base], ri) => {
  const rnd = seeded(4400 + ri * 53);
  return Array.from({ length: 6 }).map((_, i) => {
    const ac = rnd() > 0.28;
    const sleeper = rnd() > 0.45;
    const dep = 6 * 60 + Math.floor(rnd() * 17) * 60;
    const duration = base + Math.floor(rnd() * 60) - 20;
    const fare = Math.round((360 + base * 1.35 + (ac ? 220 : 0) + (sleeper ? 180 : 0) + rnd() * 260) / 10) * 10;
    return {
      id: `bus-${ri}-${i}`,
      operator: BUS_OPERATORS[Math.floor(rnd() * BUS_OPERATORS.length)],
      type: `${ac ? 'AC' : 'Non-AC'} ${sleeper ? 'Sleeper' : 'Seater'}`,
      ac,
      sleeper,
      from,
      to,
      departure: clock(dep),
      arrival: clock(dep + duration),
      duration_minutes: duration,
      fare,
      seats_left: 2 + Math.floor(rnd() * 28),
      rating: Math.round((3.4 + rnd() * 1.5) * 10) / 10,
      boarding: ['Koyambedu', 'Madhavaram', 'Guindy', 'Majestic', 'Anand Rao Circle'][
        Math.floor(rnd() * 5)
      ],
    };
  });
});

/* -------------------------------------------------------------- Hotels -- */

export interface Hotel {
  id: string;
  name: string;
  city: string;
  area: string;
  rating: number;
  reviews: number;
  scene: Scene;
  amenities: string[];
  rooms: { type: string; price: number; capacity: number; left: number }[];
}

const HOTEL_SEEDS: [string, string, string, Scene, number][] = [
  ['The Marina Grand', 'Chennai', 'Egmore', 'city', 4.4],
  ['Coromandel Residency', 'Chennai', 'T. Nagar', 'city', 4.1],
  ['Cubbon Park Suites', 'Bengaluru', 'MG Road', 'city', 4.5],
  ['Whitefield Comfort Inn', 'Bengaluru', 'Whitefield', 'city', 3.9],
  ['Backwater Palms Resort', 'Kochi', 'Fort Kochi', 'backwater', 4.6],
  ['Meenakshi Heritage', 'Madurai', 'Near Temple', 'temple', 4.2],
  ['Nilgiri View Lodge', 'Ooty', 'Charring Cross', 'hills', 4.3],
  ['Anjuna Sands', 'Goa', 'North Goa', 'beach', 4.5],
  ['Amber Fort Haveli', 'Jaipur', 'Amer Road', 'desert', 4.4],
  ['Deccan Plaza', 'Hyderabad', 'Banjara Hills', 'city', 4.2],
  ['Kovalam Beach House', 'Thiruvananthapuram', 'Kovalam', 'beach', 4.4],
  ['Coonoor Tea Bungalow', 'Coonoor', 'Sim’s Park', 'hills', 4.7],
];

export const HOTELS: Hotel[] = HOTEL_SEEDS.map(([name, city, area, scene, rating], i) => {
  const rnd = seeded(7700 + i * 61);
  const base = Math.round((1800 + rnd() * 4200) / 100) * 100;
  return {
    id: `ht-${i}`,
    name,
    city,
    area,
    rating,
    reviews: 120 + Math.floor(rnd() * 1800),
    scene,
    amenities: ['Free Wi-Fi', 'Breakfast', 'AC', 'Parking', 'Room service'].filter(() => rnd() > 0.25),
    rooms: [
      { type: 'Standard Room', price: base, capacity: 2, left: 2 + Math.floor(rnd() * 8) },
      { type: 'Deluxe Room', price: Math.round((base * 1.4) / 100) * 100, capacity: 3, left: 1 + Math.floor(rnd() * 6) },
      { type: 'Suite', price: Math.round((base * 2.1) / 100) * 100, capacity: 4, left: 1 + Math.floor(rnd() * 3) },
    ],
  };
});

/* ---------------------------------------------------- Holiday packages -- */

export interface HolidayPackage {
  id: string;
  name: string;
  origin: string;
  destinations: string[];
  nights: number;
  days: number;
  price: number;
  scene: Scene;
  inclusions: ('train' | 'cab' | 'bus' | 'hotel' | 'meal' | 'insurance')[];
  summary: string;
  itinerary: { day: number; title: string; detail: string }[];
}

export const PACKAGES: HolidayPackage[] = [
  {
    id: 'pkg-1',
    name: 'Divine Tamil Nadu',
    origin: 'Chennai',
    destinations: ['Madurai', 'Rameswaram', 'Kanyakumari'],
    nights: 4,
    days: 5,
    price: 14500,
    scene: 'temple',
    inclusions: ['train', 'hotel', 'cab', 'meal', 'insurance'],
    summary: 'Three temple towns and the southern tip of the country, moved between overnight so no daylight is lost.',
    itinerary: [
      { day: 1, title: 'Chennai → Madurai', detail: 'Overnight train. Morning arrival, Meenakshi Amman temple in the evening.' },
      { day: 2, title: 'Madurai → Rameswaram', detail: 'Road transfer over the Pamban bridge, Ramanathaswamy temple.' },
      { day: 3, title: 'Rameswaram → Kanyakumari', detail: 'Coastal drive, sunset at the confluence.' },
      { day: 4, title: 'Kanyakumari', detail: 'Sunrise viewpoint, Vivekananda Rock, Thiruvalluvar statue.' },
      { day: 5, title: 'Return', detail: 'Overnight train back to Chennai.' },
    ],
  },
  {
    id: 'pkg-2',
    name: 'Kerala Backwaters & Hills',
    origin: 'Chennai',
    destinations: ['Kochi', 'Munnar', 'Alleppey'],
    nights: 5,
    days: 6,
    price: 21900,
    scene: 'backwater',
    inclusions: ['train', 'hotel', 'cab', 'meal'],
    summary: 'Tea estates, a houseboat night on the backwaters, and Fort Kochi’s colonial quarter.',
    itinerary: [
      { day: 1, title: 'Chennai → Kochi', detail: 'Overnight train to Ernakulam.' },
      { day: 2, title: 'Fort Kochi', detail: 'Chinese fishing nets, Mattancherry palace, Jew Town.' },
      { day: 3, title: 'Kochi → Munnar', detail: 'Ghat road drive, tea museum, Mattupetty dam.' },
      { day: 4, title: 'Munnar', detail: 'Eravikulam park, Top Station viewpoint.' },
      { day: 5, title: 'Alleppey houseboat', detail: 'Overnight on the backwaters with all meals aboard.' },
      { day: 6, title: 'Return', detail: 'Transfer to Ernakulam, train home.' },
    ],
  },
  {
    id: 'pkg-3',
    name: 'Golden Triangle Classic',
    origin: 'Delhi',
    destinations: ['Delhi', 'Agra', 'Jaipur'],
    nights: 5,
    days: 6,
    price: 24500,
    scene: 'heritage',
    inclusions: ['train', 'hotel', 'cab', 'meal', 'insurance'],
    summary: 'The three-city circuit, with the Agra leg on a morning Shatabdi rather than a five-hour road transfer.',
    itinerary: [
      { day: 1, title: 'Delhi', detail: 'Qutub Minar, Humayun’s tomb, India Gate.' },
      { day: 2, title: 'Delhi → Agra', detail: 'Morning Shatabdi. Taj Mahal at sunset.' },
      { day: 3, title: 'Agra', detail: 'Agra Fort, Mehtab Bagh, Fatehpur Sikri en route.' },
      { day: 4, title: 'Agra → Jaipur', detail: 'Road transfer, evening at Chokhi Dhani.' },
      { day: 5, title: 'Jaipur', detail: 'Amber Fort, Hawa Mahal, City Palace.' },
      { day: 6, title: 'Return', detail: 'Transfer to Delhi.' },
    ],
  },
  {
    id: 'pkg-4',
    name: 'Goa Beach Break',
    origin: 'Bengaluru',
    destinations: ['North Goa', 'South Goa'],
    nights: 3,
    days: 4,
    price: 12800,
    scene: 'beach',
    inclusions: ['train', 'hotel', 'cab'],
    summary: 'A short coastal reset — Konkan railway down, beaches north and south, nothing over-scheduled.',
    itinerary: [
      { day: 1, title: 'Bengaluru → Goa', detail: 'Overnight train to Madgaon.' },
      { day: 2, title: 'North Goa', detail: 'Baga, Calangute, Anjuna flea market.' },
      { day: 3, title: 'South Goa', detail: 'Palolem, Colva, Basilica of Bom Jesus.' },
      { day: 4, title: 'Return', detail: 'Evening train back.' },
    ],
  },
  {
    id: 'pkg-5',
    name: 'Nilgiri Hill Escape',
    origin: 'Chennai',
    destinations: ['Coimbatore', 'Ooty', 'Coonoor'],
    nights: 3,
    days: 4,
    price: 11200,
    scene: 'hills',
    inclusions: ['train', 'hotel', 'cab', 'meal'],
    summary: 'Includes a reserved seat on the Nilgiri Mountain Railway — the toy train up from Mettupalayam.',
    itinerary: [
      { day: 1, title: 'Chennai → Coimbatore', detail: 'Overnight train.' },
      { day: 2, title: 'Mountain Railway → Ooty', detail: 'Toy train to Coonoor, road to Ooty. Botanical garden.' },
      { day: 3, title: 'Ooty & Coonoor', detail: 'Doddabetta peak, tea estates, Sim’s Park.' },
      { day: 4, title: 'Return', detail: 'Descend to Coimbatore, train home.' },
    ],
  },
  {
    id: 'pkg-6',
    name: 'Rajasthan Desert Trail',
    origin: 'Delhi',
    destinations: ['Jodhpur', 'Jaisalmer', 'Udaipur'],
    nights: 6,
    days: 7,
    price: 31500,
    scene: 'desert',
    inclusions: ['train', 'hotel', 'cab', 'meal', 'insurance'],
    summary: 'Blue city, golden fort and lake palaces, with the long legs covered overnight by rail.',
    itinerary: [
      { day: 1, title: 'Delhi → Jodhpur', detail: 'Overnight train.' },
      { day: 2, title: 'Jodhpur', detail: 'Mehrangarh fort, Jaswant Thada, old city bazaars.' },
      { day: 3, title: 'Jodhpur → Jaisalmer', detail: 'Day train across the Thar.' },
      { day: 4, title: 'Jaisalmer', detail: 'Golden fort, Sam dunes, desert camp night.' },
      { day: 5, title: 'Jaisalmer → Udaipur', detail: 'Overnight transfer.' },
      { day: 6, title: 'Udaipur', detail: 'City Palace, Lake Pichola boat ride.' },
      { day: 7, title: 'Return', detail: 'Train to Delhi.' },
    ],
  },
];

/* ---------------------------------------------------------------- Cabs -- */

export interface CabType {
  id: string;
  name: string;
  category: string;
  seats: number;
  bags: number;
  per_km: number;
  base: number;
  eta_minutes: number;
  examples: string;
}

export const CAB_TYPES: CabType[] = [
  { id: 'cab-hatch', name: 'Hatchback', category: 'Economy', seats: 4, bags: 2, per_km: 12, base: 90, eta_minutes: 4, examples: 'Swift, i10' },
  { id: 'cab-sedan', name: 'Sedan', category: 'Comfort', seats: 4, bags: 3, per_km: 15, base: 120, eta_minutes: 6, examples: 'Dzire, Etios' },
  { id: 'cab-suv', name: 'SUV', category: 'Spacious', seats: 6, bags: 4, per_km: 19, base: 170, eta_minutes: 8, examples: 'Ertiga, Innova' },
  { id: 'cab-prime', name: 'Prime SUV', category: 'Premium', seats: 6, bags: 5, per_km: 24, base: 220, eta_minutes: 11, examples: 'Innova Crysta' },
];

export const DRIVERS = [
  { name: 'Ramesh K.', rating: 4.8, vehicle: 'TN 09 BX 4412' },
  { name: 'Suresh M.', rating: 4.7, vehicle: 'KA 05 MJ 8830' },
  { name: 'Anil P.', rating: 4.9, vehicle: 'TS 07 UB 2201' },
  { name: 'Deepak S.', rating: 4.6, vehicle: 'MH 12 QR 6654' },
];

/* ---------------------------------------------------------- Activities -- */

export interface Activity {
  id: string;
  name: string;
  city: string;
  category: string;
  duration: string;
  price: number;
  rating: number;
  scene: Scene;
  summary: string;
}

export const ACTIVITIES: Activity[] = [
  { id: 'ac-1', name: 'Mahabalipuram Shore Temple Walk', city: 'Chennai', category: 'Heritage', duration: '4 hours', price: 950, rating: 4.6, scene: 'heritage', summary: 'Guided morning walk through the Pallava rock-cut monuments and the shore temple.' },
  { id: 'ac-2', name: 'Bengaluru Palace & Craft Trail', city: 'Bengaluru', category: 'City tour', duration: '5 hours', price: 1200, rating: 4.3, scene: 'city', summary: 'Tudor-style palace, Lalbagh glasshouse and the Cottonpet craft lanes.' },
  { id: 'ac-3', name: 'Alleppey Sunset Canoe', city: 'Alleppey', category: 'Nature', duration: '2 hours', price: 800, rating: 4.8, scene: 'backwater', summary: 'Narrow-canal canoe through paddy polders, away from the houseboat routes.' },
  { id: 'ac-4', name: 'Munnar Tea Estate Tour', city: 'Munnar', category: 'Nature', duration: '3 hours', price: 700, rating: 4.5, scene: 'hills', summary: 'Plucking demonstration, factory floor and a tasting flight of estate grades.' },
  { id: 'ac-5', name: 'Goa Dolphin & Fort Cruise', city: 'Goa', category: 'Water', duration: '3 hours', price: 1100, rating: 4.2, scene: 'beach', summary: 'Morning boat past Aguada fort with a dolphin-spotting stretch off Sinquerim.' },
  { id: 'ac-6', name: 'Jaipur Amber Fort Sound & Light', city: 'Jaipur', category: 'Heritage', duration: '2 hours', price: 650, rating: 4.4, scene: 'desert', summary: 'Evening projection show across the fort ramparts, narrated in Hindi and English.' },
  { id: 'ac-7', name: 'Madurai Temple Night Ritual', city: 'Madurai', category: 'Heritage', duration: '2 hours', price: 500, rating: 4.7, scene: 'temple', summary: 'The Palliyarai ceremony at Meenakshi Amman, with context from a temple guide.' },
  { id: 'ac-8', name: 'Nilgiri Mountain Railway Ride', city: 'Ooty', category: 'Rail', duration: '5 hours', price: 1450, rating: 4.9, scene: 'rail', summary: 'Reserved seat on the UNESCO-listed rack railway from Mettupalayam to Coonoor.' },
];

/* -------------------------------------------------------------- Offers -- */

export interface Offer {
  id: string;
  code: string;
  title: string;
  applies_to: string;
  category: 'train' | 'flight' | 'hotel' | 'bus' | 'package' | 'all';
  /** Percentage off, capped by max_off. */
  percent: number;
  max_off: number;
  min_spend: number;
  terms: string;
  icon: 'percent' | 'plane' | 'building' | 'bus' | 'gift';
}

export const OFFERS: Offer[] = [
  { id: 'of-1', code: 'RIOTRAIN', title: 'FLAT 10% OFF', applies_to: 'On Train Bookings', category: 'train', percent: 10, max_off: 300, min_spend: 500, terms: 'Valid on General and Tatkal quota train bookings. Maximum discount ₹300 per booking. One use per journey.', icon: 'percent' },
  { id: 'of-2', code: 'RIFLY', title: 'Up to ₹750 OFF', applies_to: 'On Flight Bookings', category: 'flight', percent: 12, max_off: 750, min_spend: 3000, terms: 'Applicable on domestic economy fares above ₹3,000. Not valid with airline promo fares.', icon: 'plane' },
  { id: 'of-3', code: 'RIHOTEL', title: 'Up to 40% OFF', applies_to: 'On Hotels', category: 'hotel', percent: 40, max_off: 2000, min_spend: 1500, terms: 'On participating properties for stays of two nights or more. Blackout dates apply on national holidays.', icon: 'building' },
  { id: 'of-4', code: 'RIBUS15', title: 'FLAT 15% OFF', applies_to: 'On Bus Tickets', category: 'bus', percent: 15, max_off: 250, min_spend: 400, terms: 'Valid on AC sleeper and seater services. Maximum discount ₹250.', icon: 'bus' },
  { id: 'of-5', code: 'RIHOLIDAY', title: 'FLAT ₹2,000 OFF', applies_to: 'On Holiday Packages', category: 'package', percent: 8, max_off: 2000, min_spend: 10000, terms: 'On IRCTC Tourism packages of four nights or more. Cannot be clubbed with group discounts.', icon: 'gift' },
  { id: 'of-6', code: 'RIWALLET', title: '5% Wallet Cashback', applies_to: 'Paying with IRCTC eWallet', category: 'all', percent: 5, max_off: 150, min_spend: 200, terms: 'Cashback credited to your eWallet instantly when you pay from the wallet balance.', icon: 'percent' },
];

export function findOffer(code: string): Offer | undefined {
  return OFFERS.find((o) => o.code.toUpperCase() === code.trim().toUpperCase());
}

/**
 * Applies a promo to a subtotal. Returns zero discount when the code does not
 * exist, does not cover the category, or the cart is under the minimum — the
 * checkout surfaces the reason rather than silently ignoring the code.
 */
export function applyOffer(
  code: string,
  subtotal: number,
  category: Offer['category'],
): { discount: number; offer?: Offer; reason?: string } {
  const offer = findOffer(code);
  if (!offer) return { discount: 0, reason: 'That code is not recognised.' };
  if (offer.category !== 'all' && offer.category !== category) {
    return { discount: 0, offer, reason: `${offer.code} applies to ${offer.applies_to.toLowerCase()}.` };
  }
  if (subtotal < offer.min_spend) {
    return { discount: 0, offer, reason: `${offer.code} needs a minimum spend of ₹${offer.min_spend}.` };
  }
  return { discount: Math.min(Math.round((subtotal * offer.percent) / 100), offer.max_off), offer };
}

/* ------------------------------------------------------ Food on train -- */

export interface FoodVendor {
  id: string;
  name: string;
  station: string;
  cuisine: string;
  rating: number;
  veg_only: boolean;
  min_order: number;
  items: { id: string; name: string; price: number; veg: boolean; description: string }[];
}

export const FOOD_VENDORS: FoodVendor[] = [
  {
    id: 'fv-1', name: 'Saravana Bhavan', station: 'KPD', cuisine: 'South Indian', rating: 4.5, veg_only: true, min_order: 120,
    items: [
      { id: 'fi-1', name: 'Mini Tiffin', price: 180, veg: true, description: 'Idli, vada, pongal, chutney and sambar' },
      { id: 'fi-2', name: 'South Indian Thali', price: 260, veg: true, description: 'Rice, three sides, sambar, rasam, curd, appalam' },
      { id: 'fi-3', name: 'Curd Rice Pack', price: 110, veg: true, description: 'With pickle and fryums' },
      { id: 'fi-4', name: 'Filter Coffee', price: 45, veg: true, description: 'Served in a sealed cup' },
    ],
  },
  {
    id: 'fv-2', name: 'Comesum', station: 'SBC', cuisine: 'Multi-cuisine', rating: 4.1, veg_only: false, min_order: 150,
    items: [
      { id: 'fi-5', name: 'Chicken Biryani', price: 320, veg: false, description: 'Boneless, with raita and salan' },
      { id: 'fi-6', name: 'Veg Biryani', price: 240, veg: true, description: 'With raita and boiled egg optional' },
      { id: 'fi-7', name: 'Paneer Butter Masala + Roti', price: 280, veg: true, description: 'Three rotis, gravy, salad' },
      { id: 'fi-8', name: 'Masala Chai', price: 30, veg: true, description: 'Hot, sealed cup' },
    ],
  },
  {
    id: 'fv-3', name: 'Jain Bhojanalaya', station: 'JTJ', cuisine: 'North Indian', rating: 4.3, veg_only: true, min_order: 100,
    items: [
      { id: 'fi-9', name: 'Jain Thali (no onion/garlic)', price: 230, veg: true, description: 'Dal, sabzi, four rotis, rice, sweet' },
      { id: 'fi-10', name: 'Poori Sabzi', price: 160, veg: true, description: 'Six pooris with aloo sabzi' },
      { id: 'fi-11', name: 'Fruit Bowl', price: 120, veg: true, description: 'Seasonal, cut fresh at the station' },
    ],
  },
];

/* ----------------------------------------------------- Retiring rooms -- */

export interface RetiringRoom {
  id: string;
  station: string;
  type: string;
  ac: boolean;
  beds: number;
  price_12h: number;
  price_24h: number;
  available: number;
  amenities: string[];
}

export const RETIRING_ROOMS: RetiringRoom[] = [
  { id: 'rr-1', station: 'MAS', type: 'AC Double Bed', ac: true, beds: 2, price_12h: 900, price_24h: 1500, available: 4, amenities: ['Attached bath', 'Wi-Fi', 'TV'] },
  { id: 'rr-2', station: 'MAS', type: 'Non-AC Dormitory', ac: false, beds: 1, price_12h: 250, price_24h: 400, available: 12, amenities: ['Shared bath', 'Locker'] },
  { id: 'rr-3', station: 'SBC', type: 'AC Suite', ac: true, beds: 3, price_12h: 1400, price_24h: 2300, available: 2, amenities: ['Attached bath', 'Wi-Fi', 'TV', 'Sitting area'] },
  { id: 'rr-4', station: 'SBC', type: 'AC Single Bed', ac: true, beds: 1, price_12h: 700, price_24h: 1150, available: 6, amenities: ['Attached bath', 'Wi-Fi'] },
  { id: 'rr-5', station: 'MDU', type: 'Non-AC Double Bed', ac: false, beds: 2, price_12h: 400, price_24h: 650, available: 5, amenities: ['Attached bath'] },
  { id: 'rr-6', station: 'CBE', type: 'AC Double Bed', ac: true, beds: 2, price_12h: 850, price_24h: 1400, available: 3, amenities: ['Attached bath', 'Wi-Fi', 'TV'] },
];

/* ------------------------------------------------------------ Lounges -- */

export interface Lounge {
  id: string;
  station: string;
  name: string;
  hours: string;
  price_2h: number;
  price_6h: number;
  eligible_classes: string[];
  amenities: string[];
}

export const LOUNGES: Lounge[] = [
  { id: 'lg-1', station: 'MAS', name: 'Executive Lounge, Platform 1', hours: '05:00 – 23:00', price_2h: 200, price_6h: 450, eligible_classes: ['1A', '2A', 'EC'], amenities: ['Buffet', 'Wi-Fi', 'Showers', 'Recliners'] },
  { id: 'lg-2', station: 'SBC', name: 'Rail Yatri Lounge', hours: '24 hours', price_2h: 180, price_6h: 400, eligible_classes: ['1A', '2A', '3A', 'CC', 'EC'], amenities: ['Snacks', 'Wi-Fi', 'Showers'] },
  { id: 'lg-3', station: 'NDLS', name: 'Executive Lounge, Ajmeri Gate', hours: '24 hours', price_2h: 250, price_6h: 550, eligible_classes: ['1A', '2A', 'EC'], amenities: ['Buffet', 'Wi-Fi', 'Showers', 'Business desk'] },
  { id: 'lg-4', station: 'HWH', name: 'Yatri Nivas Lounge', hours: '06:00 – 22:00', price_2h: 160, price_6h: 350, eligible_classes: ['1A', '2A', '3A'], amenities: ['Snacks', 'Wi-Fi'] },
];

/* ------------------------------------------------ Loyalty and rewards -- */

export interface Reward {
  id: string;
  name: string;
  points: number;
  category: string;
  detail: string;
}

export const REWARDS: Reward[] = [
  { id: 'rw-1', name: '₹100 off any train booking', points: 500, category: 'Travel', detail: 'Applied automatically at checkout on your next train ticket.' },
  { id: 'rw-2', name: 'Free lounge access (2 hours)', points: 800, category: 'Comfort', detail: 'Redeemable at any participating IRCTC executive lounge.' },
  { id: 'rw-3', name: 'Complimentary meal on board', points: 600, category: 'Food', detail: 'One veg or non-veg thali delivered to your seat.' },
  { id: 'rw-4', name: '₹500 off a holiday package', points: 2000, category: 'Travel', detail: 'On IRCTC Tourism packages of three nights or more.' },
  { id: 'rw-5', name: 'Free seat upgrade request', points: 1500, category: 'Comfort', detail: 'Priority consideration for the next class up, subject to availability.' },
  { id: 'rw-6', name: '₹250 eWallet top-up', points: 1200, category: 'Wallet', detail: 'Credited to your IRCTC eWallet within an hour.' },
];

export const TIER_THRESHOLDS: { tier: 'Silver' | 'Gold' | 'Platinum'; points: number; perks: string[] }[] = [
  { tier: 'Silver', points: 0, perks: ['1 point per ₹100 spent', 'Birthday offer', 'Standard support'] },
  { tier: 'Gold', points: 5000, perks: ['1.5 points per ₹100', 'Free cancellation once a year', 'Priority support', 'Lounge discount'] },
  { tier: 'Platinum', points: 15000, perks: ['2 points per ₹100', 'Free cancellation twice a year', 'Dedicated support line', 'Two free lounge visits'] },
];

/* ----------------------------------------------------------- Support --- */

export const FAQS: { q: string; a: string }[] = [
  { q: 'How to check PNR status?', a: 'Open PNR Enquiry from the sidebar, or ask the Assistant "what is my PNR status". Enter the ten-digit number on your ticket and you will get the current position of every passenger in plain language — confirmed, RAC with a berth to share, or waitlisted with the number ahead of you.' },
  { q: 'What is Tatkal booking time?', a: 'Tatkal opens one day before the journey date, excluding the day of travel: 10:00 AM for AC classes and 11:00 AM for non-AC. The Tatkal quota is smaller and the fare is higher, but it is the fastest route to a confirmed seat close to departure.' },
  { q: 'How to cancel a ticket?', a: 'Open My Trips, choose the journey and select Cancel. You will see the exact refund amount before you confirm — the cancellation charge depends on class and how close to departure you are. The refund returns to your original payment method, or instantly to your eWallet.' },
  { q: 'What is TDR and how it works?', a: 'A Ticket Deposit Receipt is how you claim a refund when the normal cancellation route does not apply — the train was late by more than three hours, the coach was not attached, or your confirmed berth was not provided. File it from the TDR Status screen; claims are reviewed and settled to the original payment method.' },
  { q: 'How to get refund?', a: 'Cancellations refund automatically to the source. A TDR claim is reviewed first and then settled. Either way you can follow the state on the Cancelled Tickets and TDR Status screens — Filed, Under Review, Resolved — with no need to call anyone.' },
  { q: 'Can I change the boarding station?', a: 'Yes, up to 24 hours before departure, and only once. Open the journey in My Trips and choose Change boarding point. The fare is not recalculated, but you lose the right to board at the original station.' },
  { q: 'What is RAC?', a: 'Reservation Against Cancellation. You have a confirmed place on the train and a seat to sit on, shared with one other passenger, and you move to a full berth if someone ahead of you cancels. You can travel on an RAC ticket — a waitlisted one you cannot.' },
  { q: 'How do I add a co-passenger?', a: 'Open Profile and add them once under travel people. From then on they appear as a one-tap choice on every booking, so you never retype an age or an ID again.' },
];

export const SUPPORT_CHANNELS = [
  { id: 'sc-1', label: 'Rail Madad helpline', value: '139', detail: 'Round the clock, all languages' },
  { id: 'sc-2', label: 'Security helpline', value: '182', detail: 'Railway Protection Force' },
  { id: 'sc-3', label: 'IRCTC e-ticketing', value: '14646', detail: '07:00 – 22:00 daily' },
  { id: 'sc-4', label: 'Email', value: 'care@irctc.co.in', detail: 'Response within 48 hours' },
];

export const GRIEVANCE_CATEGORIES = [
  'Coach cleanliness',
  'Catering and food quality',
  'Punctuality',
  'Staff behaviour',
  'Security',
  'Water availability',
  'Electrical or AC fault',
  'Bedroll not provided',
  'Refund not received',
  'Other',
];

export const TDR_REASONS = [
  'Train cancelled by railways',
  'Train late by more than three hours',
  'AC failure in the coach',
  'Coach not attached to the train',
  'Confirmed berth not provided',
  'Travelled without proper berth',
  'Difference of fare not refunded',
];
