-- Remove the retired crypto wallet feature and its data from Supabase.
-- This intentionally drops the table without CASCADE so dependent objects
-- cause a visible error instead of being removed implicitly.
DROP TABLE IF EXISTS public.crypto_wallets;
