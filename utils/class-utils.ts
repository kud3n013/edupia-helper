
export interface ClassInfo {
    grade: number | null;
    level: string | null;
    isGroupClass: boolean; // true = 1 on 4 (or 6), false = 1 on 1
    maxStudents: number;
}

export const parseClassInfo = (classId: string): ClassInfo => {
    let grade: number | null = null;
    let level: string | null = null;
    let isGroupClass = true; // Default to group if unsure? Or user default.
    // User logic:
    // 1 on 4: "RMK.TA.4P", "R4", "R.TA.4P", "4P"
    // 1 on 1: "DU", "R1", "1P"

    const upperId = classId.toUpperCase();

    // 1. Determine Type
    if (upperId.includes("DU") || upperId.includes("R1") || upperId.includes("1P")) {
        isGroupClass = false;
    } else if (upperId.includes("4P") || upperId.includes("R4") || upperId.includes("RMK")) {
        // "RMK.TA.4P" covers "RMK" and "4P". "R4" covers "R4".
        isGroupClass = true;
    } else {
        // Fallback or default?
        // Let's assume default is Group (1 on 4) as per existing behavior, 
        // OR keep existing logic which defaults to 4 students.
        isGroupClass = true;
    }

    const maxStudents = isGroupClass ? 4 : 1;

    // 2. Parse Grade and Level (Existing Logic + Improvements)
    // Pattern: .[number][letter] e.g. .3A or .5C
    // Refined regex: Only match if the letter is a valid level (A, B, C, D)
    const match = classId.match(/\.(\d+)([a-dA-D])/i);
    if (match && match[1]) {
        const g = parseInt(match[1], 10);
        if (!isNaN(g)) {
            grade = g;
        }
        if (match[2]) {
            const l = match[2].toUpperCase();
            const levelMap: Record<string, string> = {
                'A': 'Giỏi',
                'B': 'Khá',
                'C': 'Trung bình',
                'D': 'Yếu'
            };
            level = levelMap[l] || null;
        }
    }

    return { grade, level, isGroupClass, maxStudents };
};
