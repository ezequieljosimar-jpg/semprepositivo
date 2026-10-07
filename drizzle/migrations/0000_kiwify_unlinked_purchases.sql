-- Purchases may arrive before the buyer has a confirmed account: keep them unlinked by email.
alter table public.devotional_payment_orders alter column user_id drop not null,
  add column if not exists buyer_email text;
alter table public.devotional_payment_events alter column user_id drop not null,
  add column if not exists buyer_email text;
create index if not exists devotional_payment_orders_email_idx
  on public.devotional_payment_orders(lower(buyer_email)) where user_id is null;

-- Recompute a user's access from all their linked orders (same rule as apply_devotional_payment_event).
create or replace function public.refresh_devotional_access(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare state text;
begin
  if exists(select 1 from public.devotional_payment_orders where user_id = p_user_id and access_status = 'active') then
    state := 'active';
  else
    select access_status into state from public.devotional_payment_orders
      where user_id = p_user_id order by occurred_at desc limit 1;
  end if;
  if state is null then return; end if;
  update public.devotional_access set access_status = state,
    access_started_at = case when state = 'active' then coalesce(access_started_at, now()) else access_started_at end,
    updated_at = now() where user_id = p_user_id;
end; $$;
revoke all on function public.refresh_devotional_access(uuid) from public, anon, authenticated;
grant execute on function public.refresh_devotional_access(uuid) to service_role;

-- Link unlinked purchases to a confirmed account with the same email.
create or replace function public.link_devotional_purchases(p_user_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare mail text; n integer;
begin
  select lower(email) into mail from auth.users where id = p_user_id and email_confirmed_at is not null;
  if mail is null then return 0; end if;
  perform 1 from public.devotional_profiles where user_id = p_user_id for update;
  if not found then return 0; end if;
  update public.devotional_payment_orders set user_id = p_user_id
    where user_id is null and lower(buyer_email) = mail;
  get diagnostics n = row_count;
  update public.devotional_payment_events set user_id = p_user_id
    where user_id is null and lower(buyer_email) = mail;
  if n > 0 then perform public.refresh_devotional_access(p_user_id); end if;
  return n;
end; $$;
revoke all on function public.link_devotional_purchases(uuid) from public, anon, authenticated;
grant execute on function public.link_devotional_purchases(uuid) to service_role;

-- Called by the signed-in user; links only their own confirmed email.
create or replace function public.claim_devotional_purchases() returns integer
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  return public.link_devotional_purchases(auth.uid());
end; $$;
revoke all on function public.claim_devotional_purchases() from public, anon;
grant execute on function public.claim_devotional_purchases() to authenticated;

-- Entry point for verified webhooks (service role only).
create or replace function public.record_devotional_purchase_event(
  p_provider text, p_event_id text, p_order_id text, p_email text, p_event_type text, p_occurred_at timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid; mail text := lower(btrim(p_email)); state text; n integer;
begin
  if mail is null or mail = '' then raise exception 'Buyer email required'; end if;
  select id into uid from auth.users where lower(email) = mail and email_confirmed_at is not null limit 1;
  if uid is not null and exists(select 1 from public.devotional_profiles where user_id = uid) then
    perform public.link_devotional_purchases(uid);
    update public.devotional_payment_orders set buyer_email = mail
      where payment_provider = p_provider and order_id = p_order_id and buyer_email is null;
    if public.apply_devotional_payment_event(p_provider, p_event_id, p_order_id, uid, p_event_type, p_occurred_at) then
      update public.devotional_payment_events set buyer_email = mail
        where payment_provider = p_provider and event_id = p_event_id;
      update public.devotional_payment_orders set buyer_email = mail
        where payment_provider = p_provider and order_id = p_order_id;
      return 'applied';
    end if;
    return 'duplicate';
  end if;
  state := case p_event_type when 'purchase.approved' then 'active'
    when 'purchase.refunded' then 'cancelled' when 'purchase.chargeback' then 'cancelled' else null end;
  if state is null then raise exception 'Unsupported payment event'; end if;
  insert into public.devotional_payment_events(payment_provider,event_id,order_id,user_id,buyer_email,event_type,occurred_at)
    values(p_provider,p_event_id,p_order_id,null,mail,p_event_type,p_occurred_at) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 'duplicate'; end if;
  insert into public.devotional_payment_orders(payment_provider,order_id,user_id,buyer_email,access_status,occurred_at,last_event_type)
    values(p_provider,p_order_id,null,mail,state,p_occurred_at,p_event_type)
  on conflict(payment_provider,order_id) do update set access_status = excluded.access_status,
    occurred_at = excluded.occurred_at, last_event_type = excluded.last_event_type
  where excluded.occurred_at > devotional_payment_orders.occurred_at
     or (excluded.occurred_at = devotional_payment_orders.occurred_at and excluded.access_status <> 'active');
  return 'stored_unlinked';
end; $$;
revoke all on function public.record_devotional_purchase_event(text,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.record_devotional_purchase_event(text,text,text,text,text,timestamptz) to service_role;