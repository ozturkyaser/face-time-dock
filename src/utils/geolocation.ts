// Geolocation utilities for geofencing

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export interface GeofenceResult {
  allowed: boolean;
  distance?: number;
  error?: string;
}

/**
 * Get current GPS position
 */
export const getCurrentPosition = (): Promise<GeoPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation wird von diesem Browser nicht unterstützt"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = "Standort konnte nicht ermittelt werden";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Standortzugriff wurde verweigert";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Standortinformationen nicht verfügbar";
            break;
          case error.TIMEOUT:
            errorMessage = "Zeitüberschreitung beim Abrufen des Standorts";
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if user is within geofence of a location
 */
export const checkGeofence = async (
  locationLat: number | null,
  locationLon: number | null,
  radiusMeters: number | null
): Promise<GeofenceResult> => {
  // If no geofence is configured, allow access
  if (locationLat === null || locationLon === null || !radiusMeters) {
    return { allowed: true };
  }

  try {
    const userPosition = await getCurrentPosition();
    const distance = calculateDistance(
      locationLat,
      locationLon,
      userPosition.latitude,
      userPosition.longitude
    );

    const allowed = distance <= radiusMeters;

    return {
      allowed,
      distance: Math.round(distance),
    };
  } catch (error) {
    return {
      allowed: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
};

/**
 * Format distance for display
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};
