import type { Station } from '@/types';

/** MOCK master data. Names are language maps so a single toggle switches
 *  station names along with the UI (master prompt §12). */
export const STATIONS: Station[] = [
  { code: 'MAS', name: { en: 'Chennai Central', ta: 'சென்னை சென்ட்ரல்', hi: 'चेन्नई सेंट्रल' }, city: { en: 'Chennai', ta: 'சென்னை', hi: 'चेन्नई' }, state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { code: 'MS', name: { en: 'Chennai Egmore', ta: 'சென்னை எழும்பூர்', hi: 'चेन्नई एग्मोर' }, city: { en: 'Chennai', ta: 'சென்னை', hi: 'चेन्नई' }, state: 'Tamil Nadu', lat: 13.0781, lng: 80.2609 },
  { code: 'SBC', name: { en: 'KSR Bengaluru', ta: 'கே.எஸ்.ஆர் பெங்களூரு', hi: 'केएसआर बेंगलुरु' }, city: { en: 'Bengaluru', ta: 'பெங்களூரு', hi: 'बेंगलुरु' }, state: 'Karnataka', lat: 12.9776, lng: 77.5713 },
  { code: 'YPR', name: { en: 'Yesvantpur Junction', ta: 'யஸ்வந்த்பூர் சந்திப்பு', hi: 'यशवंतपुर जंक्शन' }, city: { en: 'Bengaluru', ta: 'பெங்களூரு', hi: 'बेंगलुरु' }, state: 'Karnataka', lat: 13.0234, lng: 77.5502 },
  { code: 'CBE', name: { en: 'Coimbatore Junction', ta: 'கோயம்புத்தூர் சந்திப்பு', hi: 'कोयंबटूर जंक्शन' }, city: { en: 'Coimbatore', ta: 'கோயம்புத்தூர்', hi: 'कोयंबटूर' }, state: 'Tamil Nadu', lat: 10.9974, lng: 76.9645 },
  { code: 'MDU', name: { en: 'Madurai Junction', ta: 'மதுரை சந்திப்பு', hi: 'मदुरै जंक्शन' }, city: { en: 'Madurai', ta: 'மதுரை', hi: 'मदुरै' }, state: 'Tamil Nadu', lat: 9.9195, lng: 78.1193 },
  { code: 'TPJ', name: { en: 'Tiruchirappalli Junction', ta: 'திருச்சிராப்பள்ளி சந்திப்பு', hi: 'तिरुचिरापल्ली जंक्शन' }, city: { en: 'Tiruchirappalli', ta: 'திருச்சிராப்பள்ளி', hi: 'तिरुचिरापल्ली' }, state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047 },
  { code: 'CAPE', name: { en: 'Kanyakumari', ta: 'கன்னியாகுமரி', hi: 'कन्याकुमारी' }, city: { en: 'Kanyakumari', ta: 'கன்னியாகுமரி', hi: 'कन्याकुमारी' }, state: 'Tamil Nadu', lat: 8.0883, lng: 77.5385 },
  { code: 'KTYM', name: { en: 'Kottayam', ta: 'கோட்டயம்', hi: 'कोट्टायम' }, city: { en: 'Kottayam', ta: 'கோட்டயம்', hi: 'कोट्टायम' }, state: 'Kerala', lat: 9.5916, lng: 76.5222 },
  { code: 'ERS', name: { en: 'Ernakulam Junction', ta: 'எர்ணாகுளம் சந்திப்பு', hi: 'एर्नाकुलम जंक्शन' }, city: { en: 'Kochi', ta: 'கொச்சி', hi: 'कोच्चि' }, state: 'Kerala', lat: 9.9701, lng: 76.2870 },
  { code: 'KPD', name: { en: 'Katpadi Junction', ta: 'காட்பாடி சந்திப்பு', hi: 'काटपाडी जंक्शन' }, city: { en: 'Vellore', ta: 'வேலூர்', hi: 'वेल्लोर' }, state: 'Tamil Nadu', lat: 12.9698, lng: 79.1325 },
  { code: 'SA', name: { en: 'Salem Junction', ta: 'சேலம் சந்திப்பு', hi: 'सेलम जंक्शन' }, city: { en: 'Salem', ta: 'சேலம்', hi: 'सेलम' }, state: 'Tamil Nadu', lat: 11.6643, lng: 78.1460 },
  { code: 'ED', name: { en: 'Erode Junction', ta: 'ஈரோடு சந்திப்பு', hi: 'ईरोड जंक्शन' }, city: { en: 'Erode', ta: 'ஈரோடு', hi: 'ईरोड' }, state: 'Tamil Nadu', lat: 11.3410, lng: 77.7172 },
  { code: 'JTJ', name: { en: 'Jolarpettai Junction', ta: 'ஜோலார்பேட்டை சந்திப்பு', hi: 'जोलारपेट्टई जंक्शन' }, city: { en: 'Jolarpettai', ta: 'ஜோலார்பேட்டை', hi: 'जोलारपेट्टई' }, state: 'Tamil Nadu', lat: 12.5710, lng: 78.5730 },
  { code: 'SBC2', name: { en: 'Bengaluru Cantt', ta: 'பெங்களூரு கண்டோன்மென்ட்', hi: 'बेंगलुरु कैंट' }, city: { en: 'Bengaluru', ta: 'பெங்களூரு', hi: 'बेंगलुरु' }, state: 'Karnataka', lat: 12.9954, lng: 77.6013 },
  { code: 'HYB', name: { en: 'Hyderabad Deccan', ta: 'ஹைதராபாத் தக்காணம்', hi: 'हैदराबाद डेक्कन' }, city: { en: 'Hyderabad', ta: 'ஹைதராபாத்', hi: 'हैदराबाद' }, state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { code: 'SC', name: { en: 'Secunderabad Junction', ta: 'சிக்கந்தராபாத் சந்திப்பு', hi: 'सिकंदराबाद जंक्शन' }, city: { en: 'Hyderabad', ta: 'ஹைதராபாத்', hi: 'हैदराबाद' }, state: 'Telangana', lat: 17.4344, lng: 78.5013 },
  { code: 'BZA', name: { en: 'Vijayawada Junction', ta: 'விஜயவாடா சந்திப்பு', hi: 'विजयवाड़ा जंक्शन' }, city: { en: 'Vijayawada', ta: 'விஜயவாடா', hi: 'विजयवाड़ा' }, state: 'Andhra Pradesh', lat: 16.5174, lng: 80.6216 },
  { code: 'VSKP', name: { en: 'Visakhapatnam', ta: 'விசாகப்பட்டினம்', hi: 'विशाखापत्तनम' }, city: { en: 'Visakhapatnam', ta: 'விசாகப்பட்டினம்', hi: 'विशाखापत्तनम' }, state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { code: 'CSMT', name: { en: 'Mumbai CSMT', ta: 'மும்பை சி.எஸ்.எம்.டி', hi: 'मुंबई सीएसएमटी' }, city: { en: 'Mumbai', ta: 'மும்பை', hi: 'मुंबई' }, state: 'Maharashtra', lat: 18.9401, lng: 72.8352 },
  { code: 'BCT', name: { en: 'Mumbai Central', ta: 'மும்பை சென்ட்ரல்', hi: 'मुंबई सेंट्रल' }, city: { en: 'Mumbai', ta: 'மும்பை', hi: 'मुंबई' }, state: 'Maharashtra', lat: 18.9696, lng: 72.8194 },
  { code: 'NDLS', name: { en: 'New Delhi', ta: 'புது தில்லி', hi: 'नई दिल्ली' }, city: { en: 'Delhi', ta: 'தில்லி', hi: 'दिल्ली' }, state: 'Delhi', lat: 28.6431, lng: 77.2197 },
  { code: 'HWH', name: { en: 'Howrah Junction', ta: 'হাওড়া সন্ধিப்பு', hi: 'हावड़ा जंक्शन' }, city: { en: 'Kolkata', ta: 'கொல்கத்தா', hi: 'कोलकाता' }, state: 'West Bengal', lat: 22.5839, lng: 88.3425 },
  { code: 'PUNE', name: { en: 'Pune Junction', ta: 'புனே சந்திப்பு', hi: 'पुणे जंक्शन' }, city: { en: 'Pune', ta: 'புனே', hi: 'पुणे' }, state: 'Maharashtra', lat: 18.5285, lng: 73.8743 },
  { code: 'ADI', name: { en: 'Ahmedabad Junction', ta: 'அகமதாபாத் சந்திப்பு', hi: 'अहमदाबाद जंक्शन' }, city: { en: 'Ahmedabad', ta: 'அகமதாபாத்', hi: 'अहमदाबाद' }, state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { code: 'JP', name: { en: 'Jaipur Junction', ta: 'ஜெய்ப்பூர் சந்திப்பு', hi: 'जयपुर जंक्शन' }, city: { en: 'Jaipur', ta: 'ஜெய்ப்பூர்', hi: 'जयपुर' }, state: 'Rajasthan', lat: 26.9196, lng: 75.7878 },
  { code: 'PNBE', name: { en: 'Patna Junction', ta: 'பாட்னா சந்திப்பு', hi: 'पटना जंक्शन' }, city: { en: 'Patna', ta: 'பாட்னா', hi: 'पटना' }, state: 'Bihar', lat: 25.6017, lng: 85.1376 },
  { code: 'TVC', name: { en: 'Thiruvananthapuram Central', ta: 'திருவனந்தபுரம் சென்ட்ரல்', hi: 'तिरुवनंतपुरम सेंट्रल' }, city: { en: 'Thiruvananthapuram', ta: 'திருவனந்தபுரம்', hi: 'तिरुवनंतपुरम' }, state: 'Kerala', lat: 8.4875, lng: 76.9525 },
];

export const STATION_BY_CODE = new Map(STATIONS.map((s) => [s.code, s]));

export function getStation(code: string): Station | undefined {
  return STATION_BY_CODE.get(code);
}

/** Nearby alternatives, used by the no-dead-ends panel (§7). */
export const NEARBY_STATIONS: Record<string, string[]> = {
  MAS: ['MS'],
  MS: ['MAS'],
  SBC: ['YPR', 'SBC2'],
  YPR: ['SBC', 'SBC2'],
  SBC2: ['SBC', 'YPR'],
  HYB: ['SC'],
  SC: ['HYB'],
  CSMT: ['BCT'],
  BCT: ['CSMT'],
  ERS: ['KTYM'],
};
