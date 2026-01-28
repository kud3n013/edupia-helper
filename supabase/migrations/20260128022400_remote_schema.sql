drop extension if exists "pg_net";


  create table "public"."classes" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "user_id" uuid,
    "fixed_class_id" text not null,
    "grade" integer,
    "level" text,
    "state" text default 'Đang dạy'::text,
    "num_students" integer default 0,
    "students" jsonb default '[]'::jsonb,
    "schedule" jsonb,
    "time" text,
    "num_finished_lessons" integer default 0,
    "finished_lessons" text[] default '{}'::text[]
      );


alter table "public"."classes" enable row level security;


  create table "public"."lessons" (
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "class_id" text,
    "grade" integer,
    "level" text,
    "lesson_content" text,
    "atmosphere_checked" boolean default true,
    "atmosphere_value" text,
    "progress_checked" boolean default true,
    "progress_value" text,
    "student_count" integer default 4,
    "school_level" text,
    "knowledge_mode" text,
    "attitude_mode" text,
    "included_criteria" jsonb default '["Từ vựng", "Ngữ pháp", "Phản xạ"]'::jsonb,
    "included_attitude_categories" jsonb,
    "students" jsonb,
    "session_number" integer default 1,
    "reminders" jsonb default '[]'::jsonb
      );


alter table "public"."lessons" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "updated_at" timestamp with time zone default now(),
    "email" text not null,
    "full_name" text not null,
    "gender" text,
    "avatar_url" text,
    "pay_rate" text default 'B+'::text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."records" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "class_id" text,
    "grade" integer,
    "level" text,
    "student_count" integer default 4,
    "rate" numeric default 0,
    "status" text default 'Hoàn thành'::text,
    "class_type" text default 'BU'::text,
    "feedback_status" text default 'Đã nhận xét'::text,
    "date" date default now(),
    "time_start" text,
    "pay_rate" text default 'D'::text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "lesson_content" text,
    "atmosphere_checked" boolean default true,
    "atmosphere_value" text,
    "progress_checked" boolean default true,
    "progress_value" text,
    "students" jsonb,
    "session_number" integer default 1,
    "reminders" text[],
    "absent" boolean default false
      );


alter table "public"."records" enable row level security;

CREATE UNIQUE INDEX classes_pkey ON public.classes USING btree (id);

CREATE INDEX classes_user_id_idx ON public.classes USING btree (user_id);

