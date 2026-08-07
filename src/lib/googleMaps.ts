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

// Default Substation Location Coordinates (Awaiting Live Blynk Hardware GPS Sync)
export const DEFAULT_LOCATION: LocationCoordinates = {
  lat: 0,
  lng: 0,
};

/**
 * Generates a direct clickable Google Maps URL for given coordinates.
 */
export function getGoogleMapsUrl(lat?: number, lng?: number): string {
  if (!lat || !lng || (lat === 0 && lng === 0)) {
    return "https://www.google.com/maps";
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Generates an embedded Google Maps iframe URL using Google Maps Embed API Key.
 */
export function getGoogleMapsEmbedUrl(lat?: number, lng?: number): string {
  if (!lat || !lng || (lat === 0 && lng === 0)) {
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=0,0&zoom=2`;
  }
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${lat},${lng}&zoom=15`;
}

/**
 * Generates a Google Static Maps image URL using API Key.
 */
export function getGoogleStaticMapUrl(lat?: number, lng?: number, width = 600, height = 300): string {
  if (!lat || !lng || (lat === 0 && lng === 0)) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=2&size=${width}x${height}&key=${GOOGLE_MAPS_API_KEY}`;
  }
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=${width}x${height}&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
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
