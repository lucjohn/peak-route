export interface TransitRoute {
  durationMin: number;
  busNumber: string | null;
  pickupArrivalTime?: string | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
}
