/**
 * GOOGLE MAPS API & LOCATION UTILITIES
 * ------------------------------------
 * Configured with Google Maps API Key for interactive map rendering,
 * geocoding, and direct navigation links.
 */

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

// User's Google Maps API Key
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyCsSzjCkSzwbdMKNB6BLXk6iBFeyMabkKw";

// Substation GPS Location Coordinates: 18.650029, 73.745274 (Pimpri-Chinchwad, Pune)
export const DEFAULT_LOCATION: LocationCoordinates = {
  lat: 18.650029,
  lng: 73.745274,
};

/**
 * Generates a direct clickable Google Maps URL for given coordinates.
 */
export function getGoogleMapsUrl(lat?: number, lng?: number): string {
  const targetLat = lat && lat !== 0 ? lat : DEFAULT_LOCATION.lat;
  const targetLng = lng && lng !== 0 ? lng : DEFAULT_LOCATION.lng;
  return `https://www.google.com/maps?q=${targetLat},${targetLng}`;
}

/**
 * Generates an embedded Google Maps iframe URL using Google Maps Embed API Key.
 */
export function getGoogleMapsEmbedUrl(lat?: number, lng?: number): string {
  const targetLat = lat && lat !== 0 ? lat : DEFAULT_LOCATION.lat;
  const targetLng = lng && lng !== 0 ? lng : DEFAULT_LOCATION.lng;
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${targetLat},${targetLng}&zoom=15`;
}

/**
 * Generates a Google Static Maps image URL using API Key.
 */
export function getGoogleStaticMapUrl(lat?: number, lng?: number, width = 600, height = 300): string {
  const targetLat = lat && lat !== 0 ? lat : DEFAULT_LOCATION.lat;
  const targetLng = lng && lng !== 0 ? lng : DEFAULT_LOCATION.lng;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${targetLat},${targetLng}&zoom=15&size=${width}x${height}&markers=color:red%7C${targetLat},${targetLng}&key=${GOOGLE_MAPS_API_KEY}`;
}

/**
 * Opens Google Maps navigation in a new tab / external mobile browser app.
 */
export function openGoogleMapsNavigation(lat?: number, lng?: number) {
  const url = getGoogleMapsUrl(lat, lng);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
