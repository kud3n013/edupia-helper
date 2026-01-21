-- Add pay_rate to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pay_rate text DEFAULT 'B+';

-- Remote Procedure to update pay rate globally for a user
create or replace function update_global_pay_rate(new_rate text)
returns void
language plpgsql
security definer
as $$
begin
  -- 1. Update Profile
  update public.profiles
  set pay_rate = new_rate
  where id = auth.uid();

  -- 2. Update All Records
  -- This will trigger the 'before_record_changes' trigger on each row
  -- to recalculate the 'rate' (money) based on the new 'pay_rate' (level)
  update public.records
  set pay_rate = new_rate
  where user_id = auth.uid();
end;
$$;
