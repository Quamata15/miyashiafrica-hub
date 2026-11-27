-- Proximity: who and what is near the person (25 km by default).
-- Listings only carry a city name today, so a table of city centres gives every listing a
-- position; a shop or provider can also save an exact GPS point, which then wins.
CREATE TABLE IF NOT EXISTS public.geo_cities (
  id serial PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  key text GENERATED ALWAYS AS (lower(public.f_unaccent(name))) STORED
);
ALTER TABLE public.geo_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cities are public" ON public.geo_cities;
CREATE POLICY "Cities are public" ON public.geo_cities FOR SELECT TO anon, authenticated USING (true);
CREATE UNIQUE INDEX IF NOT EXISTS geo_cities_key_country ON public.geo_cities (key, country);

INSERT INTO public.geo_cities (name, country, lat, lng) VALUES
 ('Lomé','TG',6.1319,1.2228),('Kara','TG',9.5511,1.1861),('Kpalimé','TG',6.9000,0.6333),('Sokodé','TG',8.9833,1.1333),
 ('Atakpamé','TG',7.5333,1.1333),('Dapaong','TG',10.8623,0.2076),('Tsévié','TG',6.4261,1.2133),('Aného','TG',6.2280,1.5919),
 ('Bassar','TG',9.2500,0.7833),('Mango','TG',10.3592,0.4708),('Notsé','TG',6.9500,1.1667),('Badou','TG',7.5833,0.6000),
 ('Cotonou','BJ',6.3703,2.3912),('Porto-Novo','BJ',6.4969,2.6289),('Abomey-Calavi','BJ',6.4485,2.3557),('Parakou','BJ',9.3372,2.6303),
 ('Bohicon','BJ',7.1782,2.0667),('Abomey','BJ',7.1829,1.9912),('Ouidah','BJ',6.3631,2.0851),('Natitingou','BJ',10.3042,1.3796),
 ('Djougou','BJ',9.7085,1.6660),('Lokossa','BJ',6.6387,1.7167),('Kandi','BJ',11.1342,2.9386),
 ('Abidjan','CI',5.3600,-4.0083),('Bouaké','CI',7.6906,-5.0300),('Yamoussoukro','CI',6.8276,-5.2893),('San-Pédro','CI',4.7485,-6.6363),
 ('Korhogo','CI',9.4580,-5.6296),('Daloa','CI',6.8774,-6.4502),('Man','CI',7.4125,-7.5539),('Gagnoa','CI',6.1319,-5.9506),
 ('Grand-Bassam','CI',5.2118,-3.7388),
 ('Dakar','SN',14.7167,-17.4677),('Thiès','SN',14.7910,-16.9359),('Touba','SN',14.8500,-15.8833),('Saint-Louis','SN',16.0326,-16.4818),
 ('Kaolack','SN',14.1652,-16.0726),('Ziguinchor','SN',12.5833,-16.2719),('Mbour','SN',14.4167,-16.9667),('Rufisque','SN',14.7158,-17.2733),
 ('Accra','GH',5.6037,-0.1870),('Kumasi','GH',6.6885,-1.6244),('Tamale','GH',9.4008,-0.8393),('Takoradi','GH',4.8845,-1.7554),
 ('Cape Coast','GH',5.1053,-1.2466),('Tema','GH',5.6698,-0.0166),('Ho','GH',6.6008,0.4713),('Aflao','GH',6.1167,1.1833),
 ('Lagos','NG',6.5244,3.3792),('Abuja','NG',9.0765,7.3986),('Kano','NG',12.0022,8.5920),('Ibadan','NG',7.3775,3.9470),
 ('Port Harcourt','NG',4.8156,7.0498),('Benin City','NG',6.3350,5.6037),('Kaduna','NG',10.5105,7.4165),('Enugu','NG',6.5244,7.5170),
 ('Ouagadougou','BF',12.3714,-1.5197),('Bobo-Dioulasso','BF',11.1771,-4.2979),('Koudougou','BF',12.2526,-2.3627),('Banfora','BF',10.6333,-4.7667),
 ('Bamako','ML',12.6392,-8.0029),('Sikasso','ML',11.3176,-5.6665),('Ségou','ML',13.4317,-6.2157),('Mopti','ML',14.4843,-4.1830),
 ('Kayes','ML',14.4469,-11.4445),('Niamey','NE',13.5116,2.1254),('Zinder','NE',13.8053,8.9881),('Maradi','NE',13.5000,7.1017),
 ('Conakry','GN',9.6412,-13.5784),('Kankan','GN',10.3854,-9.3057),('Freetown','SL',8.4657,-13.2317),('Monrovia','LR',6.3156,-10.8074),
 ('Banjul','GM',13.4549,-16.5790),('Bissau','GW',11.8817,-15.6178),('Nouakchott','MR',18.0735,-15.9582),
 ('Douala','CM',4.0511,9.7679),('Yaoundé','CM',3.8480,11.5021),('Bafoussam','CM',5.4778,10.4176),('Garoua','CM',9.3017,13.3921),
 ('Libreville','GA',0.4162,9.4673),('Port-Gentil','GA',-0.7193,8.7815),('Brazzaville','CG',-4.2634,15.2429),('Pointe-Noire','CG',-4.7692,11.8664),
 ('Kinshasa','CD',-4.4419,15.2663),('Lubumbashi','CD',-11.6609,27.4794),('N''Djamena','TD',12.1348,15.0557),('Bangui','CF',4.3947,18.5582),
 ('Malabo','GQ',3.7504,8.7371),('Paris','FR',48.8566,2.3522)
