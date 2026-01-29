
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Call the backend function to generate lessons
        const { error } = await supabase.rpc('generate_upcoming_lessons');

        if (error) {
            console.error("Error generating lessons:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Upcoming lessons generation triggered successfully."
        });

    } catch (err) {
        console.error("Automation error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
