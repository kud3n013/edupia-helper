
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { parseClassInfo } from "@/utils/class-utils";

export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    try {
        // --- CLEANUP: Remove invalid pending records (no lesson number suffix) ---
        // This is a temporary fix for previous bad generation.
        const { data: pendingCleanup } = await supabase
            .from("records")
            .select("id, class_id")
            .eq("user_id", user.id)
            .eq("status", "Chưa mở lớp");

        if (pendingCleanup && pendingCleanup.length > 0) {
            const idsToDelete = pendingCleanup
                // Aggressive cleanup: Delete ALL pending records to ensure correct dates and formats are regenerated
                .map(r => r.id);

            if (idsToDelete.length > 0) {
                await supabase.from("records").delete().in("id", idsToDelete);
                console.log(`Cleaned up ${idsToDelete.length} invalid records.`);
            }
        }
        // -----------------------------------------------------------------------

        // 1. Fetch active classes
        const { data: classes } = await supabase
            .from("classes")
            .select("*")
            .eq("user_id", user.id)
            .eq("state", "Đang dạy");

        if (!classes || classes.length === 0) {
            return NextResponse.json({ message: "No active classes found" });
        }

        // 2. Fetch existing records for checking dates AND calculating next numbers
        // We fetch ALL records for these classes to determine the sequence? 
        // No, fetching all might be too much if many records.
        // Ideally we rely on `classes.finished_lessons` (which is array of strings like "67", "68")
        // BUT we also need to account for 'Chưa mở lớp' records that are created but not yet finished (and thus not in `classes.finished_lessons`)
        // So we fetch records for these classes created recently or just with status 'Chưa mở lớp'.

        // Let's fetch all records for these classes that have a hyphen (indicating session)
        // Actually, simply fetching "Chưa mở lớp" records is enough to add to the "already taken numbers".

        // Also fetch records for next 8 days to avoid trying to create duplicate DATES.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 8);

        // Fetch existing records for date-check
        const { data: existingRecordsDateCheck } = await supabase
            .from("records")
            .select("class_id, date, fixed_class_id") // fixed_class_id not on records table? 
            // Records table schema doesn't seem to have fixed_class_id explicitly based on previous file reads, only class_id.
            // We have to substring match or rely on class_id.
            // But we can filter by user_id and date range.
            .eq("user_id", user.id)
            .gte("date", today.toISOString().split("T")[0])
            .lte("date", nextWeek.toISOString().split("T")[0]);

        // Fetch pending records to count towards lesson numbers
        const { data: pendingRecords } = await supabase
            .from("records")
            .select("class_id")
            .eq("user_id", user.id)
            .eq("status", "Chưa mở lớp");

        // Helper map: FixedClassID -> Set of Dates already covered
        const coveredDates = new Map<string, Set<string>>();
        // Helper map: FixedClassID -> Set of "Used Numbers"
        const usedNumbers = new Map<string, Set<number>>();

        // Populate from existing records (Date constraint)
        existingRecordsDateCheck?.forEach(r => {
            // Try to extract fixed ID.
            // Assuming format: "FixedID-Num" or just "FixedID" (if my previous bad code ran)
            let fixed = r.class_id;
            if (r.class_id.includes("-")) {
                // Heuristic: Last part is number?
                const parts = r.class_id.split("-");
                const last = parts[parts.length - 1];
                if (!isNaN(Number(last))) {
                    fixed = parts.slice(0, -1).join("-");
                }
            }

            if (!coveredDates.has(fixed)) coveredDates.set(fixed, new Set());
            coveredDates.get(fixed)?.add(r.date);
        });

        // Populate used numbers from Class finished_lessons AND Pending records
        classes.forEach(c => {
            const nums = new Set<number>();
            if (c.finished_lessons && Array.isArray(c.finished_lessons)) {
                c.finished_lessons.forEach((l: string) => {
                    const n = parseInt(l);
                    if (!isNaN(n)) nums.add(n);
                });
            }
            usedNumbers.set(c.fixed_class_id, nums);
        });

        // Add pending records numbers to usedNumbers
        pendingRecords?.forEach(r => {
            if (r.class_id.includes("-")) {
                const parts = r.class_id.split("-");
                const fixed = parts.slice(0, -1).join("-");
                const num = parseInt(parts[parts.length - 1]);

                if (usedNumbers.has(fixed) && !isNaN(num)) {
                    usedNumbers.get(fixed)?.add(num);
                } else if (!isNaN(num)) {
                    // Optimization: Only care if it matches a class we are processing, 
                    // but we can just skip if not in map (means not an active class or mis-parsed)
                    // actually we should try to add it if we can find the key
                    // but iterations below are driven by `classes`, so if key matches `c.fixed_class_id` good.
                    // Let's do a quick scan since we have `classes` list.
                    const cls = classes.find((c: any) => c.fixed_class_id === fixed);
                    if (cls) {
                        if (!usedNumbers.has(fixed)) usedNumbers.set(fixed, new Set());
                        usedNumbers.get(fixed)?.add(num);
                    }
                }
            }
        });


        // 3. Generate missing records
        const newRecords = [];
        const dayMap: { [key: string]: number } = {
            "CN": 0, "T2": 1, "T3": 2, "T4": 3, "T5": 4, "T6": 5, "T7": 6
        };

        // Fetch profile for PayRate
        const { data: profile } = await supabase.from('profiles').select('pay_rate').eq('id', user.id).single();
        const payRate = profile?.pay_rate || "B+";

        for (const cls of classes) {
            if (!cls.schedule || !Array.isArray(cls.schedule)) continue;

            // Determine current max number
            let currentMax = 0;
            const setNums = usedNumbers.get(cls.fixed_class_id);
            if (setNums && setNums.size > 0) {
                currentMax = Math.max(...Array.from(setNums));
            }

            // Check next 8 days
            for (let i = 0; i < 8; i++) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + i);
                const dayOfWeek = targetDate.getDay();

                // Find matching schedule day string
                // Note: schedule is array of strings "T2", "T3"...
                // We find if ANY schedule matches this dayOfWeek
                const isScheduled = cls.schedule.some((dayCode: string) => dayMap[dayCode] === dayOfWeek);

                if (isScheduled) {
                    // Construct local date string YYYY-MM-DD
                    const yyyy = targetDate.getFullYear();
                    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(targetDate.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}-${mm}-${dd}`;

                    if (!coveredDates.get(cls.fixed_class_id)?.has(dateStr)) {
                        // Need to create record!

                        // Increment number locally
                        currentMax++;
                        const newClassId = `${cls.fixed_class_id}-${currentMax}`;

                        let level = cls.level;
                        let grade = cls.grade;
                        if (!grade || !level) {
                            const parsed = parseClassInfo(cls.fixed_class_id);
                            if (!grade) grade = parsed.grade || 0;
                            if (!level) level = parsed.level || "Không xác định";
                        }
                        const classType = "CN";

                        // Prepare students array (as JSON) from class data
                        // We need to map string[] to Student[] format expected by DB jsonb if we want full prefill?
                        // Or does `students` column in records store full objects? yes, likely.
                        // Wait, `classes` table has `students` as string[] (names).
                        // `records` table `students` is jsonb (Student[] objects).
                        // We should convert here.
                        const studentObjects = (cls.students || []).map((name: string, idx: number) => ({
                            id: idx,
                            name: name,
                            scores: { // Default scores
                                "Từ vựng": 8, "Ngữ pháp": 8, "Ngữ âm": 8, "Đọc hiểu": 8, "Nghe hiểu": 8, "Phản xạ": 8, "Phát âm": 8
                            },
                            attitudes: [],
                            isAbsent: false
                        }));

                        newRecords.push({
                            user_id: user.id,
                            class_id: newClassId,
                            grade: grade,
                            level: level,
                            student_count: cls.num_students || 4,
                            rate: 0,
                            status: "Chưa mở lớp",
                            class_type: classType,
                            feedback_status: "Chưa nhận xét",
                            date: dateStr,
                            time_start: cls.time || "19:00",
                            pay_rate: payRate,
                            students: studentObjects // Prefill students!
                        });

                        // Mark coverage for this loop to prevent double booking if schedule has duplicates? (unlikely)
                        if (!coveredDates.has(cls.fixed_class_id)) coveredDates.set(cls.fixed_class_id, new Set());
                        coveredDates.get(cls.fixed_class_id)?.add(dateStr);
                    }
                }
            }
        }

        if (newRecords.length > 0) {
            const { error } = await supabase.from("records").insert(newRecords);
            if (error) {
                console.error("Error inserting records:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            generated: newRecords.length
        });

    } catch (err) {
        console.error("Automation error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