ON CONFLICT (key, country) DO NOTHING;

-- Exact points saved by shops and providers ("use my position").
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.provider_profiles ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lng double precision;

-- Great-circle distance in km.
CREATE OR REPLACE FUNCTION public.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN lat1 IS NULL OR lat2 IS NULL OR lng1 IS NULL OR lng2 IS NULL THEN NULL ELSE
    6371 * 2 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))) END
$$;

-- "Lomé, Togo", "lome", "Bè, Lomé" -> the city centre. Tries each comma-separated part.
CREATE OR REPLACE FUNCTION public.city_point(p_text text, OUT lat double precision, OUT lng double precision)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE part text;
BEGIN
  IF p_text IS NULL OR btrim(p_text) = '' THEN RETURN; END IF;
  FOREACH part IN ARRAY string_to_array(p_text, ',') LOOP
    SELECT c.lat, c.lng INTO lat, lng FROM geo_cities c WHERE c.key = lower(public.f_unaccent(btrim(part))) LIMIT 1;
    IF lat IS NOT NULL THEN RETURN; END IF;
  END LOOP;
  -- A district name before the city ("Tokoin Lomé"): look for a known city inside the text.
  SELECT c.lat, c.lng INTO lat, lng FROM geo_cities c
  WHERE position(' ' || c.key || ' ' IN ' ' || regexp_replace(lower(public.f_unaccent(p_text)), '[^a-z0-9''-]+', ' ', 'g') || ' ') > 0
  ORDER BY length(c.key) DESC LIMIT 1;
END $$;

