import Geolocation from '@react-native-community/geolocation';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation extends Coordinates {
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
}

export const locationService = {
  /**
   * Get current GPS coordinates. Caller must ensure permission is granted.
   * Times out after 10s.
   */
  getCurrentPosition: (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    });
  },

  /**
   * Reverse-geocode lat/lng to a human-readable address using Nominatim
   * (OpenStreetMap). No API key required. Replace with Google Geocoding
   * API for production-grade accuracy.
   */
  reverseGeocode: async (coords: Coordinates): Promise<ResolvedLocation> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OneTap365-App/1.0' },
      });
      if (!res.ok) throw new Error('Reverse geocoding failed');
      const data: {
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state?: string;
          postcode?: string;
        };
      } = await res.json();

      return {
        ...coords,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        address: data.display_name,
        pincode: data.address?.postcode,
      };
    } catch {
      return coords;
    }
  },
};
