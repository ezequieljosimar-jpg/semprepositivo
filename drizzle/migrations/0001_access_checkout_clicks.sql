CREATE TABLE public.devotional_checkout_clicks (
  event_id uuid PRIMARY KEY,
  clicked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  path text NOT NULL DEFAULT '/acesso' CHECK (path = '/acesso'),
  cta_position text NOT NULL CHECK (cta_position IN ('hero', 'bottom')),
  utm_source varchar(160),
  utm_medium varchar(160),
  utm_campaign varchar(160),
  utm_content varchar(160),
  utm_term varchar(160),
  referrer varchar(300)
);
GRANT ALL ON public.devotional_checkout_clicks TO service_role;
REVOKE ALL ON public.devotional_checkout_clicks FROM anon, authenticated;
ALTER TABLE public.devotional_checkout_clicks ENABLE ROW LEVEL SECURITY;
