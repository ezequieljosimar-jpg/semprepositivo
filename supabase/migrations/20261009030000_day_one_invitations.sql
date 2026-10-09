-- Sample access is separate from paid access. No existing buyer is changed.
begin;
alter table public.devotional_access add column if not exists sample_granted_at timestamptz;
create table if not exists public.devotional_sample_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null,
  enabled boolean not null default true,
  expires_at timestamptz,
  max_uses integer check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now()
);
alter table public.devotional_sample_invites enable row level security;
revoke all on public.devotional_sample_invites from public, anon, authenticated;
grant all on public.devotional_sample_invites to service_role;

create or replace function public.redeem_devotional_sample(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); invitation public.devotional_sample_invites; entitlement public.devotional_access;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then
    raise exception 'Confirmed email required' using errcode = '42501';
  end if;
  -- Serialize requests by user and by invitation; repeating a claim consumes no extra use.
  perform 1 from public.devotional_profiles where user_id=uid for update;
  select * into entitlement from public.devotional_access where user_id=uid for update;
  if entitlement.access_status = 'active' and (entitlement.expires_at is null or entitlement.expires_at > now()) then return 'paid'; end if;
  if entitlement.access_status is distinct from 'pending' then return 'unavailable'; end if;
  if entitlement.sample_granted_at is not null then return 'already_granted'; end if;
  if p_code is null or length(p_code) > 80 then return 'invalid'; end if;
  select * into invitation from public.devotional_sample_invites
    where code_hash=encode(sha256(convert_to(upper(btrim(p_code)), 'UTF8')), 'hex') for update;
  if not found or not invitation.enabled or (invitation.expires_at is not null and invitation.expires_at <= now())
    or (invitation.max_uses is not null and invitation.used_count >= invitation.max_uses) then return 'invalid'; end if;
  update public.devotional_access set sample_granted_at=now(),updated_at=now() where user_id=uid;
  update public.devotional_sample_invites set used_count=used_count+1 where id=invitation.id;
  return 'granted';
end; $$;
revoke all on function public.redeem_devotional_sample(text) from public, anon;
grant execute on function public.redeem_devotional_sample(text) to authenticated;

create or replace function public.assert_devotional_access() returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not exists(select 1 from public.devotional_access where user_id=uid and (
    (access_status='active' and (expires_at is null or expires_at > now()))
    or (access_status='pending' and sample_granted_at is not null))) then
    raise exception 'Product access required' using errcode = '42501';
  end if;
  return uid;
end; $$;
revoke all on function public.assert_devotional_access() from public, anon, authenticated;

create or replace function public.get_devotional_progress() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.assert_devotional_access(); total integer; available timestamptz; sample_only boolean; result jsonb;
begin
  select access_status='pending' and sample_granted_at is not null into sample_only from public.devotional_access where user_id=uid;
  select count(*) into total from public.devotional_day_completions where user_id=uid;
  if total > 0 and total < 90 then
    select completed_at+interval '12 hours' into available from public.devotional_day_completions where user_id=uid and day_number=total;
  end if;
  update public.devotional_profiles set last_activity_at=now() where user_id=uid;
  result := jsonb_build_object('completed',total,'currentDay',case when total=90 then null else total+1 end,
    'ownerId',uid,'nextAvailableAt',available);
  if sample_only then result := result || jsonb_build_object('maxReadableDay',1); end if;
  return result;
end; $$;
revoke all on function public.get_devotional_progress() from public, anon;
grant execute on function public.get_devotional_progress() to authenticated;

create or replace function public.complete_devotional_day(p_day integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); total integer; available timestamptz;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  perform 1 from public.devotional_profiles where user_id=uid for update;
  perform public.assert_devotional_access();
  if exists(select 1 from public.devotional_access where user_id=uid and access_status='pending' and sample_granted_at is not null)
    and p_day is distinct from 1 then raise exception 'Sample includes day one only' using errcode = '42501'; end if;
  select count(*) into total from public.devotional_day_completions where user_id=uid;
  if p_day is null or p_day < 1 or p_day > 90 or p_day > total+1 then
    raise exception 'Complete your current day first' using errcode = '42501'; end if;
  if p_day <= total then return public.get_devotional_progress(); end if;
  if total > 0 then
    select completed_at+interval '12 hours' into available from public.devotional_day_completions where user_id=uid and day_number=total;
    if available is null or clock_timestamp() < available then
      raise exception 'Wait 12 hours after completing your current day' using errcode = '42501'; end if;
  end if;
  insert into public.devotional_day_completions(user_id,day_number,completed_at)
    values(uid,p_day,clock_timestamp()) on conflict do nothing;
  return public.get_devotional_progress();
end; $$;
revoke all on function public.complete_devotional_day(integer) from public, anon;
grant execute on function public.complete_devotional_day(integer) to authenticated;
commit;
