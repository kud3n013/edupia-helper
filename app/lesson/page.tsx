"use client";

import { useState, useRef, useEffect } from "react";

import { copyToClipboard, cn } from "@/lib/utils";
import { parseClassInfo } from "@/utils/class-utils";
import { Slider } from "@/components/ui/Slider";
import { Reorder, AnimatePresence, motion } from "framer-motion";
import { useLenis } from "@/components/SmoothScrolling";

// --- Constants ---
const MAX_STUDENTS = 6;

const CRITERIA_LIST = [
    "Từ vựng",
    "Ngữ pháp",
    "Ngữ âm",
    "Đọc hiểu",
    "Nghe hiểu",
    "Phản xạ",
    "Phát âm",
];

const ATTITUDE_DATA: Record<string, string[]> = {
    "Năng lượng / Tinh thần": [
        "tích cực",
        "sôi nổi",
        "vui vẻ",
        "hứng thú",
        "tự tin",
        "lạc quan",
        "mệt mỏi",
        "chán nản",
        "trầm tính",
        "tự ti",
        "xấu hổ",
        "ngại nói",
    ],
    "Khả năng tập trung": [
        "tập trung nghe giảng",
        "chú ý bài học",
        "tích cực phát biểu",
        "sao nhãng",
        "làm việc riêng",
        "không tập trung",
        "lơ là",
    ],
    "Thái độ với bạn học": [
        "hòa đồng",
        "biết chia sẻ",
        "giúp đỡ bạn bè",
        "nóng nảy",
        "chưa hòa đồng",
    ],
    "Thái độ với giáo viên": [
        "biết nghe lời",
        "lễ phép",
        "ngoan ngoãn",
        "chưa vâng lời",
        "phải nhắc nhở nhiều",
    ],
    "Giờ giấc": [
        "Vào lớp sớm",
        "Vào trễ ít phút",
        "Vào lớp trễ",
        "Xin phép nghỉ sớm",
        "Rời lớp sớm không phép",
    ],
};

const ATTITUDE_CATEGORIES = Object.keys(ATTITUDE_DATA);

// --- Types ---
interface Student {
    id: number;
    name: string;
    scores: Record<string, number>;
    attitudes: string[];
}

