// Approximate centroids for country dots on the world map. Not exhaustive —
// unlisted country codes are simply omitted from the map (they still show in the list).
export const COUNTRY_META: Record<string, { name: string; lat: number; lon: number }> = {
  US: { name: "United States", lat: 39.8, lon: -98.6 },
  CA: { name: "Canada", lat: 56.1, lon: -106.3 },
  MX: { name: "Mexico", lat: 23.6, lon: -102.5 },
  BR: { name: "Brazil", lat: -14.2, lon: -51.9 },
  AR: { name: "Argentina", lat: -38.4, lon: -63.6 },
  GB: { name: "United Kingdom", lat: 55.4, lon: -3.4 },
  IE: { name: "Ireland", lat: 53.4, lon: -8.2 },
  FR: { name: "France", lat: 46.6, lon: 2.2 },
  DE: { name: "Germany", lat: 51.2, lon: 10.4 },
  ES: { name: "Spain", lat: 40.5, lon: -3.7 },
  IT: { name: "Italy", lat: 41.9, lon: 12.6 },
  NL: { name: "Netherlands", lat: 52.1, lon: 5.3 },
  SE: { name: "Sweden", lat: 60.1, lon: 18.6 },
  PL: { name: "Poland", lat: 51.9, lon: 19.1 },
  IN: { name: "India", lat: 20.6, lon: 79.0 },
  CN: { name: "China", lat: 35.9, lon: 104.2 },
  JP: { name: "Japan", lat: 36.2, lon: 138.3 },
  KR: { name: "South Korea", lat: 35.9, lon: 127.8 },
  SG: { name: "Singapore", lat: 1.35, lon: 103.8 },
  ID: { name: "Indonesia", lat: -0.8, lon: 113.9 },
  AU: { name: "Australia", lat: -25.3, lon: 133.8 },
  NZ: { name: "New Zealand", lat: -41.0, lon: 174.9 },
  ZA: { name: "South Africa", lat: -30.6, lon: 22.9 },
  NG: { name: "Nigeria", lat: 9.1, lon: 8.7 },
  EG: { name: "Egypt", lat: 26.8, lon: 30.8 },
  AE: { name: "United Arab Emirates", lat: 23.4, lon: 53.8 },
  SA: { name: "Saudi Arabia", lat: 23.9, lon: 45.1 },
  RU: { name: "Russia", lat: 61.5, lon: 105.3 },
  TR: { name: "Turkey", lat: 38.9, lon: 35.2 },
  VN: { name: "Vietnam", lat: 14.1, lon: 108.3 },
  PH: { name: "Philippines", lat: 12.9, lon: 121.8 },
  TH: { name: "Thailand", lat: 15.9, lon: 100.9 },
  PT: { name: "Portugal", lat: 39.4, lon: -8.2 },
  CH: { name: "Switzerland", lat: 46.8, lon: 8.2 },
  AT: { name: "Austria", lat: 47.5, lon: 14.6 },
  BE: { name: "Belgium", lat: 50.5, lon: 4.5 },
  DK: { name: "Denmark", lat: 56.3, lon: 9.5 },
  NO: { name: "Norway", lat: 60.5, lon: 8.5 },
  FI: { name: "Finland", lat: 61.9, lon: 25.7 },
  CO: { name: "Colombia", lat: 4.6, lon: -74.3 },
  CL: { name: "Chile", lat: -35.7, lon: -71.5 },
  PE: { name: "Peru", lat: -9.2, lon: -75.0 },
  IL: { name: "Israel", lat: 31.0, lon: 34.8 },
  PK: { name: "Pakistan", lat: 30.4, lon: 69.3 },
  BD: { name: "Bangladesh", lat: 23.7, lon: 90.4 },
  UA: { name: "Ukraine", lat: 48.4, lon: 31.2 },
  RO: { name: "Romania", lat: 45.9, lon: 24.9 },
  GR: { name: "Greece", lat: 39.1, lon: 21.8 },
  CZ: { name: "Czechia", lat: 49.8, lon: 15.5 },
  HK: { name: "Hong Kong", lat: 22.3, lon: 114.2 },
  MY: { name: "Malaysia", lat: 4.2, lon: 101.9 },
};

export function countryToPoint(code: string) {
  const meta = COUNTRY_META[code];
  if (!meta) return null;
  const x = ((meta.lon + 180) / 360) * 650;
  const y = ((90 - meta.lat) / 180) * 247;
  return { x: +x.toFixed(1), y: +y.toFixed(1), name: meta.name };
}

export function countryName(code: string) {
  return COUNTRY_META[code]?.name ?? code;
}
