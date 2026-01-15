-- Create records table
create table if not exists public.records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  class_id text,
  grade int,
  level text,
  student_count int default 4,
  rate numeric default 0,
  status text default 'Hoàn thành', -- 'Hoàn thành', 'HS vắng mặt', 'GS vắng mặt', 'Hủy', 'Chưa mở lớp'
  class_type text default 'BU', -- 'CN', 'BU'
  feedback_status text default 'Đã nhận xét', -- 'Đã nhận xét', 'Chưa nhận xét'
  date date default now(),
  time_start text,
  pay_rate text default 'D', -- 'S+', 'A+', 'B+', 'C+', 'D'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.records enable row level security;

-- Policies
create policy "Users can view their own records"
  on public.records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own records"
  on public.records for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own records"
  on public.records for update
  using (auth.uid() = user_id);

create policy "Users can delete their own records"
  on public.records for delete
  using (auth.uid() = user_id);
