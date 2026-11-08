-- Replace the owner-privileged marketplace view with a caller-privileged view.
-- Grant only the columns exposed by the catalog view; prices, precise address/GPS,
-- bank details, and other product fields remain unavailable to anon/authenticated.
GRANT SELECT (id, code, title, category_id, category_name, seller_name, seller_type, source_type,
              volume, weight, unit, container_type, condition, grade, description,
              listing_status, status, evidences, created_at)
ON public.products TO anon, authenticated;

DROP POLICY IF EXISTS "Public read approved marketplace products" ON public.products;
CREATE POLICY "Public read approved marketplace products" ON public.products FOR SELECT TO anon, authenticated
USING (status = 'approved' AND LOWER(listing_status) = 'tersedia');

ALTER VIEW public.marketplace_products
  SET (security_barrier = true, security_invoker = true);
