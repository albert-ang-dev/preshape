-- PreShape: user profiles with an account plan.
-- Run once in the Supabase dashboard: SQL Editor → paste → Run.
--
-- Every new account automatically gets a profile with plan = 'free'.
-- Users can read their own profile but can't change it, so nobody can
-- make themselves Premium. Only your server (secret key) can change the plan,
-- e.g. from the Stripe webhook later.

-- 1. The table
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  plan       text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now()
);

-- 2. Security: logged-in users may only read their own profile
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

-- 3. Create the profile automatically whenever someone registers.
--    The plan is NOT taken from what the user sent, so it always starts as 'free'.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
