-- Run this script in your Supabase SQL Editor to fix the missing email and gender issue.

-- This function replaces the existing handle_new_user function.
-- It adds the 'email' and 'gender' fields to the INSERT statement for the public.profiles table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, gender)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    new.raw_user_meta_data->>'gender'
  );
  return new;
end;
$$;
