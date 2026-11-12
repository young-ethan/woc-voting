-- Run once in Supabase SQL Editor. The function replaces the list atomically.
-- The function is NOT callable by anonymous or authenticated browser users.
create or replace function public.replace_unixes(new_unixes text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.unixes;
  insert into public.unixes (unix)
  select distinct value from unnest(new_unixes) as value;
end;
$$;
revoke all on function public.replace_unixes(text[]) from public, anon, authenticated;
grant execute on function public.replace_unixes(text[]) to service_role;
