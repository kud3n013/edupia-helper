-- Create a user_settings table to store the calendar token
create table if not exists public.user_settings (
    user_id uuid references auth.users not null primary key,
    calendar_token uuid default gen_random_uuid() not null,
    constraint user_settings_calendar_token_key unique (calendar_token)
);

-- RLS Policies
alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
on public.user_settings for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update their own settings"
on public.user_settings for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own settings"
on public.user_settings for insert
to authenticated
with check (auth.uid() = user_id);

-- Function to ensure token exists
create or replace function public.get_or_create_calendar_token()
returns uuid
language plpgsql
security definer
as $$
declare
  _token uuid;
  _user_id uuid;
begin
  _user_id := auth.uid();
  if _user_id is null then
    raise exception 'Not authenticated';
  end if;

  select calendar_token into _token from public.user_settings where user_id = _user_id;

  if _token is null then
    insert into public.user_settings (user_id) values (_user_id)
    returning calendar_token into _token;
  end if;

  return _token;
end;
$$;

-- Function to regenerate token
create or replace function public.regenerate_calendar_token()
returns uuid
language plpgsql
security definer
as $$
declare
  _new_token uuid;
begin
  update public.user_settings
  set calendar_token = gen_random_uuid()
  where user_id = auth.uid()
  returning calendar_token into _new_token;

  return _new_token;
end;
$$;

-- Function to resolve token to user_id (for public calendar feed)
create or replace function public.get_user_by_calendar_token(token uuid)
returns uuid
language sql
security definer
as $$
  select user_id from public.user_settings where calendar_token = token;
$$;

-- Grant execute permission to anon so the API can call it without session
grant execute on function public.get_user_by_calendar_token(uuid) to anon;
grant execute on function public.get_user_by_calendar_token(uuid) to authenticated;

-- Function to get classes for calendar (securely via token)
create or replace function public.get_classes_for_calendar(token uuid)
returns table (
  fixed_class_id text,
  schedule text[],
  class_time text,
  state text
)
language plpgsql
security definer
as $$
declare
  _user_id uuid;
begin
  -- 1. Identify user
  select user_id into _user_id from public.user_settings where calendar_token = token;
  
  if _user_id is null then
     return; -- Return empty if token invalid
  end if;
  
  -- 2. Return classes
  return query 
  select c.fixed_class_id, c.schedule, c.time as class_time, c.state
  from public.classes c
  where c.user_id = _user_id 
    and c.state = 'Đang dạy';
end;
$$;

grant execute on function public.get_classes_for_calendar(uuid) to anon;
grant execute on function public.get_classes_for_calendar(uuid) to authenticated;
