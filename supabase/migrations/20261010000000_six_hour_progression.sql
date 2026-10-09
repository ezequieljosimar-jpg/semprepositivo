-- Shorten the wait using existing completion timestamps; preserve sample and purchase gates.
begin;
create or replace function public.get_devotional_progress() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.assert_devotional_access(); total integer; available timestamptz; sample_only boolean; result jsonb;
begin
  select access_status='pending' and sample_granted_at is not null into sample_only from public.devotional_access where user_id=uid;
  select count(*) into total from public.devotional_day_completions where user_id=uid;
  if total > 0 and total < 90 then
    select completed_at+interval '6 hours' into available from public.devotional_day_completions where user_id=uid and day_number=total;
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
    select completed_at+interval '6 hours' into available from public.devotional_day_completions where user_id=uid and day_number=total;
    if available is null or clock_timestamp() < available then
      raise exception 'Wait 6 hours after completing your current day' using errcode = '42501'; end if;
  end if;
  insert into public.devotional_day_completions(user_id,day_number,completed_at)
    values(uid,p_day,clock_timestamp()) on conflict do nothing;
  return public.get_devotional_progress();
end; $$;
revoke all on function public.complete_devotional_day(integer) from public, anon;
grant execute on function public.complete_devotional_day(integer) to authenticated;
commit;
