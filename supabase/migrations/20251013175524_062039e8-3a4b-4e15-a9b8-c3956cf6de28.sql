
-- Add geolocation fields to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS latitude numeric(10, 8),
ADD COLUMN IF NOT EXISTS longitude numeric(11, 8),
ADD COLUMN IF NOT EXISTS geofence_radius_meters integer DEFAULT 100;

COMMENT ON COLUMN public.locations.latitude IS 'GPS latitude coordinate for geofencing';
COMMENT ON COLUMN public.locations.longitude IS 'GPS longitude coordinate for geofencing';
COMMENT ON COLUMN public.locations.geofence_radius_meters IS 'Allowed radius in meters for check-in/registration';

-- Function to calculate distance between two GPS coordinates using Haversine formula
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  earth_radius_km CONSTANT numeric := 6371;
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
  distance_km numeric;
BEGIN
  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  -- Haversine formula
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  distance_km := earth_radius_km * c;
  
  -- Convert to meters
  RETURN distance_km * 1000;
END;
$$;

-- Function to check if coordinates are within geofence
CREATE OR REPLACE FUNCTION public.is_within_geofence(
  location_id_param uuid,
  user_lat numeric,
  user_lon numeric
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc_lat numeric;
  loc_lon numeric;
  loc_radius integer;
  distance numeric;
BEGIN
  -- Get location data
  SELECT latitude, longitude, geofence_radius_meters
  INTO loc_lat, loc_lon, loc_radius
  FROM public.locations
  WHERE id = location_id_param;
  
  -- If location has no geofence configured, allow access
  IF loc_lat IS NULL OR loc_lon IS NULL THEN
    RETURN true;
  END IF;
  
  -- Calculate distance
  distance := calculate_distance_meters(loc_lat, loc_lon, user_lat, user_lon);
  
  -- Check if within radius
  RETURN distance <= loc_radius;
END;
$$;
