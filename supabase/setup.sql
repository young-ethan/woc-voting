-- Run this once in the Supabase SQL Editor before deploying the function.
-- Your existing public.unixes table is left untouched.
create table if not exists public.unix_attempt_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.unix_attempt_limits enable row level security;
-- No anon/authenticated policies. Only the server-side service role can access this table.
create or replace function public.allow_unix_attempt(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  insert into public.unix_attempt_limits as t (ip_hash, window_start, attempts)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set window_start = case when t.window_start < now() - interval '15 minutes' then now() else t.window_start end,
        attempts = case when t.window_start < now() - interval '15 minutes' then 1 else t.attempts + 1 end
  returning attempts into n;
  return n <= 10;
end;
$$;
revoke all on function public.allow_unix_attempt(text) from public, anon, authenticated;
grant execute on function public.allow_unix_attempt(text) to service_role;
