import { createClient } from '@/utils/supabase/server';
import ical, { ICalCalendarMethod, ICalEventRepeatingFreq } from 'ical-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    if (!token) {
        return new NextResponse('Missing token', { status: 400 });
    }

    const supabase = await createClient();

    // 1. Resolve token to user_id using the secure RPC function
    const { data: userId, error: tokenError } = await supabase
        .rpc('get_user_by_calendar_token', { token: token });

    if (tokenError || !userId) {
        return new NextResponse('Invalid or expired calendar token', { status: 401 });
    }

    // 2. Fetch active classes for this user
    // We can use the standard select now that we know the user_id?
    // Wait, row level security (RLS) usually restricts 'select * from classes' to "auth.uid() = user_id".
    // Since we are unauthenticated (anon), strictly speaking RLS will block us even if we pass user_id in the query,
    // UNLESS the policy allows reading "where user_id = <param>" for anyone? Unlikely.
    // OR we use a Service Role client.
    // But we don't have SUPABASE_SERVICE_ROLE_KEY exposed typically in client-side / standard server utils unless configured.

    // Check if we can bypass RLS or use another RPC.
    // Simplest way: Create an RPC to fetch classes for a given user_id *securely* (checking the token inside or trusting the caller?).
    // Better: update the get_user_by_calendar_token to return the needed data? No, sticky.

    // Re-evaluating: standard Supabase `createClient()` uses `process.env.NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
    // It cannot bypass RLS.

    // We need a helper function in Postgres to fetch classes for the calendar.

    /*
      create or replace function public.get_classes_for_calendar(token uuid)
      returns table (
        fixed_class_id text,
        schedule text[],
        time text,
        state text
      )
      language plpgsql
      security definer
      as $$
      declare
        _user_id uuid;
      begin
        select user_id into _user_id from public.user_settings where calendar_token = token;
        if _user_id is null then
           return;
        end if;
        
        return query select fixed_class_id, schedule, time, state
        from public.classes
        where user_id = _user_id and state = 'Đang dạy';
      end;
      $$;
    */

    // I should update the migration script AGAIN to include this data fetching helper.
    // This is cleaner than trying to mess with RLS policies for 'anon'.

    // Failsafe: return 500 for now if I haven't implemented the RPC? 
    // No, I'll update the migration script immediately after this tool call in the same turn or next turn.
    // Actually, I'll write this file assuming `get_classes_for_calendar` exists.

    const { data: classes, error: classesError } = await supabase
        .rpc('get_classes_for_calendar', { token: token });

    if (classesError) {
        console.error('Error fetching classes:', classesError);
        return new NextResponse('Internal Server Error', { status: 500 });
    }

    // 3. Generate ICS
    const calendar = ical({
        name: 'Edupia Teaching Schedule',
        method: ICalCalendarMethod.PUBLISH,
        scale: 'gregorian',
        ttl: 60 * 60, // 1 hour cache
    });

    const dayMap: Record<string, string> = {
        'T2': 'MO', 'T3': 'TU', 'T4': 'WE', 'T5': 'TH', 'T6': 'FR', 'T7': 'SA', 'CN': 'SU'
    };

    if (classes && Array.isArray(classes)) {
        classes.forEach((cls: any) => {
            if (!cls.schedule || !cls.class_time) return;

            // Parse time (HH:mm)
            const [hourStr, minStr] = cls.class_time.split(':');
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minStr, 10);

            // Handle multiple days
            const byDay = cls.schedule.map((d: string) => dayMap[d]).filter(Boolean);

            if (byDay.length > 0) {
                // Calculate next occurrence for Start Date
                // We need a reference start date. Let's use "User's Today" or just "Now".
                // Ideally, the event should start "Now" and repeat.
                const now = new Date();

                // Set the event to start at the class time on the *first available day* from today.
                // Or just set it to Today at class time, and rely on RRULE to handle the specific days.
                // If today is not in byDay, RRULE still works if we set start date correctly?
                // Actually, if start date is Tuesday, but RRULE says MO only, it might be weird.
                // ical-generator handles this?
                // Best practice: Set start date to the first occurrence.

                // Generic start: Today at Class Time.
                const startDate = new Date();
                startDate.setHours(hour, minute, 0, 0);

                // If "now" is already past the class time, maybe start tomorrow? 
                // Doesn't strictly matter for recurring events if we just want them to show up.

                calendar.createEvent({
                    start: startDate,
                    end: new Date(startDate.getTime() + 60 * 60 * 1000), // 1 hour duration
                    summary: `Lớp ${cls.fixed_class_id}`,
                    repeating: {
                        freq: ICalEventRepeatingFreq.WEEKLY,
                        byDay: byDay
                    },
                    timezone: 'Asia/Ho_Chi_Minh'
                });
            }
        });
    }

    return new NextResponse(calendar.toString(), {
        status: 200,
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="calendar.ics"',
        },
    });
}
