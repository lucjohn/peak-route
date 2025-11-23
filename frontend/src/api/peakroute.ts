import { TransitRoute, GeocodeResult } from "@/types/route";

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";


export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  if (!address.trim()) {
    throw new Error("Address cannot be empty");
  }

  const res = await fetch(
    `/api/geocode?address=${encodeURIComponent(address)}`
  );

  if (!res.ok) {
    throw new Error("Geocoding failed");
  }

  return await res.json(); // { lat, lng }
}

/**
 * Fetch autocomplete suggestions from backend
 * @param input - User input for address
 */
export async function fetchAutocomplete(input: string): Promise<string[]> {
  try {
    const url = `${API_BASE_URL}/api/autocomplete?input=${encodeURIComponent(input)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Autocomplete request failed");
    }

    const data = await response.json();
    return data.predictions?.map((p: any) => p.description) || [];
  } catch (error) {
    console.error("Autocomplete error:", error);
    return [];
  }
}

/**
 * Fetch transit routes from backend API
 * @param origin - Origin coordinates in "lat,lng" format
 * @param destination - Destination coordinates in "lat,lng" format
 * @param arrivalTime - Optional arrival time in HH:MM format
 */
export async function fetchRoutes(
  origin: string,
  destination: string,
  arrivalTime?: string
): Promise<TransitRoute[]> {
  try {
    let url = `${API_BASE_URL}/api/routes?origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}`;
    
    if (arrivalTime) {
      url += `&arrivalTime=${encodeURIComponent(arrivalTime)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.routes || [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch routes. Please try again.");
  }
}



