-- Apply only after configuring Supabase Auth. No buyers or purchases are seeded.
begin;

create table public.devotional_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz
);
create table public.devotional_access (
  user_id uuid primary key references public.devotional_profiles(user_id) on delete cascade,
  access_status text not null default 'pending' check (access_status in ('pending','active','expired','cancelled')),
  access_started_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.devotional_day_completions (
  user_id uuid not null references public.devotional_profiles(user_id) on delete cascade,
  day_number integer not null check (day_number between 1 and 90),
  completed_at timestamptz not null default now(),
  primary key (user_id, day_number)
);
create table public.devotional_payment_orders (
  payment_provider text not null,
  order_id text not null,
  user_id uuid not null references public.devotional_profiles(user_id) on delete cascade,
  access_status text not null check (access_status in ('pending','active','expired','cancelled')),
  occurred_at timestamptz not null,
  last_event_type text not null,
  primary key (payment_provider, order_id)
);
create index devotional_payment_orders_user_idx on public.devotional_payment_orders(user_id);
create table public.devotional_payment_events (
  payment_provider text not null,
  event_id text not null,
  order_id text not null,
  user_id uuid not null references public.devotional_profiles(user_id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null,
  processed_at timestamptz not null default now(),
  primary key (payment_provider, event_id)
);

alter table public.devotional_profiles enable row level security;
alter table public.devotional_access enable row level security;
alter table public.devotional_day_completions enable row level security;
alter table public.devotional_payment_orders enable row level security;
alter table public.devotional_payment_events enable row level security;
revoke all on public.devotional_profiles, public.devotional_access, public.devotional_day_completions,
  public.devotional_payment_orders, public.devotional_payment_events from anon, authenticated;
grant select on public.devotional_profiles, public.devotional_access, public.devotional_day_completions to authenticated;
grant update(name) on public.devotional_profiles to authenticated;
grant all on public.devotional_profiles, public.devotional_access, public.devotional_day_completions,
  public.devotional_payment_orders, public.devotional_payment_events to service_role;
create policy profile_owner_read on public.devotional_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profile_owner_name on public.devotional_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy access_owner_read on public.devotional_access for select to authenticated using (user_id = (select auth.uid()));
create policy completion_owner_read on public.devotional_day_completions for select to authenticated using (user_id = (select auth.uid()));

create function public.initialize_devotional_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.devotional_profiles(user_id, name, email, created_at)
  values(new.id, new.raw_user_meta_data->>'full_name', new.email, new.created_at)
  on conflict(user_id) do update set email = excluded.email;
  insert into public.devotional_access(user_id) values(new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.initialize_devotional_profile() from public, anon, authenticated;
create trigger initialize_devotional_profile after insert or update of email on auth.users
for each row execute function public.initialize_devotional_profile();
-- Backfill only real accounts already present in Auth; grants remain pending.
insert into public.devotional_profiles(user_id, name, email, created_at)
select id, raw_user_meta_data->>'full_name', email, created_at from auth.users on conflict do nothing;
insert into public.devotional_access(user_id) select user_id from public.devotional_profiles on conflict do nothing;

create function public.assert_devotional_access() returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not exists(select 1 from public.devotional_access where user_id = uid and access_status = 'active' and (expires_at is null or expires_at > now()))
    then raise exception 'Product access required' using errcode = '42501'; end if;
  return uid;
end;
$$;
revoke all on function public.assert_devotional_access() from public, anon, authenticated;

create function public.get_devotional_progress() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.assert_devotional_access(); total integer;
begin
  select count(*) into total from public.devotional_day_completions where user_id = uid;
  update public.devotional_profiles set last_activity_at = now() where user_id = uid;
  return jsonb_build_object('completed', total, 'currentDay', case when total = 90 then null else total + 1 end, 'ownerId', uid);
end;
$$;
revoke all on function public.get_devotional_progress() from public, anon;
grant execute on function public.get_devotional_progress() to authenticated;

create function public.complete_devotional_day(p_day integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); total integer;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  -- Serialize completions and entitlement changes for this account.
  perform 1 from public.devotional_profiles where user_id = uid for update;
  perform public.assert_devotional_access();
  select count(*) into total from public.devotional_day_completions where user_id = uid;
  if p_day is null or p_day < 1 or p_day > 90 or p_day > total + 1 then
    raise exception 'Complete your current day first' using errcode = '42501';
  end if;
  insert into public.devotional_day_completions(user_id, day_number) values(uid, p_day) on conflict do nothing;
  return public.get_devotional_progress();
end;
$$;
revoke all on function public.complete_devotional_day(integer) from public, anon;
grant execute on function public.complete_devotional_day(integer) to authenticated;

-- Internal contract only: no HTTP webhook endpoint is exposed by this migration.
-- The future provider adapter must authenticate the event and resolve a verified
-- buyer account before the service-role caller invokes this function.
create function public.apply_devotional_payment_event(
  p_provider text, p_event_id text, p_order_id text, p_user_id uuid,
  p_event_type text, p_occurred_at timestamptz
) returns boolean language plpgsql security definer set search_path = '' as $$
declare state text; latest public.devotional_payment_orders; updated integer;
begin
  if p_provider is null or btrim(p_provider) = '' or p_event_id is null or btrim(p_event_id) = ''
     or p_order_id is null or btrim(p_order_id) = '' or p_user_id is null or p_occurred_at is null then
    raise exception 'Incomplete verified payment event';
  end if;
  state := case p_event_type when 'purchase.approved' then 'active' when 'payment.approved' then 'active'
    when 'purchase.cancelled' then 'cancelled' when 'purchase.refunded' then 'cancelled'
    when 'purchase.chargeback' then 'cancelled' when 'subscription.cancelled' then 'cancelled'
    when 'access.expired' then 'expired' else null end;
  if state is null then raise exception 'Unsupported payment event'; end if;
  perform 1 from public.devotional_profiles where user_id = p_user_id for update;
  if not found then raise exception 'Resolved buyer account required'; end if;
  if exists(select 1 from public.devotional_payment_orders where payment_provider = p_provider and order_id = p_order_id and user_id <> p_user_id)
    then raise exception 'Order already belongs to another account'; end if;
  insert into public.devotional_payment_events(payment_provider,event_id,order_id,user_id,event_type,occurred_at)
    values(p_provider,p_event_id,p_order_id,p_user_id,p_event_type,p_occurred_at) on conflict do nothing;
  get diagnostics updated = row_count;
  if updated = 0 then return false; end if;
  insert into public.devotional_payment_orders(payment_provider,order_id,user_id,access_status,occurred_at,last_event_type)
    values(p_provider,p_order_id,p_user_id,state,p_occurred_at,p_event_type)
  on conflict(payment_provider,order_id) do update set access_status = excluded.access_status,
    occurred_at = excluded.occurred_at, last_event_type = excluded.last_event_type
  where excluded.occurred_at > devotional_payment_orders.occurred_at
     or (excluded.occurred_at = devotional_payment_orders.occurred_at and excluded.access_status <> 'active');
  if exists(select 1 from public.devotional_payment_orders where payment_provider = p_provider and order_id = p_order_id and user_id <> p_user_id)
    then raise exception 'Order already belongs to another account'; end if;
  if exists(select 1 from public.devotional_payment_orders where user_id = p_user_id and access_status = 'active') then
    state := 'active';
  else
    select * into latest from public.devotional_payment_orders where user_id = p_user_id order by occurred_at desc limit 1;
    state := latest.access_status;
  end if;
  update public.devotional_access set access_status = state,
    access_started_at = case when state = 'active' then coalesce(access_started_at,now()) else access_started_at end,
    updated_at = now() where user_id = p_user_id;
  return true;
end;
$$;
revoke all on function public.apply_devotional_payment_event(text,text,text,uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.apply_devotional_payment_event(text,text,text,uuid,text,timestamptz) to service_role;
commit;
