"use client";

import { useState, useRef, useEffect } from "react";
import { copyToClipboard, cn } from "@/lib/utils";
import { Slider } from "@/components/ui/Slider";
import { Reorder, AnimatePresence, motion } from "framer-motion";

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
};

const ATTITUDE_CATEGORIES = Object.keys(ATTITUDE_DATA);

// --- Types ---
interface Student {
    id: number; // useful for keys
    name: string;
    scores: Record<string, number>;
    attitudes: string[];
}

export default function StudentsPage() {
    // --- State ---
    const [lessonContent, setLessonContent] = useState("");
    const [studentCount, setStudentCount] = useState(4);
    const [schoolLevel, setSchoolLevel] = useState<"TH" | "THCS">("TH");

    const [knowledgeMode, setKnowledgeMode] = useState<"bulk" | "individual">("individual");
    const [attitudeMode, setAttitudeMode] = useState<"bulk" | "individual">("individual");

    const [includedCriteria, setIncludedCriteria] = useState<string[]>([
        "Từ vựng",
        "Ngữ pháp",
        "Phản xạ",
    ]);
    const [isDesktop, setIsDesktop] = useState(false);
    const [gender, setGender] = useState<string>("");

    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 768); // md breakpoint
        };

        // Fetch user gender
        const fetchUserGender = async () => {
            const { createClient } = await import("@/utils/supabase/client");
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.gender) {
                setGender(user.user_metadata.gender);
            }
        };

        checkDesktop();
        fetchUserGender();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);
    const [includedAttitudeCategories, setIncludedAttitudeCategories] = useState<string[]>(
        ATTITUDE_CATEGORIES
    );

    // Initialize students
    const [students, setStudents] = useState<Student[]>(() => {
        return Array.from({ length: MAX_STUDENTS }, (_, i) => ({
            id: i,
            name: "",
            scores: CRITERIA_LIST.reduce((acc, c) => ({ ...acc, [c]: 8 }), {}),
            attitudes: [],
        }));
    });

    const [output, setOutput] = useState("");
    const [showOutput, setShowOutput] = useState(false);
    const [copyBtnText, setCopyBtnText] = useState("Copy All");

    // Drag State
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const studentSectionRef = useRef<HTMLDivElement>(null);

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

    // --- Handlers ---

    const handleStudentNameChange = (index: number, value: string) => {
        const newStudents = [...students];
        newStudents[index].name = value;
        setStudents(newStudents);
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

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent, position: number) => {
        dragItem.current = position;
        // e.dataTransfer.effectAllowed = "move"; // Not strict in React
    };

    const handleDragEnter = (e: React.DragEvent, position: number) => {
        dragOverItem.current = position;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const newStudents = [...students];
            const draggedItemContent = newStudents[dragItem.current];
            newStudents.splice(dragItem.current, 1);
            newStudents.splice(dragOverItem.current, 0, draggedItemContent);
            setStudents(newStudents);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const isValidPositive = (tag: string) => {
        return [
            'tích cực', 'sôi nổi', 'vui vẻ', 'hứng thú', 'tự tin', 'lạc quan',
            'tập trung nghe giảng', 'chú ý bài học', 'tích cực phát biểu',
            'hòa đồng', 'biết chia sẻ', 'giúp đỡ bạn bè',
            'biết nghe lời', 'lễ phép', 'ngoan ngoãn'
        ].includes(tag);
    };

    const isValidNegative = (tag: string) => {
        return [
            'mệt mỏi', 'chán nản', 'trầm tính', 'tự ti', 'xấu hổ', 'ngại nói',
            'sao nhãng', 'làm việc riêng', 'không tập trung', 'lơ là',
            'nóng nảy', 'chưa hòa đồng', 'chưa vâng lời', 'phải nhắc nhở nhiều'
        ].includes(tag);
    };


    const generateFeedback = () => {
        if (!lessonContent.trim()) {
            alert("Vui lòng nhập nội dung bài học!");
            return;
        }

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

Hãy đóng vai trò là một ${teacherPronoun} giáo tiếng Anh thân thiện, nhẹ nhàng và chuyên nghiệp. Dựa trên thông tin dưới đây, hãy viết một đoạn nhận xét ngắn gọn (khoảng 50-100 chữ) bằng tiếng Việt dành cho phụ huynh. Sử dụng từ ngữ đơn giản, dễ hiểu, tránh dùng từ chuyên ngành khó hiểu.
${pronounInstruction}

Thông tin:
- Tên: ${name}
- Bài học: ${lessonContent}

Kết quả (Thang 10):
${criteriaText}

Thái độ:
${attitudeText}

Yêu cầu output (Thân thiện, nhẹ nhàng, từ ngữ đơn giản, KHÔNG chào hỏi/động viên sáo rỗng, TUYỆT ĐỐI KHÔNG nhắc đến điểm số):
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

        setOutput(prompts.join('\n\n' + '='.repeat(40) + '\n\n'));
        setShowOutput(true);
        setTimeout(() => {
            document.getElementById("groupOutputSection")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            <form onSubmit={(e) => { e.preventDefault(); generateFeedback(); }}>

                {/* Class Info */}
                <section className="glass-panel p-8">
                    <h2 className="text-2xl font-bold mb-6 text-[var(--text-main)] border-b-2 border-indigo-500/10 pb-2">Thông tin chung</h2>
                    <div className="mb-4">
                        <label htmlFor="groupLessonContent" className="block mb-2 font-medium">Nội dung bài học</label>
                        <textarea
                            id="groupLessonContent"
                            className="w-full p-3 border border-gray-300 rounded-[var(--radius-md)] bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all min-h-[50px] resize-y shadow-sm"
                            rows={2}
                            placeholder="Ví dụ: Unit 5: Animals..."
                            value={lessonContent}
                            onChange={(e) => setLessonContent(e.target.value)}
                            required
                        ></textarea>
                    </div>
                </section>

                {/* Student Info */}
                <section className="glass-panel p-8 mt-8">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-indigo-500/10">
                        <h2 className="text-2xl font-bold m-0 p-0 text-[var(--text-main)]">Danh sách học sinh</h2>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-semibold text-[var(--text-secondary)]">Cấp học:</span>
                            <div className="flex bg-black/5 rounded-[20px] p-[3px] shadow-inner dark:bg-white/10">
                                {['TH', 'THCS'].map((level) => (
                                    <label key={level} className={`px-3 py-1 cursor-pointer rounded-[16px] text-sm font-semibold transition-all ${schoolLevel === level ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                        <input type="radio" name="school_level" className="hidden"
                                            checked={schoolLevel === level}
                                            onChange={() => setSchoolLevel(level as any)}
                                        />
                                        {level}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 p-3 -mx-3 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5" ref={studentSectionRef} data-lenis-prevent>
                        <div className="flex items-center gap-4 mb-2">
                            <label htmlFor="studentCountInput" className="font-medium m-0">Số lượng học sinh:</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setStudentCount(Math.max(1, studentCount - 1))}
                                className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
                            </button>
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
                            <button
                                type="button"
                                onClick={() => setStudentCount(Math.min(6, studentCount + 1))}
                                className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                            </button>
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
                                                Học sinh {student.id + 1}
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

                {/* Knowledge Section */}
                <section className="glass-panel p-8 mt-8">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-indigo-500/10 flex-wrap gap-4">
                        <h2 className="text-2xl font-bold m-0 p-0 text-[var(--text-main)]">Tiếp thu kiến thức</h2>
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

                    {/* Criteria Selection */}
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

                    {/* Sliders Grid */}
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

                {/* Attitude Section */}
                <section className="glass-panel p-8 mt-8">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-indigo-500/10 flex-wrap gap-4">
                        <h2 className="text-2xl font-bold m-0 p-0 text-[var(--text-main)]">Thái độ học tập</h2>
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

                    {/* Category Selection */}
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

                    {/* Attitude Grid */}
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

                <div className="flex justify-center mt-8">
                    <button
                        type="submit"
                        className="px-8 py-3 rounded-lg bg-[var(--primary-color)] text-white font-semibold transform hover:-translate-y-0.5 hover:bg-[var(--primary-hover)] shadow-lg hover:shadow-xl transition-all"
                    >
                        Tạo Feedback
                    </button>
                </div>

            </form>

            {/* Output */}
            {showOutput && (
                <section id="groupOutputSection" className="glass-panel p-8 mt-8 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Generated Group Prompts</h2>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(output, () => {
                                setCopyBtnText("Copied!");
                                setTimeout(() => setCopyBtnText("Copy All"), 2000);
                            })}
                            className={`px-4 py-2 rounded-lg border border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium transition-colors ${copyBtnText === "Copied!" ? "!bg-[var(--primary-color)] !text-white" : ""
                                }`}
                        >
                            {copyBtnText}
                        </button>
                    </div>
                    <pre className="bg-[#1e1e2e] text-[#e2e8f0] p-6 rounded-lg overflow-x-auto font-mono text-sm whitespace-pre-wrap border border-gray-700 max-h-[600px] overflow-y-auto">
                        {output}
                    </pre>
                </section>
            )}

        </div>
    );
}