-- Products near a point, nearest first. Position: shop GPS, else product city, else shop city.
CREATE OR REPLACE FUNCTION public.products_near(p_lat double precision, p_lng double precision, p_radius_km double precision DEFAULT 25, p_limit int DEFAULT 200)
RETURNS TABLE (product_id uuid, distance_km double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, d FROM (
    SELECT p.id, public.km_between(p_lat, p_lng,
      COALESCE(s.lat, (public.city_point(p.location)).lat, (public.city_point(s.city)).lat),
      COALESCE(s.lng, (public.city_point(p.location)).lng, (public.city_point(s.city)).lng)) AS d
    FROM products p LEFT JOIN shops s ON s.owner_id = p.seller_id
    WHERE p.is_active AND p.deleted_at IS NULL
  ) x WHERE d IS NOT NULL AND d <= LEAST(GREATEST(p_radius_km, 1), 20000) ORDER BY d LIMIT LEAST(GREATEST(p_limit, 1), 500)
$$;

-- Providers (and their services) near a point. Position: provider GPS, else provider city, else profile location.
CREATE OR REPLACE FUNCTION public.services_near(p_lat double precision, p_lng double precision, p_radius_km double precision DEFAULT 25, p_limit int DEFAULT 200)
RETURNS TABLE (service_id uuid, provider_id uuid, distance_km double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, provider_id, d FROM (
    SELECT sv.id, sv.provider_id, public.km_between(p_lat, p_lng,
      COALESCE(pp.lat, (public.city_point(pp.city)).lat, (public.city_point(pr.location)).lat, (public.city_point(array_to_string(pp.service_areas, ','))).lat),
      COALESCE(pp.lng, (public.city_point(pp.city)).lng, (public.city_point(pr.location)).lng, (public.city_point(array_to_string(pp.service_areas, ','))).lng)) AS d
    FROM services sv
    LEFT JOIN provider_profiles pp ON pp.user_id = sv.provider_id
    LEFT JOIN profiles pr ON pr.user_id = sv.provider_id
    WHERE sv.is_active
  ) x WHERE d IS NOT NULL AND d <= LEAST(GREATEST(p_radius_km, 1), 20000) ORDER BY d LIMIT LEAST(GREATEST(p_limit, 1), 500)
$$;

-- Where is the signed-in person? Saved GPS, else their profile city.
CREATE OR REPLACE FUNCTION public.my_position(OUT lat double precision, OUT lng double precision, OUT city text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE pr profiles;
BEGIN
  SELECT * INTO pr FROM profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN; END IF;
  city := pr.location;
  IF pr.lat IS NOT NULL THEN lat := pr.lat; lng := pr.lng; RETURN; END IF;
  SELECT c.lat, c.lng INTO lat, lng FROM public.city_point(pr.location) c;
END $$;

-- Saves the person's GPS point (used for "near me"); only their own row.
CREATE OR REPLACE FUNCTION public.save_my_position(p_lat double precision, p_lng double precision)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Position invalide'; END IF;
  UPDATE profiles SET lat = round(p_lat::numeric, 4), lng = round(p_lng::numeric, 4) WHERE user_id = auth.uid();
END $$;

-- Rough road distance for a delivery: GPS of the shop or seller city -> buyer address. 5 km inside one city.
CREATE OR REPLACE FUNCTION public.estimate_delivery_km(p_order_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders; s shops; a addresses; la1 double precision; ln1 double precision; la2 double precision; ln2 double precision; d double precision;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN 5; END IF;
  SELECT * INTO s FROM shops WHERE owner_id = o.seller_id;
  la1 := s.lat; ln1 := s.lng;
  IF la1 IS NULL THEN SELECT c.lat, c.lng INTO la1, ln1 FROM public.city_point(COALESCE(s.city, (SELECT location FROM products WHERE id = o.product_id))) c; END IF;
  IF o.address_id IS NOT NULL THEN SELECT * INTO a FROM addresses WHERE id = o.address_id; END IF;
  la2 := a.lat; ln2 := a.lng;
  IF la2 IS NULL THEN SELECT c.lat, c.lng INTO la2, ln2 FROM public.city_point(COALESCE(a.city, o.shipping_address)) c; END IF;
  d := public.km_between(la1, ln1, la2, ln2);
  IF d IS NULL THEN RETURN 5; END IF;
  RETURN GREATEST(3, round((d * 1.3)::numeric, 1));  -- roads are longer than the straight line
END $$;

GRANT EXECUTE ON FUNCTION public.products_near(double precision, double precision, double precision, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.services_near(double precision, double precision, double precision, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.city_point(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_position() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_position() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.save_my_position(double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_position(double precision, double precision) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.estimate_delivery_km(uuid) FROM PUBLIC, anon, authenticated;
