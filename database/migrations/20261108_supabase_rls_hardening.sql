-- =======================================================
-- SECURITY: only public marketplace catalog is readable by browser anon key.
-- All writes and sensitive records remain on the authenticated PHP API.
-- =======================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('users','categories','products','orders','offers','events','system_settings')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',p.policyname,p.schemaname,p.tablename); END LOOP;
END $$;

REVOKE ALL ON public.users, public.categories, public.products, public.orders, public.offers, public.events, public.system_settings FROM anon, authenticated;
GRANT SELECT ON public.categories, public.events TO anon, authenticated;

CREATE POLICY "Public read active categories" ON public.categories FOR SELECT TO anon, authenticated USING (active = true);
CREATE OR REPLACE VIEW public.marketplace_products WITH (security_barrier=true) AS
SELECT id, code, title, category_id, category_name, seller_name, seller_type, source_type,
       volume, weight, unit, container_type, condition, grade, description,
       listing_status, status, evidences, created_at
FROM public.products
WHERE status = 'approved' AND LOWER(listing_status) = 'tersedia';
GRANT SELECT ON public.marketplace_products TO anon, authenticated;
CREATE POLICY "Public read upcoming events" ON public.events FOR SELECT TO anon, authenticated USING (status = 'upcoming');

-- No client-facing policies or grants exist for users, orders, offers, or system settings.
-- Service role access is reserved for trusted server environments only.