CREATE UNIQUE INDEX lessons_pkey ON public.lessons USING btree (user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX records_pkey ON public.records USING btree (id);

alter table "public"."classes" add constraint "classes_pkey" PRIMARY KEY using index "classes_pkey";

alter table "public"."lessons" add constraint "lessons_pkey" PRIMARY KEY using index "lessons_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."records" add constraint "records_pkey" PRIMARY KEY using index "records_pkey";

alter table "public"."classes" add constraint "classes_state_check" CHECK ((state = ANY (ARRAY['Đang dạy'::text, 'Kết thúc'::text]))) not valid;

alter table "public"."classes" validate constraint "classes_state_check";

alter table "public"."classes" add constraint "classes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."classes" validate constraint "classes_user_id_fkey";

alter table "public"."lessons" add constraint "lessons_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."lessons" validate constraint "lessons_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_gender_check" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_gender_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."records" add constraint "records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."records" validate constraint "records_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.auto_fill_time_start_for_cn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_fixed_class_id text;
  v_class_time text;
BEGIN
  -- Only process CN records
  IF NEW.class_type = 'CN' THEN
    -- Extract fixed_class_id from class_id (format: [fixed_class_id]-[number])
    -- E.g., 'R4.3C.01-05' -> 'R4.3C.01'
    v_fixed_class_id := regexp_replace(NEW.class_id, '-\d+$', '');
    
    -- Lookup time from classes table
    SELECT time INTO v_class_time
    FROM public.classes
    WHERE fixed_class_id = v_fixed_class_id
      AND user_id = NEW.user_id
    LIMIT 1;
    
    -- Set time_start if found
    IF v_class_time IS NOT NULL THEN
      NEW.time_start := v_class_time;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_set_type_cn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    extracted_fixed_id text;
    is_fixed_class boolean := false;
BEGIN
    -- Try to match the pattern [fixed_class]-[number] (one or more digits)
    -- Regex match for pattern: ^(.+)-\d+$
    extracted_fixed_id := substring(NEW.class_id FROM '^(.+)-\d+$');

    -- If the class_id matches the pattern [something]-[digits]
    IF extracted_fixed_id IS NOT NULL THEN
        -- Check if this extracted_fixed_id exists in the classes table for the same user
        SELECT EXISTS (
            SELECT 1 
            FROM public.classes c 
            WHERE c.fixed_class_id = extracted_fixed_id 
            AND c.user_id = NEW.user_id
        ) INTO is_fixed_class;
    END IF;

    -- Set type based on whether it is a fixed class sequence or not
    IF is_fixed_class THEN
        NEW.class_type := 'CN';
    ELSE
        NEW.class_type := 'BU';
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_record_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_grade_match text[];
  v_student_count int;
  v_base_rate numeric;
  v_multiplier numeric;
  v_pay_rate text;
BEGIN
  -- 1. Parse Class ID breakdown (Grade & Level)
  NEW.grade := substring(NEW.class_id from '\.(\d+)[a-dA-D]')::int;
  
  -- Extract Level (Letter A-D after grade)
  DECLARE
    v_level_char text;
  BEGIN
    v_level_char := upper(substring(NEW.class_id from '\.\d+([a-dA-D])'));
    CASE v_level_char
      WHEN 'A' THEN NEW.level := 'Giỏi';
      WHEN 'B' THEN NEW.level := 'Khá';
      WHEN 'C' THEN NEW.level := 'TB'; -- CHANGED from 'Trung bình'
      WHEN 'D' THEN NEW.level := 'Yếu';
      ELSE
         NULL; 
    END CASE;
  END;

  -- 2. Determine Student Count (Class Type)
  IF (upper(NEW.class_id) LIKE '%DU%') OR (upper(NEW.class_id) LIKE '%R1%') OR (upper(NEW.class_id) LIKE '%1P%') THEN
    v_student_count := 1;
  ELSE
    v_student_count := 4;
  END IF;
  NEW.student_count := v_student_count;

  -- 3. Calculate Rate
  v_pay_rate := COALESCE(NEW.pay_rate, 'D');
  
  IF v_student_count = 1 THEN
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 85000;
      WHEN 'A+' THEN v_base_rate := 80000;
      WHEN 'B+' THEN v_base_rate := 60000;
      WHEN 'C+' THEN v_base_rate := 50000;
      ELSE v_base_rate := 40000;
    END CASE;
  ELSIF v_student_count <= 4 THEN
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 100000;
      WHEN 'A+' THEN v_base_rate := 95000;
      WHEN 'B+' THEN v_base_rate := 75000;
      WHEN 'C+' THEN v_base_rate := 65000;
      ELSE v_base_rate := 55000;
    END CASE;
  ELSE -- > 4 (Group 6)
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 115000;
      WHEN 'A+' THEN v_base_rate := 110000;
      WHEN 'B+' THEN v_base_rate := 90000;
      WHEN 'C+' THEN v_base_rate := 90000;
      ELSE v_base_rate := 55000;
    END CASE;
  END IF;

  -- Multiplier
  CASE NEW.status
    WHEN 'Hoàn thành' THEN v_multiplier := 1;
    WHEN 'HS vắng mặt' THEN v_multiplier := 0.3;
    WHEN 'GS vắng mặt' THEN v_multiplier := -2;
    WHEN 'Hủy' THEN v_multiplier := 0;
    WHEN 'Chưa mở lớp' THEN v_multiplier := 0;
    WHEN 'Feedback trễ' THEN v_multiplier := 1;
    ELSE v_multiplier := 1;
  END CASE;

  NEW.rate := v_base_rate * v_multiplier;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_old_records_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Delete any existing records for the same class_id and user_id
  -- This ensures that we only have the latest feedback for a given class
  DELETE FROM public.records
  WHERE class_id = NEW.class_id
    AND user_id = NEW.user_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.finished(cls public.classes)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM public.records r
    WHERE r.user_id = cls.user_id
    -- Match class_id pattern: [fixed_class_id]-[2 digits]
    AND r.class_id ~ ('^' || regexp_replace(cls.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d{2}$')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_classes_for_calendar(token uuid)
 RETURNS TABLE(fixed_class_id text, schedule text[], class_time text, state text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_or_create_calendar_token()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_by_calendar_token(token uuid)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select user_id from public.user_settings where calendar_token = token;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.propagate_class_type_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update existing records that match the new/updated class pattern
    -- Pattern: class_id starts with "fixed_class_id" + "-" + digits
    UPDATE public.records
    SET class_type = 'CN'
    WHERE user_id = NEW.user_id
    AND class_id ~ ('^' || NEW.fixed_class_id || '-\d+$')
    AND class_type != 'CN'; -- Only update if not already CN (optimization)

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.regenerate_calendar_token()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  _new_token uuid;
begin
  update public.user_settings
  set calendar_token = gen_random_uuid()
  where user_id = auth.uid()
  returning calendar_token into _new_token;

  return _new_token;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_lesson_draft()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  delete from public.lessons
  where user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.update_class_finished_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    _user_id uuid;
    _class_id_str text;
BEGIN
    -- Handle DELETE (use OLD)
    IF (TG_OP = 'DELETE') THEN
        _user_id := OLD.user_id;
        _class_id_str := OLD.class_id;
        
        -- Update the class(es) that this record belonged to
        UPDATE public.classes c
        SET num_finished_lessons = (
            SELECT COUNT(*)::integer
            FROM public.records r
            WHERE r.user_id = c.user_id
            AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
        )
        WHERE c.user_id = _user_id
        AND _class_id_str LIKE (c.fixed_class_id || '-%');
    END IF;

    -- Handle INSERT (use NEW)
    IF (TG_OP = 'INSERT') THEN
        _user_id := NEW.user_id;
        _class_id_str := NEW.class_id;

        -- Update the class(es) that this record belongs to
        UPDATE public.classes c
        SET num_finished_lessons = (
            SELECT COUNT(*)::integer
            FROM public.records r
            WHERE r.user_id = c.user_id
            AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
        )
        WHERE c.user_id = _user_id
        AND _class_id_str LIKE (c.fixed_class_id || '-%');
    END IF;

    -- Handle UPDATE (OLD and NEW could be different)
    IF (TG_OP = 'UPDATE') THEN
        -- 1. Handle OLD (if class_id or user_id changed)
        IF (OLD.class_id <> NEW.class_id OR OLD.user_id <> NEW.user_id) THEN
             _user_id := OLD.user_id;
            _class_id_str := OLD.class_id;
            
            UPDATE public.classes c
            SET num_finished_lessons = (
                SELECT COUNT(*)::integer
                FROM public.records r
                WHERE r.user_id = c.user_id
                AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
            )
            WHERE c.user_id = _user_id
            AND _class_id_str LIKE (c.fixed_class_id || '-%');
        END IF;

        -- 2. Handle NEW
        _user_id := NEW.user_id;
        _class_id_str := NEW.class_id;

        UPDATE public.classes c
        SET num_finished_lessons = (
            SELECT COUNT(*)::integer
            FROM public.records r
            WHERE r.user_id = c.user_id
            AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
        )
        WHERE c.user_id = _user_id
        AND _class_id_str LIKE (c.fixed_class_id || '-%');
    END IF;

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_finished_lessons_on_record_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _class_id_str TEXT;
    _potential_fixed_id TEXT;
    _class_row_id UUID;
    _user_id UUID;
BEGIN
    -- Determine the operation and relevant record data
    IF (TG_OP = 'DELETE') THEN
        _class_id_str := OLD.class_id;
        _user_id := OLD.user_id;
    ELSE
        _class_id_str := NEW.class_id;
        _user_id := NEW.user_id;
    END IF;

    -- Extract Fixed Class ID (prefix). We split by the LAST hyphen.
    -- E.g., "R4.3C.01-10" -> "R4.3C.01"
    IF _class_id_str LIKE '%-%' THEN
        _potential_fixed_id := left(_class_id_str, length(_class_id_str) - position('-' in reverse(_class_id_str)));
    ELSE
        -- If no hyphen, we can't determine fixed_id from this logic, possibly return or ignore.
        -- Use the whole string as fallback or just return if it doesn't match pattern.
         RETURN NULL;
    END IF;

    -- Find ANY classes that match this fixed_class_id (could be multiple if user has dupes, but usually distinct)
    -- We assume one active class per fixed_id for the user.
    FOR _class_row_id IN 
        SELECT id FROM public.classes 
        WHERE fixed_class_id = _potential_fixed_id 
          AND user_id = _user_id
    LOOP
        -- Re-calculate finished lessons for this specific class
        -- We select 'lesson_name' (suffix) from records that:
        -- 1. Belong to this user
        -- 2. Have a class_id starting with 'fixed_id-'
        -- 3. Are marked 'Hoàn thành'
        WITH relevant_records AS (
            SELECT class_id
            FROM public.records
            WHERE user_id = _user_id
              AND class_id LIKE (_potential_fixed_id || '-%')
              AND status = 'Hoàn thành'
        ),
        lessons AS (
            SELECT right(class_id, position('-' in reverse(class_id)) - 1) as lesson_name
            FROM relevant_records
        )
        -- Update the specific class row
        UPDATE public.classes
        SET finished_lessons = ARRAY(SELECT lesson_name FROM lessons ORDER BY lesson_name)
        WHERE id = _class_row_id;
    END LOOP;

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_global_pay_rate(new_rate text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.profiles set pay_rate = new_rate where id = auth.uid();
  update public.records set pay_rate = new_rate where user_id = auth.uid();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_record_type_on_class_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Update existing records belonging to the same user
    -- matching the pattern [fixed_class_id]-[number]
    -- We use LIKE with '-%' to match the hyphen and suffix logic.
    UPDATE public.records
    SET class_type = 'CN'
    WHERE user_id = NEW.user_id 
      AND class_type = 'BU' -- Only update if it's currently 'BU' (default)
      AND class_id LIKE NEW.fixed_class_id || '-%';

    RETURN NEW;
END;
$function$
;

grant delete on table "public"."classes" to "anon";

grant insert on table "public"."classes" to "anon";

grant references on table "public"."classes" to "anon";

grant select on table "public"."classes" to "anon";

grant trigger on table "public"."classes" to "anon";

grant truncate on table "public"."classes" to "anon";

grant update on table "public"."classes" to "anon";

grant delete on table "public"."classes" to "authenticated";

grant insert on table "public"."classes" to "authenticated";

grant references on table "public"."classes" to "authenticated";

grant select on table "public"."classes" to "authenticated";

grant trigger on table "public"."classes" to "authenticated";

grant truncate on table "public"."classes" to "authenticated";

grant update on table "public"."classes" to "authenticated";

grant delete on table "public"."classes" to "service_role";

grant insert on table "public"."classes" to "service_role";

grant references on table "public"."classes" to "service_role";

grant select on table "public"."classes" to "service_role";

grant trigger on table "public"."classes" to "service_role";

grant truncate on table "public"."classes" to "service_role";

grant update on table "public"."classes" to "service_role";

grant delete on table "public"."lessons" to "anon";

grant insert on table "public"."lessons" to "anon";

grant references on table "public"."lessons" to "anon";

grant select on table "public"."lessons" to "anon";

grant trigger on table "public"."lessons" to "anon";

grant truncate on table "public"."lessons" to "anon";

grant update on table "public"."lessons" to "anon";

grant delete on table "public"."lessons" to "authenticated";

grant insert on table "public"."lessons" to "authenticated";

grant references on table "public"."lessons" to "authenticated";

grant select on table "public"."lessons" to "authenticated";

grant trigger on table "public"."lessons" to "authenticated";

grant truncate on table "public"."lessons" to "authenticated";

grant update on table "public"."lessons" to "authenticated";

grant delete on table "public"."lessons" to "service_role";

grant insert on table "public"."lessons" to "service_role";

grant references on table "public"."lessons" to "service_role";

grant select on table "public"."lessons" to "service_role";

grant trigger on table "public"."lessons" to "service_role";

grant truncate on table "public"."lessons" to "service_role";

grant update on table "public"."lessons" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."records" to "anon";

grant insert on table "public"."records" to "anon";

grant references on table "public"."records" to "anon";

grant select on table "public"."records" to "anon";

grant trigger on table "public"."records" to "anon";

grant truncate on table "public"."records" to "anon";

grant update on table "public"."records" to "anon";

grant delete on table "public"."records" to "authenticated";

grant insert on table "public"."records" to "authenticated";

grant references on table "public"."records" to "authenticated";

grant select on table "public"."records" to "authenticated";

grant trigger on table "public"."records" to "authenticated";

grant truncate on table "public"."records" to "authenticated";

grant update on table "public"."records" to "authenticated";

grant delete on table "public"."records" to "service_role";

grant insert on table "public"."records" to "service_role";

grant references on table "public"."records" to "service_role";

grant select on table "public"."records" to "service_role";

grant trigger on table "public"."records" to "service_role";

grant truncate on table "public"."records" to "service_role";

grant update on table "public"."records" to "service_role";


  create policy "Users can manage their own classes"
  on "public"."classes"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can manage their own session logs"
  on "public"."lessons"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Enable all access for all users"
  on "public"."profiles"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Users can delete their own records"
  on "public"."records"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own records"
  on "public"."records"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own records"
  on "public"."records"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own records"
  on "public"."records"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER propagate_class_type_trigger AFTER INSERT OR UPDATE OF fixed_class_id ON public.classes FOR EACH ROW EXECUTE FUNCTION public.propagate_class_type_change();

CREATE TRIGGER trigger_update_record_type_on_class_insert AFTER INSERT ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_record_type_on_class_insert();

CREATE TRIGGER before_record_changes BEFORE INSERT OR UPDATE ON public.records FOR EACH ROW EXECUTE FUNCTION public.calculate_record_fields();

CREATE TRIGGER on_record_change_update_class_lessons AFTER INSERT OR DELETE OR UPDATE ON public.records FOR EACH ROW EXECUTE FUNCTION public.update_finished_lessons_on_record_change();

CREATE TRIGGER set_record_type_trigger BEFORE INSERT OR UPDATE ON public.records FOR EACH ROW EXECUTE FUNCTION public.auto_set_type_cn();

CREATE TRIGGER trigger_auto_fill_time_start_for_cn BEFORE INSERT OR UPDATE ON public.records FOR EACH ROW EXECUTE FUNCTION public.auto_fill_time_start_for_cn();

CREATE TRIGGER trigger_delete_old_records BEFORE INSERT ON public.records FOR EACH ROW EXECUTE FUNCTION public.delete_old_records_before_insert();

CREATE TRIGGER trigger_update_finished_lesson AFTER INSERT OR DELETE OR UPDATE ON public.records FOR EACH ROW EXECUTE FUNCTION public.update_class_finished_count();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


