
-- Fix search_path for calculate_distance_meters function
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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