export default function LessonPage() {
    // --- Hooks ---
    const lenis = useLenis();

    // --- State: General & Lesson Info ---
    const [classId, setClassId] = useState("");
    const [grade, setGrade] = useState<number | null>(null);
    const [level, setLevel] = useState<string | null>(null);
    const [lessonContent, setLessonContent] = useState("");
    const lessonContentRef = useRef<HTMLTextAreaElement>(null);
    const [atmosphereChecked, setAtmosphereChecked] = useState(true);
    const [atmosphereValue, setAtmosphereValue] = useState("Sôi nổi");
    const [progressChecked, setProgressChecked] = useState(true);
    const [progressValue, setProgressValue] = useState("Bình thường");



    // --- State: Students ---
    const [studentCount, setStudentCount] = useState(4);
    const [schoolLevel, setSchoolLevel] = useState<"TH" | "THCS">("TH");
    const [knowledgeMode, setKnowledgeMode] = useState<"bulk" | "individual">("individual");
    const [attitudeMode, setAttitudeMode] = useState<"bulk" | "individual">("individual");
    const [includedCriteria, setIncludedCriteria] = useState<string[]>([
        "Từ vựng",
        "Ngữ pháp",
        "Phản xạ",
    ]);
    const [includedAttitudeCategories, setIncludedAttitudeCategories] = useState<string[]>(
        ATTITUDE_CATEGORIES
    );

    const [students, setStudents] = useState<Student[]>(() => {
        return Array.from({ length: MAX_STUDENTS }, (_, i) => ({
            id: i,
            name: "",
            scores: CRITERIA_LIST.reduce((acc, c) => ({ ...acc, [c]: 8 }), {}),
            attitudes: [],
        }));
    });

    const [isDesktop, setIsDesktop] = useState(false);
    const [gender, setGender] = useState<string>("");

    // --- State: Reminders ---
    const [sessionNumber, setSessionNumber] = useState(1);
    const [reminders, setReminders] = useState<string[]>([]);

    // --- State: Output ---
    const [classReport, setClassReport] = useState("");
    const [studentPrompts, setStudentPrompts] = useState("");
    const [showOutput, setShowOutput] = useState(false);
    const [classReportCopyText, setClassReportCopyText] = useState("Copy Report");
    const [promptsCopyText, setPromptsCopyText] = useState("Copy Prompts");

    // --- Drag Refs ---
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const studentSectionRef = useRef<HTMLDivElement>(null);

    // --- Effects ---
    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 768);
        };

        const fetchUserGender = async () => {
            try {
                const { createClient } = await import("@/utils/supabase/client");
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.user_metadata?.gender) {
                    setGender(user.user_metadata.gender);
                }
            } catch (error) {
                console.error("Error fetching gender:", error);
            }
        };

        checkDesktop();
        fetchUserGender();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    // Adjust textarea height on content change
    useEffect(() => {
        if (lessonContentRef.current) {
            lessonContentRef.current.style.height = "auto";
            lessonContentRef.current.style.height = lessonContentRef.current.scrollHeight + "px";
        }
    }, [lessonContent]);

    // Parse Grade, Level, and Type from Class ID
    useEffect(() => {
        const { grade, level, isGroupClass, maxStudents } = parseClassInfo(classId);

        setGrade(grade);
        setLevel(level);

        if (grade) {
            if (grade >= 1 && grade <= 5) setSchoolLevel("TH");
            else if (grade >= 6 && grade <= 9) setSchoolLevel("THCS");
        }

        // Set student count default based on type
        // Only if not already set manually? Or force it?
        // User requested: "determine the max fixed number of students"
        // Let's set the count to match the type default (1 or 4) if it changes?
        // Or maybe just clamp it?
        // Simple approach: Set it to maxStudents.
        setStudentCount(maxStudents);

    }, [classId]);

    // --- Persistence Logic ---
    const [isLoading, setIsLoading] = useState(true);

    // 1. Fetch data on mount
    useEffect(() => {
        const loadLessonData = async () => {
            try {
                const { createClient } = await import("@/utils/supabase/client");
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) return;

                const { data, error } = await supabase
                    .from("lessons")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
                    console.error("Error loading lesson data:", error);
                    return;
                }


                if (data) {
                    setClassId(data.class_id || "");
                    setGrade(data.grade || null);
                    setLevel(data.level || null);
                    setLessonContent(data.lesson_content || "");
                    setAtmosphereChecked(data.atmosphere_checked ?? true);
                    setAtmosphereValue(data.atmosphere_value || "Sôi nổi");
                    setProgressChecked(data.progress_checked ?? true);
                    setProgressValue(data.progress_value || "Bình thường");
                    setStudentCount(data.student_count || 4);
                    setSchoolLevel(data.school_level || "TH");
                    setKnowledgeMode(data.knowledge_mode || "individual");
                    setAttitudeMode(data.attitude_mode || "individual");
                    setIncludedCriteria(data.included_criteria || ["Từ vựng", "Ngữ pháp", "Phản xạ"]);
                    setIncludedAttitudeCategories(data.included_attitude_categories || ATTITUDE_CATEGORIES);
                    if (data.students) setStudents(data.students);
                    setSessionNumber(data.session_number || 1);
                    setReminders(data.reminders || []);
                }
            } catch (err) {
                console.error("Unexpected error loading data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadLessonData();
    }, []);

    // 2. Save data on change (Autosave with debounce)
    useEffect(() => {
        if (isLoading) return; // Don't save while loading or if not loaded yet

        const saveData = async () => {
            try {
                const { createClient } = await import("@/utils/supabase/client");
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) return;

                const payload = {
                    user_id: user.id,
                    class_id: classId,
                    grade: grade,
                    level: level,
                    lesson_content: lessonContent,
                    atmosphere_checked: atmosphereChecked,
                    atmosphere_value: atmosphereValue,
                    progress_checked: progressChecked,
                    progress_value: progressValue,
                    student_count: studentCount,
                    school_level: schoolLevel,
                    knowledge_mode: knowledgeMode,
                    attitude_mode: attitudeMode,
                    included_criteria: includedCriteria,
                    included_attitude_categories: includedAttitudeCategories,
                    students: students,
                    session_number: sessionNumber,
                    reminders: reminders,
                    updated_at: new Date().toISOString(),
                };

                const { error } = await supabase
                    .from("lessons")
                    .upsert(payload);

                if (error) {
                    console.error("Error saving lesson data:", error);
                }
            } catch (err) {
                console.error("Unexpected error saving data:", err);
            }
        };

        const timeoutId = setTimeout(saveData, 1000); // Debounce 1s
        return () => clearTimeout(timeoutId);
    }, [
        isLoading,
        classId,
        grade,
        level,
        lessonContent,
        atmosphereChecked,
        atmosphereValue,
        progressChecked,
        progressValue,
        studentCount,
        schoolLevel,
        knowledgeMode,
        attitudeMode,
        includedCriteria,
        includedAttitudeCategories,
        students,
        sessionNumber,
        reminders
    ]);



    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (studentSectionRef.current && studentSectionRef.current.contains(e.target as Node)) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    setStudentCount(prev => Math.min(MAX_STUDENTS, prev + 1));
                } else {
                    setStudentCount(prev => Math.max(1, prev - 1));
                }
            }
        };

        const currentRef = studentSectionRef.current;
        if (currentRef) {
            currentRef.addEventListener("wheel", handleWheel, { passive: false });
        }

        return () => {
            if (currentRef) {
                currentRef.removeEventListener("wheel", handleWheel);
            }
        };
    }, []);

    // --- Helpers ---
    const getCurrentWeek = () => {
        // Reference: Week 32 starts on Monday, Jan 5, 2026
        // Using local time constructor to avoid timezone issues
        const baseDate = new Date(2026, 0, 5);
        const now = new Date();
        const diffTime = now.getTime() - baseDate.getTime();
        // Calculate full weeks passed since reference Monday
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        return 32 + diffWeeks;
    };
    const currentWeek = getCurrentWeek();

    // --- Handlers ---
    const handleReminderChange = (value: string) => {
        setReminders((prev) =>
            prev.includes(value)
                ? prev.filter((item) => item !== value)
                : [...prev, value]
        );
    };

    const handleScoreChange = (criteria: string, val: number, studentIndex?: number) => {
        const newStudents = [...students];
        if (knowledgeMode === "bulk") {
            newStudents.forEach((s) => (s.scores[criteria] = val));
        } else if (studentIndex !== undefined) {
            newStudents[studentIndex].scores[criteria] = val;
        }
        setStudents(newStudents);
    };

    const handleAttitudeChange = (tag: string, checked: boolean, studentIndex?: number) => {
        const newStudents = [...students];

        if (attitudeMode === "bulk") {
            newStudents.forEach((s) => {
                if (checked) {
                    if (!s.attitudes.includes(tag)) s.attitudes.push(tag);
                } else {
                    s.attitudes = s.attitudes.filter(t => t !== tag);
                }
            });
        } else if (studentIndex !== undefined) {
            const s = newStudents[studentIndex];
            if (checked) {
                if (!s.attitudes.includes(tag)) s.attitudes.push(tag);
            } else {
                s.attitudes = s.attitudes.filter(t => t !== tag);
            }
        }
        setStudents(newStudents);
    };

    const isValidPositive = (tag: string) => {
        return [
            'tích cực', 'sôi nổi', 'vui vẻ', 'hứng thú', 'tự tin', 'lạc quan',
            'tập trung nghe giảng', 'chú ý bài học', 'tích cực phát biểu',
            'hòa đồng', 'biết chia sẻ', 'giúp đỡ bạn bè',
            'biết nghe lời', 'lễ phép', 'ngoan ngoãn',
            'Vào lớp sớm'
        ].includes(tag);
    };

    const isValidNegative = (tag: string) => {
        return [
            'mệt mỏi', 'chán nản', 'trầm tính', 'tự ti', 'xấu hổ', 'ngại nói',
            'sao nhãng', 'làm việc riêng', 'không tập trung', 'lơ là',
            'nóng nảy', 'chưa hòa đồng', 'chưa vâng lời', 'phải nhắc nhở nhiều',
            'Vào trễ ít phút', 'Vào lớp trễ', 'Rời lớp sớm không phép'
        ].includes(tag);
    };

    const handleReset = () => {
        if (!confirm("Bạn có chắc chắn muốn đặt lại toàn bộ dữ liệu về mặc định?")) return;

        // Scroll to top
        lenis?.scrollTo(0, { immediate: false });

        setClassId("");
        setLessonContent("");
        setAtmosphereChecked(true);
        setAtmosphereValue("Sôi nổi");
        setProgressChecked(true);
        setProgressValue("Bình thường");
        setStudentCount(4);
        setSchoolLevel("TH");
        setKnowledgeMode("individual");
        setAttitudeMode("individual");
        setIncludedCriteria(["Từ vựng", "Ngữ pháp", "Phản xạ"]);
        setIncludedAttitudeCategories(ATTITUDE_CATEGORIES);
        setStudents(Array.from({ length: MAX_STUDENTS }, (_, i) => ({
            id: i,
            name: "",
            scores: CRITERIA_LIST.reduce((acc, c) => ({ ...acc, [c]: 8 }), {}),
            attitudes: [],
        })));
        setSessionNumber(1);
        setReminders([]);
        setClassReport("");
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element && lenis) {
            lenis.scrollTo(element, { offset: -100 });
        }
    };


    // --- Generate Feedback Logic ---
    const generateFeedback = async () => {
        if (!classId.trim()) {
            alert("Vui lòng nhập mã lớp học!");
            return;
        }

        if (!lessonContent.trim()) {
            alert("Vui lòng nhập nội dung bài học!");
            return;
        }

        // 1. Generate Class Report
        let reportSentences = [];
        const atmosphereMap: Record<string, string> = {
            "Sôi nổi": "sôi nổi, các con hào hứng phát biểu xây dựng bài",
            "Trầm lặng": "hơi trầm, các con cần tương tác nhiều hơn",
        };
        const progressMap: Record<string, string> = {
            "Bình thường": "tốt đẹp, các con đều hiểu bài",
            "Trễ": "kết thúc muộn hơn dự kiến một chút",
            "Sớm": "kết thúc sớm hơn dự kiến",
        };

        if (atmosphereChecked) {
            const text = atmosphereMap[atmosphereValue] || atmosphereValue;
            reportSentences.push(`Không khí lớp học ${text}`);
        }
        if (progressChecked) {
            const text = progressMap[progressValue] || progressValue;
            reportSentences.push(`Buổi học diễn ra ${text}`);
        }


        // Attendance from "Giờ giấc" tags
        const lateStudents: string[] = [];
        const slightLateStudents: string[] = [];
        const earlyLeavePermitted: string[] = [];
        const earlyLeaveUnpermitted: string[] = [];

        students.slice(0, studentCount).forEach(s => {
            if (s.attitudes.includes("Vào lớp trễ")) lateStudents.push(s.name);
            if (s.attitudes.includes("Vào trễ ít phút")) slightLateStudents.push(s.name);
            if (s.attitudes.includes("Xin phép nghỉ sớm")) earlyLeavePermitted.push(s.name);
            if (s.attitudes.includes("Rời lớp sớm không phép")) earlyLeaveUnpermitted.push(s.name);
        });

        if (lateStudents.length > 0) reportSentences.push(`Bạn ${lateStudents.join(", ")} vào muộn`);
        if (slightLateStudents.length > 0) reportSentences.push(`Bạn ${slightLateStudents.join(", ")} vào trễ một chút`);
        if (earlyLeavePermitted.length > 0) reportSentences.push(`Bạn ${earlyLeavePermitted.join(", ")} xin phép nghỉ sớm`);
        if (earlyLeaveUnpermitted.length > 0) reportSentences.push(`Bạn ${earlyLeaveUnpermitted.join(", ")} thoát lớp trước mà không xin phép`);

        let part1Text = "";
        if (reportSentences.length > 0) {
            part1Text = "1. " + reportSentences.join(". ") + ".";
        }

        const mandatoryHomework = `BTVN Buổi ${sessionNumber} Tuần ${currentWeek}`;
        const currentMonth = new Date().getMonth() + 1;
        const processedReminders = reminders.map(r => {
            if (r === "Bài thi tháng") return `Bài thi tháng ${currentMonth}`;
            if (r === "Bài tập nói") return `Bài tập nói tháng ${currentMonth}`;
            return r;
        });
        const allReminders = [...processedReminders, mandatoryHomework];
        let part2Text = `2. PH nhớ nhắc các em hoàn thành ${allReminders.join(", ")}.`;

        const classReport = [part1Text, part2Text].filter(t => t).join("\n\n");

        // 2. Generate Student Prompts
        const prompts: string[] = [];
        const studentPronoun = schoolLevel === 'THCS' ? "em" : "con";
        let teacherPronoun = "Thầy/Cô";
        if (gender === 'male') teacherPronoun = "Thầy";
        if (gender === 'female') teacherPronoun = "Cô";

        const pronounInstruction = `Dùng đại từ '${studentPronoun}' để gọi học sinh và xưng hô là '${teacherPronoun}'.`;

        for (let i = 0; i < studentCount; i++) {
            const student = students[i];
            const name = student.name.trim() || `Học sinh ${i + 1}`;

            let criteriaText = "";
            if (includedCriteria.length > 0) {
                criteriaText = includedCriteria.map(c => `- ${c}: ${student.scores[c]}/10`).join('\n');
            } else {
                criteriaText = "- (Không có nhận xét về kiến thức)";
            }

            const attitudeText = student.attitudes.length > 0 ? student.attitudes.map(a => `- ${a}`).join('\n') : '- (Không ghi nhận đặc biệt)';

            const prompt = `### Feedback cho học sinh: ${name}

Hãy đóng vai trò là một ${teacherPronoun} giáo tiếng Anh. Dựa trên thông tin dưới đây, hãy viết một đoạn nhận xét ngắn gọn (khoảng 25-50 chữ) bằng tiếng Việt dành cho phụ huynh. Sử dụng ngôn ngữ trực tiếp, thẳng thắn, không dùng lời khen sáo rỗng hay chỉ trích gay gắt.
${pronounInstruction}


Thông tin:
- Lớp: ${classId}
- Tên: ${name}
- Bài học: ${lessonContent}

Kết quả (Thang 10):
${criteriaText}

Thái độ:
${attitudeText}

Yêu cầu output (Trực tiếp, thẳng thắn, không khen sáo rỗng, không chỉ trích gay gắt, TUYỆT ĐỐI KHÔNG nhắc đến điểm số):
1. **Tiếp thu kiến thức**:
\`\`\`plaintext
[Nội dung nhận xét kiến thức cho ${name}]
\`\`\`

2. **Thái độ học tập**:
\`\`\`plaintext
[Nội dung nhận xét thái độ cho ${name}]
\`\`\`
`.trim();
            prompts.push(prompt);
        }

        const studentReports = prompts.join('\n\n' + '='.repeat(40) + '\n\n');

        // Combine Everything
        // Update State
        setClassReport(classReport);
        setStudentPrompts(studentReports);
        setShowOutput(true);

        setTimeout(() => {
            document.getElementById("output-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);

        // --- Save to Records ---
        try {
            const { createClient } = await import("@/utils/supabase/client");
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get latest pay_rate from previous record or default 'D'
                let payRate = 'D';
                const { data: lastRecord } = await supabase
                    .from('records')
                    .select('pay_rate')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (lastRecord?.pay_rate) {
                    payRate = lastRecord.pay_rate;
                }

                const recordPayload = {
                    user_id: user.id,
                    class_id: classId,
                    grade: grade || 0,
                    level: level || '',
                    student_count: studentCount,
                    // rate: calculatedRate, // Trigger calculates this
                    status: "Hoàn thành",
                    class_type: "BU",
                    feedback_status: "Đã nhận xét",
                    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    pay_rate: payRate
                };

                const { error: recordError } = await supabase
                    .from('records')
                    .insert(recordPayload);

                if (recordError) {
                    console.error("Error saving record:", recordError);
                } else {
                    console.log("Record saved successfully");
                }
            }
        } catch (err) {
            console.error("Error in record saving:", err);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-[900px] animate-fade-in pb-20">
            <h1 className="text-3xl font-bold text-center mb-8 text-[var(--accent-color)]">Tạo nhận xét</h1>
            <form onSubmit={(e) => { e.preventDefault(); generateFeedback(); }}>

                {/* Controls Bar */}
                <div className="glass-panel p-3 md:p-4 mb-8 flex flex-col md:flex-row items-center justify-between sticky top-4 z-20 backdrop-blur-xl gap-4">
                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => scrollToSection(`section-${num}`)}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-[var(--primary-color)] hover:text-white hover:border-[var(--primary-color)] transition-all font-bold text-sm md:text-base flex items-center justify-center shadow-sm"
                            >
                                {num}
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 md:px-6 py-2 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-900/20 font-bold text-sm transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /></svg>
                            <span className="hidden md:inline">Đặt lại</span>
                        </button>

                        <button
                            type="submit"
                            className="px-6 py-2 rounded-full bg-[var(--primary-color)] text-white font-bold text-sm transform hover:-translate-y-0.5 hover:bg-[var(--primary-hover)] shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                            Tạo Feedback
                        </button>
                    </div>
                </div>

                {/* SECTION 1: General Info */}
                <section id="section-1" className="glass-panel p-8">
                    <div className="flex justify-between items-center mb-6 border-b-2 border-indigo-500/10 pb-2">
                        <h2 className="text-2xl font-bold text-[var(--text-main)]">
                            1. Thông tin chung
                        </h2>
                        <div className="flex gap-2">
                            {grade && (
                                <div className="px-4 py-1 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold text-sm">
                                    Lớp {grade}
                                </div>
                            )}
                            {level && (
                                <div className="px-4 py-1 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold text-sm">
                                    {level}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Class ID Input */}
                    <div className="mb-6">
                        <label htmlFor="classId" className="block mb-2 font-medium">Mã lớp học</label>
                        <input
                            type="text"
                            id="classId"
                            className="w-full p-3 border border-gray-300 rounded-[var(--radius-md)] bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all shadow-sm"
                            placeholder="Ví dụ: KIDS123"
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                        />
                    </div>

                    {/* Lesson Content Input */}
                    <div className="mb-6">
                        <label htmlFor="lessonContent" className="block mb-2 font-medium">Nội dung bài học</label>
                        <textarea
                            id="lessonContent"
                            ref={lessonContentRef}
                            className="w-full p-3 border border-gray-300 rounded-[var(--radius-md)] bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all min-h-[50px] resize-none shadow-sm overflow-hidden"
                            rows={1}
                            placeholder="Ví dụ: Unit 5: Animals..."
                            value={lessonContent}
                            onChange={(e) => setLessonContent(e.target.value)}
                            required
                        ></textarea>
                    </div>

                    <div className="space-y-6">
                        {/* Atmosphere */}
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center cursor-pointer min-w-[30px]">
                                <input
                                    type="checkbox"
                                    checked={atmosphereChecked}
                                    onChange={(e) => setAtmosphereChecked(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 accent-[var(--primary-color)] focus:ring-[var(--primary-color)] cursor-pointer"
                                />
                            </label>
                            <label className="min-w-[140px] font-medium">Không khí lớp học</label>
                            <select
                                value={atmosphereValue}
                                onChange={(e) => setAtmosphereValue(e.target.value)}
                                disabled={!atmosphereChecked}
                                className="flex-1 p-3 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] disabled:opacity-50 transition-all shadow-sm"
                            >
                                <option value="Sôi nổi">Sôi nổi</option>
                                <option value="Trầm lặng">Trầm lặng</option>
                            </select>
                        </div>

                        {/* Progress */}
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center cursor-pointer min-w-[30px]">
                                <input
                                    type="checkbox"
                                    checked={progressChecked}
                                    onChange={(e) => setProgressChecked(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 accent-[var(--primary-color)] focus:ring-[var(--primary-color)] cursor-pointer"
                                />
                            </label>
                            <label className="min-w-[140px] font-medium">Buổi học diễn ra</label>
                            <select
                                value={progressValue}
                                onChange={(e) => setProgressValue(e.target.value)}
                                disabled={!progressChecked}
                                className="flex-1 p-3 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] disabled:opacity-50 transition-all shadow-sm"
                            >
                                <option value="Bình thường">Bình thường</option>
                                <option value="Trễ">Trễ</option>
                                <option value="Sớm">Sớm</option>
                            </select>
                        </div>


                    </div>
                </section>

                {/* SECTION 2: Student List */}
                <section id="section-2" className="glass-panel p-8 mt-8">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-indigo-500/10">
                        <h2 className="text-2xl font-bold m-0 p-0 text-[var(--text-main)]">
                            2. Danh sách học sinh
                        </h2>
                        <div className="px-4 py-1 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold text-sm">
                            {schoolLevel === 'TH' ? 'Tiểu học' : 'THCS'}
                        </div>
                    </div>

                    <div className="mb-8 p-3 -mx-3 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5" ref={studentSectionRef} data-lenis-prevent>
                        <div className="flex items-center gap-4 mb-2">
                            <label htmlFor="studentCountInput" className="font-medium m-0">Số lượng học sinh:</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                id="studentCountInput"
                                min="1"
                                max="6"
                                value={studentCount}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                        setStudentCount(Math.max(1, Math.min(6, val)));
                                    }
                                }}
                                className="w-20 text-center p-2 border border-gray-300 rounded-[var(--radius-md)] bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] font-bold text-lg"
                            />
                        </div>
                    </div>

                    <Reorder.Group
                        axis={isDesktop ? "x" : "y"}
                        values={students.slice(0, studentCount)}
                        onReorder={(reorderedStats) => {
                            const remainingStudents = students.slice(studentCount);
                            setStudents([...reorderedStats, ...remainingStudents]);
                        }}
                        className="grid gap-4 grid-cols-1 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
                        style={{ '--cols': studentCount } as React.CSSProperties}
                    >
                        <AnimatePresence mode="popLayout" initial={false}>
                            {students.slice(0, studentCount).map((student) => (
                                <Reorder.Item
                                    key={student.id}
                                    value={student}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="mb-4 relative group bg-white dark:bg-gray-800/50 rounded-[var(--radius-md)] border border-transparent hover:border-[var(--primary-color)] transition-colors"
                                >
                                    <div className="p-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="font-medium cursor-grab active:cursor-grabbing text-sm flex items-center gap-2 select-none">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                    <circle cx="9" cy="12" r="1" />
                                                    <circle cx="9" cy="5" r="1" />
                                                    <circle cx="9" cy="19" r="1" />
                                                    <circle cx="15" cy="12" r="1" />
                                                    <circle cx="15" cy="5" r="1" />
                                                    <circle cx="15" cy="19" r="1" />
                                                </svg>
                                            </label>
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-[var(--radius-md)] bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all text-sm shadow-sm"
                                            placeholder={`Tên HS ${student.id + 1}`}
                                            value={student.name}
                                            onChange={(e) => {
                                                const newStudents = students.map(s => s.id === student.id ? { ...s, name: e.target.value } : s);
                                                setStudents(newStudents);
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </Reorder.Item>
                            ))}
                        </AnimatePresence>
                    </Reorder.Group>
                </section>

                {/* SECTION 3: Knowledge */}
                <section id="section-3" className="glass-panel p-8 mt-8">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-indigo-500/10 flex-wrap gap-4">
                        <h2 className="text-2xl font-bold m-0 p-0 text-[var(--text-main)]">3. Tiếp thu kiến thức</h2>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-semibold text-[var(--text-secondary)]">Chế độ:</span>
                            <div className="flex bg-black/5 rounded-[20px] p-[3px] shadow-inner dark:bg-white/10">
                                <label className={`px-3 py-1 cursor-pointer rounded-[16px] text-sm font-semibold transition-all ${knowledgeMode === 'bulk' ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <input type="radio" name="know_mode" className="hidden" onChange={() => setKnowledgeMode('bulk')} checked={knowledgeMode === 'bulk'} />
                                    Đồng loạt
                                </label>
                                <label className={`px-3 py-1 cursor-pointer rounded-[16px] text-sm font-semibold transition-all ${knowledgeMode === 'individual' ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <input type="radio" name="know_mode" className="hidden" onChange={() => setKnowledgeMode('individual')} checked={knowledgeMode === 'individual'} />
                                    Từng bạn
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-indigo-500/10">
                        {CRITERIA_LIST.map(criteria => (
                            <label key={criteria} className={`inline-block px-3 py-1 rounded-full border cursor-pointer select-none text-xs ${includedCriteria.includes(criteria) ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm" : "bg-white/50 border-gray-200/50 dark:bg-gray-700/50 dark:hover:bg-gray-600"}`}>
                                <input type="checkbox" className="hidden"
                                    checked={includedCriteria.includes(criteria)}
                                    onChange={(e) => {
                                        if (e.target.checked) setIncludedCriteria([...includedCriteria, criteria]);
                                        else setIncludedCriteria(includedCriteria.filter(c => c !== criteria));
                                    }}
                                />
                                {criteria}
                            </label>
                        ))}
                    </div>

                    <div className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {CRITERIA_LIST.filter(c => includedCriteria.includes(c)).map(criteria => (
                                <motion.div
                                    key={criteria}
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="group-row pb-2">
                                        <h4 className="text-[var(--primary-color)] font-bold mb-2">{criteria}</h4>
                                        <div
                                            className={`grid gap-4 ${knowledgeMode === 'bulk' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]'}`}
                                            style={{ '--cols': studentCount } as React.CSSProperties}
                                        >
                                            <AnimatePresence mode="popLayout" initial={false}>
                                                {(knowledgeMode === 'bulk' ? [0] : Array.from({ length: studentCount }, (_, i) => i)).map((i) => {
                                                    const val = students[i].scores[criteria];
                                                    return (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -10 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="flex flex-col gap-1"
                                                        >
                                                            <label className="text-xs truncate font-medium text-[var(--text-secondary)]">
                                                                {knowledgeMode === 'bulk' ? "Tất cả học sinh" : (students[i].name || `HS ${i + 1}`)}
                                                            </label>
                                                            <div className="flex items-center gap-3">
                                                                <Slider
                                                                    min={1}
                                                                    max={10}
                                                                    value={val}
                                                                    onChange={(newVal) => handleScoreChange(criteria, newVal, i)}
                                                                    className="flex-1"
                                                                />
                                                                <span className="font-bold text-[var(--primary-color)] w-[24px] text-righttabular-nums">{val}</span>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </section>

                {/* SECTION 4: Attitude */}
                <section id="section-4" className="glass-panel p-8 mt-8">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-indigo-500/10 flex-wrap gap-4">
                        <h2 className="text-2xl font-bold m-0 p-0 text-[var(--text-main)]">4. Thái độ học tập</h2>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-semibold text-[var(--text-secondary)]">Chế độ:</span>
                            <div className="flex bg-black/5 rounded-[20px] p-[3px] shadow-inner dark:bg-white/10">
                                <label className={`px-3 py-1 cursor-pointer rounded-[16px] text-sm font-semibold transition-all ${attitudeMode === 'bulk' ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <input type="radio" name="att_mode" className="hidden" onChange={() => setAttitudeMode('bulk')} checked={attitudeMode === 'bulk'} />
                                    Đồng loạt
                                </label>
                                <label className={`px-3 py-1 cursor-pointer rounded-[16px] text-sm font-semibold transition-all ${attitudeMode === 'individual' ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <input type="radio" name="att_mode" className="hidden" onChange={() => setAttitudeMode('individual')} checked={attitudeMode === 'individual'} />
                                    Từng bạn
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-indigo-500/10">
                        {ATTITUDE_CATEGORIES.map(cat => (
                            <label key={cat} className={`inline-block px-3 py-1 rounded-full border cursor-pointer select-none text-xs ${includedAttitudeCategories.includes(cat) ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm" : "bg-white/50 border-gray-200/50 dark:bg-gray-700/50 dark:hover:bg-gray-600"}`}>
                                <input type="checkbox" className="hidden"
                                    checked={includedAttitudeCategories.includes(cat)}
                                    onChange={(e) => {
                                        if (e.target.checked) setIncludedAttitudeCategories([...includedAttitudeCategories, cat]);
                                        else setIncludedAttitudeCategories(includedAttitudeCategories.filter(c => c !== cat));
                                    }}
                                />
                                {cat}
                            </label>
                        ))}
                    </div>

                    <div className="flex flex-col">
                        <AnimatePresence initial={false}>
                            {ATTITUDE_CATEGORIES.filter(c => includedAttitudeCategories.includes(c)).map(category => (
                                <motion.div
                                    key={category}
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="pb-4">
                                        <h4 className="text-[var(--text-secondary)] font-bold mb-3 text-lg">{category}</h4>
                                        <div
                                            className={`grid gap-4 ${attitudeMode === 'bulk' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]'}`}
                                            style={{ '--cols': studentCount } as React.CSSProperties}
                                        >
                                            <AnimatePresence mode="popLayout" initial={false}>
                                                {(attitudeMode === 'bulk' ? [0] : Array.from({ length: studentCount }, (_, i) => i)).map((i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="flex flex-col gap-2"
                                                    >
                                                        {!((attitudeMode === 'bulk')) && (
                                                            <div className="text-xs font-bold text-center text-[var(--text-main)] mb-1">
                                                                {students[i].name || `HS ${i + 1}`}
                                                            </div>
                                                        )}
                                                        <div className="flex flex-wrap gap-1 justify-center">
                                                            {ATTITUDE_DATA[category].map(tag => {
                                                                const isPos = isValidPositive(tag);
                                                                const isNeg = isValidNegative(tag);
                                                                const isChecked = students[i].attitudes.includes(tag);

                                                                return (
                                                                    <label key={tag} className={`inline-block px-2 py-1 rounded-[12px] border cursor-pointer select-none text-[0.7rem] transition-all 
                                                          ${isChecked
                                                                            ? (isPos ? 'bg-green-500 border-green-500 text-white shadow-sm' : (isNeg ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-sm'))
                                                                            : 'bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                                                                        }
                                                      `}>
                                                                        <input type="checkbox" className="hidden"
                                                                            checked={isChecked}
                                                                            onChange={(e) => handleAttitudeChange(tag, e.target.checked, i)}
                                                                        />
                                                                        {tag}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </section>

                {/* SECTION 5: Reminders */}
                <section id="section-5" className="glass-panel p-8 mt-8">
                    <div className="flex justify-between items-center mb-6 border-b-2 border-indigo-500/10 pb-2">
                        <h2 className="text-2xl font-bold text-[var(--text-main)]">
                            5. Nhắc nhở phụ huynh
                        </h2>
                        <div className="px-4 py-1 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold text-sm">
                            Tuần {currentWeek}
                        </div>
                    </div>

                    <div className="mb-6 space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-semibold text-[var(--text-secondary)]">Buổi học:</span>
                            <div className="flex bg-black/5 rounded-[20px] p-[3px] shadow-inner dark:bg-white/10">
                                <label className={`px-3 py-1 cursor-pointer rounded-[16px] text-sm font-semibold transition-all ${sessionNumber === 1 ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <input type="radio" name="session" className="hidden" checked={sessionNumber === 1} onChange={() => setSessionNumber(1)} />
                                    Buổi 1
                                </label>
                                <label className={`px-3 py-1 cursor-pointer rounded-[16px] text-sm font-semibold transition-all ${sessionNumber === 2 ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                    <input type="radio" name="session" className="hidden" checked={sessionNumber === 2} onChange={() => setSessionNumber(2)} />
                                    Buổi 2
                                </label>
                            </div>
                        </div>

                        <p className="text-[var(--text-secondary)] text-sm">
                            PH nhớ nhắc các em hoàn thành <span className="font-bold text-[var(--text-main)]">BTVN Buổi {sessionNumber} Tuần {currentWeek}</span> và:
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {["Bài thi tháng", "Bài tập nói"].map((item) => (
                                <label
                                    key={item}
                                    className={`inline-block px-4 py-2 rounded-full border cursor-pointer transition-all select-none text-sm ${reminders.includes(item)
                                        ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md"
                                        : "bg-white/50 border-gray-200/10 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-600"
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={reminders.includes(item)}
                                        onChange={() => handleReminderChange(item)}
                                    />
                                    {item}
                                </label>
                            ))}
                        </div>
                    </div>
                </section>
            </form>

            {showOutput && (
                <div id="output-section" className="space-y-8 mt-8 animate-fade-in">
                    {/* Output 1: Class Report */}
                    <section className="glass-panel p-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Feedback buổi học</h2>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(classReport, () => {
                                    setClassReportCopyText("Copied!");
                                    setTimeout(() => setClassReportCopyText("Copy Report"), 2000);
                                })}
                                className={`px-4 py-2 rounded-lg border border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium transition-colors ${classReportCopyText === "Copied!" ? "!bg-[var(--primary-color)] !text-white" : ""
                                    }`}
                            >
                                {classReportCopyText}
                            </button>
                        </div>
                        <pre className="bg-[#1e1e2e] text-[#e2e8f0] p-6 rounded-lg overflow-x-auto font-mono text-sm whitespace-pre-wrap border border-gray-700 max-h-[400px] overflow-y-auto">
                            {classReport}
                        </pre>
                    </section>

                    {/* Output 2: Student Prompts */}
                    <section className="glass-panel p-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Prompt cho học sinh</h2>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(studentPrompts, () => {
                                    setPromptsCopyText("Copied!");
                                    setTimeout(() => setPromptsCopyText("Copy Prompts"), 2000);
                                })}
                                className={`px-4 py-2 rounded-lg border border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium transition-colors ${promptsCopyText === "Copied!" ? "!bg-[var(--primary-color)] !text-white" : ""
                                    }`}
                            >
                                {promptsCopyText}
                            </button>
                        </div>
                        <pre className="bg-[#1e1e2e] text-[#e2e8f0] p-6 rounded-lg overflow-x-auto font-mono text-sm whitespace-pre-wrap border border-gray-700 max-h-[600px] overflow-y-auto">
                            {studentPrompts}
                        </pre>
                    </section>
                </div>
            )
            }
        </div >
    );
}
