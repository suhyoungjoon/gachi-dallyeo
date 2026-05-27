export interface RunRecord {
  id: string;
  date: string;         // ISO string
  distance: number;     // km (소수점 2자리)
  duration: number;     // seconds
  pace: string;         // "5'30\""
  calories: number;
  coordinates: Coordinate[];
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}
