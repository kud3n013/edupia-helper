"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { AgendaView, ClassRecord } from "@/components/AgendaView";
import { parseClassInfo } from "@/utils/class-utils";
import { motion, AnimatePresence } from "framer-motion";
import { useConfirm } from "@/contexts/ConfirmationContext";

// --- Types ---
// Interface now imported


const SCHEDULE_OPTIONS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const TIME_OPTIONS = [
    "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
];

// --- Sub-component: Student Item ---
const StudentItem = ({ initialName, onSave, onRemove }: { initialName: string, onSave: (val: string) => void, onRemove: () => void }) => {
    const [name, setName] = useState(initialName);

    useEffect(() => {
        setName(initialName);
    }, [initialName]);

    return (
        <div className="flex gap-2 items-center">
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => onSave(name)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="flex-1 p-2 text-sm border rounded bg-white dark:bg-slate-700 dark:border-slate-600 w-full max-w-[90px]"
            />
            <button onClick={onRemove} className="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    )
};

// --- Sub-component: Student List Editor (Reusable) ---
const StudentListEditor = ({ students, onUpdate }: { students: string[], onUpdate: (students: string[]) => void }) => {
    const [newStudentName, setNewStudentName] = useState("");
    const isFull = students.length >= 6;

    const addStudent = () => {
        if (isFull) return;
        if (newStudentName.trim()) {
            const updated = [...students, newStudentName.trim()];
            onUpdate(updated);
            setNewStudentName("");
        }
    };

    const removeStudent = (index: number) => {
        const updated = students.filter((_, i) => i !== index);
        onUpdate(updated);
    };

    const updateStudentName = (index: number, newName: string) => {
        if (newName === students[index]) return;
        const updated = [...students];
        updated[index] = newName.trim();
        onUpdate(updated);
    };

    return (
        <div className="w-full">
            <div className="flex flex-col gap-2 mb-3">
                <AnimatePresence initial={false}>
                    {students.map((s, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="w-full overflow-hidden"
                        >
                            <StudentItem
                                initialName={s}
                                onSave={(val) => updateStudentName(idx, val)}
                                onRemove={() => removeStudent(idx)}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="flex gap-2 items-center">
                <input
                    placeholder={isFull ? "Tối đa 6" : "Thêm..."}
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addStudent()}
                    disabled={isFull}
                    className={`p-2 text-sm border border-dashed rounded bg-transparent dark:border-slate-600 focus:bg-white dark:focus:bg-slate-700 w-full max-w-[90px] ${isFull ? 'cursor-not-allowed opacity-50' : ''}`}
                    autoFocus
                />
                <button
                    onClick={addStudent}
                    disabled={isFull}
                    className={`text-[var(--primary-color)] hover:text-indigo-600 shrink-0 ${isFull ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </button>
            </div>
        </div>
    );
};

// --- Sub-component: Finished Lessons List ---
const FinishedLessonsList = ({ lessons }: { lessons: string[] }) => {
    // If no lessons, we still render the container so it animates cleanly (or we render null? 
    // If we render null here, the cell is empty.
    // The user saw "Chưa có bài học nào hoàn thành" so we are rendering that div.

    // We moved the check inside? No, let's keep the check but wrap the RESULT.
    // Actually, if we return early, we might return a raw div which isn't animated.
    // Better to wrap the whole thing.

    const content = (!lessons || lessons.length === 0) ? (
        <div className="text-xs text-gray-400 p-2 text-center">Chưa có bài học nào hoàn thành.</div>
    ) : (
        <div className="bg-gray-50 dark:bg-slate-800/50 p-2 border-t border-gray-100 dark:border-gray-700 shadow-inner h-full max-h-[200px] overflow-y-auto">
            <ul className="space-y-1 w-full">
                {lessons.map((lesson, idx) => (
                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                        <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <span>{lesson}</span>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
        >
            {content}
        </motion.div>
    );
};

// --- Sub-component: Edit Students Row (Wrapper for Expansion) ---
const EditStudentsRow = ({ classRec, onUpdate }: { classRec: ClassRecord, onUpdate: (students: string[]) => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
        >
            <div className="bg-gray-50 dark:bg-slate-800/50 p-2 border-t border-gray-100 dark:border-gray-700 shadow-inner flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <h4 className="text-xs font-semibold text-gray-500 mb-1">Học sinh</h4>
                    <StudentListEditor students={classRec.students} onUpdate={onUpdate} />
                </div>
                {/* Finished Lessons List integrated here if needed, but currently passed via table structure */}
            </div>
        </motion.div>
    );
};

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();
    const [query, setQuery] = useState("");

    // Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        grade: "all",
        level: "all",
        state: "all" as "Đang dạy" | "Kết thúc" | "all",
        schedule: [] as string[]
    });

    const [errors, setErrors] = useState<{ classId?: string, schedule?: string }>({});

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newClassData, setNewClassData] = useState({
        fixed_class_id: "",
        state: "Đang dạy",
        schedule: [] as string[],
        time: "19:00",
        students: [] as string[] // Initial empty list
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // Expanded Rows for Student Editing
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "schedule", direction: "asc" });

    // View Mode
    const [viewMode, setViewMode] = useState<"list" | "agenda">("list");

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("classes")
            .select("*, finished_lessons")
            .eq("user_id", user.id)
            .order("fixed_class_id", { ascending: true }); // Sort by Class ID by default

        if (error) console.error("Error fetching classes:", error);
        else {
            if (data) {
                // Ensure students is array (it might be null or JSON)
                const parsedData = data.map(d => ({
                    ...d,
                    students: Array.isArray(d.students) ? d.students : [],
                    schedule: Array.isArray(d.schedule) ? d.schedule : [],
                    num_finished_lessons: d.num_finished_lessons || 0,
                    finished_lessons: d.finished_lessons || []
                }));
                // @ts-ignore - Supabase type mismatch workaround (num_finished_lessons added via SQL)
                setClasses(parsedData);
            }
        }
        setLoading(false);
    };

    // Derived unique options for filters
    const filterOptions = useMemo(() => {
        const grades = new Set<string>();
        const levels = new Set<string>();
        classes.forEach(c => {
            if (c.grade) grades.add(c.grade.toString());
            if (c.level) levels.add(c.level);
        });
        return {
            grades: Array.from(grades).sort((a, b) => Number(a) - Number(b)),
            levels: Array.from(levels).sort()
        };
    }, [classes]);

    // --- Search & Filter ---
    // --- Search & Filter & Sort ---
    const sortedClasses = useMemo(() => {
        let items = classes.filter((c) => {
            if (filters.state !== "all" && c.state !== filters.state) return false;
            if (filters.grade !== "all" && c.grade?.toString() !== filters.grade) return false;
            if (filters.level !== "all" && c.level !== filters.level) return false;
            if (filters.schedule.length > 0) {
                // If class has no schedule, it doesn't match if we are filtering by schedule
                if (!c.schedule || c.schedule.length === 0) return false;
                // Check if any of the class days match the filtered days
                const hasMatch = c.schedule.some(day => filters.schedule.includes(day));
                if (!hasMatch) return false;
            }

            const searchStr = query.toLowerCase();
            return (
                (c.fixed_class_id || "").toLowerCase().includes(searchStr) ||
                (c.grade?.toString() || "").includes(searchStr) ||
                (c.level || "").toLowerCase().includes(searchStr)
            );
        });

        if (sortConfig !== null) {
            items.sort((a, b) => {
                if (sortConfig.key === "schedule") {
                    const dayWeights: Record<string, number> = { "CN": 0, "T2": 1, "T3": 2, "T4": 3, "T5": 4, "T6": 5, "T7": 6 };

                    const getMinWeight = (schedule: string[]) => {
                        if (!schedule || schedule.length === 0) return 999;
                        return Math.min(...schedule.map(d => dayWeights[d] ?? 999));
                    };

                    const aWeight = getMinWeight(a.schedule);
                    const bWeight = getMinWeight(b.schedule);

                    if (aWeight < bWeight) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aWeight > bWeight) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                let aValue: any = sortConfig.key === "students" ? a.students.length : a[sortConfig.key as keyof ClassRecord];
                let bValue: any = sortConfig.key === "students" ? b.students.length : b[sortConfig.key as keyof ClassRecord];

                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return items;
    }, [classes, filters, query, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === "asc" ? "desc" : "asc" };
            }
            return { key, direction: "asc" };
        });
    };

    // --- Actions ---
    const handleRefresh = async () => {
        await fetchClasses();
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!await confirm({
            title: "Xác nhận xóa lớp",
            message: `Bạn có chắc chắn muốn xóa ${selectedIds.size} lớp đã chọn?`,
            type: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        })) return;

        const supabase = createClient();
        const { error } = await supabase
            .from("classes")
            .delete()
            .in("id", Array.from(selectedIds));

        if (error) {
            console.error("Error deleting classes:", error);
            alert("Lỗi khi xóa dữ liệu.");
        } else {
            setClasses(prev => prev.filter(c => !selectedIds.has(c.id)));
            setSelectedIds(new Set());
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sortedClasses.length && sortedClasses.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedClasses.map(c => c.id)));
        }
    };

    const toggleSelectRow = (id: string, index?: number, shiftKey?: boolean) => {
        const newSelected = new Set(selectedIds);

        if (shiftKey && lastSelectedId !== null && index !== undefined) {
            // Range Selection
            const lastIndex = sortedClasses.findIndex(c => c.id === lastSelectedId);
            if (lastIndex !== -1) {
                const start = Math.min(index, lastIndex);
                const end = Math.max(index, lastIndex);

                // Add all items in range (inclusive)
                for (let i = start; i <= end; i++) {
                    if (sortedClasses[i]) {
                        newSelected.add(sortedClasses[i].id);
                    }
                }
            }
        } else {
            // Standard/Ctrl Click Selection
            if (newSelected.has(id)) {
                newSelected.delete(id);
                setLastSelectedId(null);
            } else {
                newSelected.add(id);
                setLastSelectedId(id);
            }
        }

        setSelectedIds(newSelected);
    };

    // --- Actions ---
    const handleSaveNewClass = async () => {
        const newErrors: { classId?: string, schedule?: string } = {};
        if (!newClassData.fixed_class_id.trim()) newErrors.classId = "Vui lòng nhập Mã lớp";
        if (newClassData.schedule.length === 0) newErrors.schedule = "Vui lòng chọn lịch học";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Parse grade and level
        const { grade, level, maxStudents } = parseClassInfo(newClassData.fixed_class_id);

        const newClass: Partial<ClassRecord> = {
            user_id: user.id,
            fixed_class_id: newClassData.fixed_class_id,
            grade: grade || 0,
            level: level || "Không xác định",
            state: newClassData.state as any,
            num_students: newClassData.students.length, // Or maxStudents? Requirement says "Number of students" in table, user creates with list.
            students: newClassData.students,
            schedule: newClassData.schedule,
            time: newClassData.time,
        };

        const { data, error } = await supabase
            .from("classes")
            .insert(newClass)
            .select()
            .single();

        if (error) {
            console.error("Error adding class:", error);
            alert("Lỗi khi thêm lớp mới.");
        } else if (data) {
            // Auto-update records to 'CN' if they match the pattern
            // Pattern: [fixed_class_id]-[number]
            const pattern = `${newClassData.fixed_class_id} -% `;
            const { error: updateError } = await supabase
                .from("records")
                .update({ class_type: "CN" })
                .eq("user_id", user.id)
                .eq("class_type", "BU")
                .like("class_id", pattern);

            if (updateError) {
                console.error("Error syncing records:", updateError);
            }

            setClasses([...classes, { ...data, students: data.students || [], schedule: data.schedule || [] }]);
            setIsAddModalOpen(false);
            setNewClassData({
                fixed_class_id: "",
                state: "Đang dạy",
                schedule: [],
                time: "19:00",
                students: []
            });
        }
    };

    const toggleScheduleDay = (day: string) => {
        setNewClassData(prev => {
            const exists = prev.schedule.includes(day);
            const newSchedule = exists ? prev.schedule.filter(d => d !== day) : [...prev.schedule, day];

            // Clear error if at least one day is selected
            if (newSchedule.length > 0 && errors.schedule) {
                setErrors(prevErr => ({ ...prevErr, schedule: undefined }));
            }

            return { ...prev, schedule: newSchedule };
        });
    };

    const toggleFilterSchedule = (day: string) => {
        setFilters(prev => {
            const exists = prev.schedule.includes(day);
            if (exists) return { ...prev, schedule: prev.schedule.filter(d => d !== day) };
            return { ...prev, schedule: [...prev.schedule, day] };
        });
    };

    const updateClass = async (id: string, updates: Partial<ClassRecord>) => {
        const supabase = createClient();

        // Optimistic update
        setClasses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

        const { error } = await supabase
            .from("classes")
            .update(updates)
            .eq("id", id);

        if (error) {
            console.error("Error updating class:", error);
            fetchClasses(); // Revert
        }
    };

    const handleUpdateStudents = async (id: string, newStudents: string[]) => {
        await updateClass(id, {
            students: newStudents,
            num_students: newStudents.length
        });
    };



    // --- Sub-component: Edit Students ---


    // --- Sub-component: AgendaView ---
    // AgendaView removed (imported)

    return (
        <div className="w-full px-4 md:px-8 py-6 animate-fade-in pb-20">
            <h1 className="text-3xl font-bold text-center mb-8 text-[var(--accent-color)]">Quản lý lớp chủ nhiệm</h1>

            {/* Controls Bar */}
            <div className="glass-panel p-3 md:p-4 mb-4 md:mb-6 flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between sticky top-4 z-10 backdrop-blur-xl">
                {/* Search */}
                <div className="relative w-full md:flex-1">
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>

                {/* Filter and Actions */}
                <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-3">
                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg transition-all flex items-center gap-2 border flex-1 md:flex-none justify-center ${showFilters
                            ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)]"
                            : "bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                        <span className="md:inline text-sm font-medium">Lọc</span>
                    </button>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-md transition-all ${viewMode === "list"
                                ? "bg-white dark:bg-slate-700 shadow-sm text-[var(--primary-color)]"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                }`}
                            title="Danh sách"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        </button>
                        <button
                            onClick={() => setViewMode("agenda")}
                            className={`p-2 rounded-md transition-all ${viewMode === "agenda"
                                ? "bg-white dark:bg-slate-700 shadow-sm text-[var(--primary-color)]"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                }`}
                            title="Lịch biểu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            title="Làm mới dữ liệu"
                            className={`w-10 h-10 rounded-full transition-all flex items-center justify-center border border-gray-300 dark:border-gray-700 ${loading
                                ? "bg-gray-100/50 text-gray-400 cursor-wait dark:bg-gray-800/50"
                                : "bg-white/50 text-gray-600 hover:bg-white hover:text-[var(--primary-color)] hover:shadow-sm dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                                }`}
                        >
                            <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={selectedIds.size === 0}
                            title={selectedIds.size > 0 ? `Xóa ${selectedIds.size} đã chọn` : "Xóa"}
                            className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${selectedIds.size > 0
                                ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                                : "bg-gray-100 text-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            title="Thêm lớp"
                            className="bg-[var(--primary-color)] text-white hover:bg-indigo-600 w-10 h-10 rounded-full transition-all flex items-center justify-center shadow-lg shadow-indigo-500/30"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginBottom: 0, overflow: "hidden" }}
                        animate={{
                            height: "auto",
                            opacity: 1,
                            marginBottom: 24,
                            transitionEnd: { overflow: "visible" }
                        }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0, overflow: "hidden" }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="glass-panel border border-gray-200 dark:border-gray-700 relative z-[1]"
                    >
                        <div className="p-3 md:p-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                            {/* Grade Filter */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Cấp lớp</label>
                                <select
                                    value={filters.grade}
                                    onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 text-sm p-2 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-[var(--primary-color)] outline-none"
                                >
                                    <option value="all">Tất cả</option>
                                    {filterOptions.grades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>

                            {/* Level Filter */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Trình độ</label>
                                <select
                                    value={filters.level}
                                    onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 text-sm p-2 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-[var(--primary-color)] outline-none"
                                >
                                    <option value="all">Tất cả</option>
                                    {filterOptions.levels.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Trạng thái</label>
                                <select
                                    value={filters.state}
                                    onChange={(e) => setFilters({ ...filters, state: e.target.value as any })}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 text-sm p-2 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-[var(--primary-color)] outline-none"
                                >
                                    <option value="Đang dạy">Đang dạy</option>
                                    <option value="Kết thúc">Kết thúc</option>
                                    <option value="all">Tất cả</option>
                                </select>
                            </div>

                            {/* Schedule Filter */}
                            <div className="col-span-2 md:col-span-3 lg:col-span-4 mt-2">
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Lịch học</label>
                                <div className="flex flex-wrap gap-2">
                                    {SCHEDULE_OPTIONS.map(day => (
                                        <button
                                            key={day}
                                            onClick={() => toggleFilterSchedule(day)}
                                            className={`w-8 h-8 rounded-full text-xs font-bold transition-all border ${filters.schedule.includes(day)
                                                ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)]"
                                                : "bg-transparent text-gray-500 border-gray-200 dark:border-gray-700 hover:border-[var(--primary-color)]"
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reset Button */}
                            <div className="flex items-end">
                                <button
                                    onClick={() => setFilters({
                                        grade: "all",
                                        level: "all",
                                        state: "all",
                                        schedule: []
                                    })}
                                    className="w-full p-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {
                viewMode === "list" ? (
                    /* Table View */
                    <div className="glass-panel overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl relative z-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 w-10 hidden md:table-cell">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === sortedClasses.length && sortedClasses.length > 0}
                                                onChange={toggleSelectAll}
                                                className="appearance-none w-4 h-4 rounded-full border-2 border-gray-300 checked:bg-[var(--primary-color)] checked:border-[var(--primary-color)] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%224%22%20d%3D%22M5%2013l4%204L19%207%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:70%] cursor-pointer transition-all"
                                            />
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] group transition-colors"
                                            onClick={() => handleSort('fixed_class_id')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Mã lớp
                                                {sortConfig?.key === 'fixed_class_id' && (
                                                    <span className="text-[var(--primary-color)]">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] group transition-colors hidden md:table-cell"
                                            onClick={() => handleSort('grade')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Lớp
                                                {sortConfig?.key === 'grade' && (
                                                    <span className="text-[var(--primary-color)]">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] group transition-colors hidden md:table-cell"
                                            onClick={() => handleSort('level')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Trình độ
                                                {sortConfig?.key === 'level' && (
                                                    <span className="text-[var(--primary-color)]">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 text-center cursor-pointer hover:text-[var(--primary-color)] group transition-colors hidden md:table-cell"
                                            onClick={() => handleSort('num_finished_lessons')}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Tổng số buổi
                                                {sortConfig?.key === 'num_finished_lessons' && (
                                                    <span className="text-[var(--primary-color)]">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] group transition-colors hidden md:table-cell"
                                            onClick={() => handleSort('schedule')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Lịch học
                                                {sortConfig?.key === 'schedule' && (
                                                    <span className="text-[var(--primary-color)]">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] group transition-colors hidden md:table-cell"
                                            onClick={() => handleSort('state')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Trạng thái
                                                {sortConfig?.key === 'state' && (
                                                    <span className="text-[var(--primary-color)]">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] group transition-colors hidden md:table-cell"
                                            onClick={() => handleSort('time')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Thời gian
                                                {sortConfig?.key === 'time' && (
                                                    <span className="text-[var(--primary-color)]">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="px-4 py-3 text-center cursor-pointer hover:text-[var(--primary-color)] group transition-colors"
                                            onClick={() => handleSort('students')}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Học sinh
                                                {sortConfig?.key === 'students' && (
                                                    <span className="text-[var(--primary-color)]">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {loading ? (
                                        <tr><td colSpan={10} className="p-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                                    ) : sortedClasses.length === 0 ? (
                                        <tr><td colSpan={10} className="p-8 text-center text-gray-500">Chưa có lớp học nào phù hợp.</td></tr>
                                    ) : (
                                        sortedClasses.map((cls, index) => (
                                            <Fragment key={cls.id}>
                                                <tr
                                                    key={cls.id}
                                                    onClick={(e) => toggleSelectRow(cls.id, index, e.shiftKey)}
                                                    className={`hover: bg - gray - 50 dark: hover: bg - gray - 800 / 50 transition - colors cursor - pointer ${selectedIds.has(cls.id) ? "bg-[var(--primary-color)]/10 dark:bg-[var(--primary-color)]/20" : ""} `}
                                                >
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(cls.id)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleSelectRow(cls.id, index, e.shiftKey);
                                                            }}
                                                            onChange={(e) => toggleSelectRow(cls.id, index, (e.nativeEvent as any).target?.shiftKey || (e.nativeEvent as KeyboardEvent).shiftKey)}
                                                            className="appearance-none w-4 h-4 rounded-full border-2 border-gray-300 checked:bg-[var(--primary-color)] checked:border-[var(--primary-color)] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%224%22%20d%3D%22M5%2013l4%204L19%207%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:70%] cursor-pointer transition-all"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{cls.fixed_class_id}</td>
                                                    <td className="px-4 py-3 hidden md:table-cell">{cls.grade}</td>
                                                    <td className="px-4 py-3 hidden md:table-cell">{cls.level}</td>
                                                    <td className="px-4 py-3 text-center hidden md:table-cell">
                                                        <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-bold text-xs border border-green-200 dark:border-green-800">
                                                            {cls.num_finished_lessons} buổi
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        <div className="flex gap-1 flex-wrap">
                                                            {cls.schedule && cls.schedule.map(d => (
                                                                <span key={d} className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">{d}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        <select
                                                            value={cls.state || "Đang dạy"}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                updateClass(cls.id, { state: e.target.value as any });
                                                            }}
                                                            className={`text-xs font-semibold px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer transition-colors ${cls.state === "Kết thúc"
                                                                ? "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                                                                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400"
                                                                }`}
                                                        >
                                                            <option value="Đang dạy">Đang dạy</option>
                                                            <option value="Kết thúc">Kết thúc</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        <span className="font-mono text-gray-600 dark:text-gray-400">{cls.time}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-block min-w-[30px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 font-bold text-xs">{cls.students?.length || 0}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedRowId(expandedRowId === cls.id ? null : cls.id);
                                                            }}
                                                            className={`p - 2 rounded - full hover: bg - black / 5 dark: hover: bg - white / 10 transition - transform ${expandedRowId === cls.id ? 'rotate-180' : ''} `}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                                {/* Expandable Row */}
                                                <AnimatePresence>
                                                    {expandedRowId === cls.id && (
                                                        <>
                                                            {/* Desktop Expanded Row */}
                                                            <tr className="hidden md:table-row">
                                                                <td colSpan={4} className="border-none"></td>
                                                                <td className="p-0 border-none align-top">
                                                                    <FinishedLessonsList lessons={cls.finished_lessons} />
                                                                </td>
                                                                <td colSpan={3} className="border-none"></td>
                                                                <td colSpan={2} className="p-0 border-none align-top">
                                                                    <EditStudentsRow
                                                                        classRec={cls}
                                                                        onUpdate={(updated) => handleUpdateStudents(cls.id, updated)}
                                                                    />
                                                                </td>
                                                            </tr>
                                                            {/* Mobile Expanded Row */}
                                                            <tr className="md:hidden">
                                                                <td colSpan={3} className="p-0 border-none">
                                                                    <div className="flex flex-col p-4 bg-gray-50 dark:bg-slate-800/50 gap-4 border-t border-gray-100 dark:border-gray-700 shadow-inner">
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-gray-500 mb-1">Tổng số buổi</h4>
                                                                            <FinishedLessonsList lessons={cls.finished_lessons} />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-xs font-semibold text-gray-500 mb-1">Học sinh</h4>
                                                                            <EditStudentsRow
                                                                                classRec={cls}
                                                                                onUpdate={(updated) => handleUpdateStudents(cls.id, updated)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Agenda View is now in a shared component */
                    <AgendaView
                        classes={sortedClasses}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelectRow}
                    />
                )
            }


            {/* Add Class Modal */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold mb-4 text-[var(--accent-color)]">Thêm lớp chủ nhiệm mới</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mã lớp <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newClassData.fixed_class_id}
                                        onChange={(e) => {
                                            setNewClassData({ ...newClassData, fixed_class_id: e.target.value });
                                            if (errors.classId && e.target.value.trim()) {
                                                setErrors(prev => ({ ...prev, classId: undefined }));
                                            }
                                        }}
                                        className={`w-full rounded-lg border p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none ${errors.classId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                        placeholder="Ví dụ: C2.34"
                                    />
                                    <AnimatePresence>
                                        {errors.classId && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex items-center text-red-500 text-xs gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                    {errors.classId}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Lịch học <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {SCHEDULE_OPTIONS.map(day => (
                                            <button
                                                key={day}
                                                onClick={() => toggleScheduleDay(day)}
                                                className={`w-9 h-9 rounded-full text-xs font-bold transition-all border ${newClassData.schedule.includes(day)
                                                    ? "bg-[var(--primary-color)] text-white border-[var(--primary-color)]"
                                                    : "bg-transparent text-gray-500 border-gray-200 dark:border-gray-700 hover:border-[var(--primary-color)]"
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                    <AnimatePresence>
                                        {errors.schedule && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex items-center text-red-500 text-xs gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                    {errors.schedule}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thời gian</label>
                                        <select
                                            value={newClassData.time}
                                            onChange={(e) => setNewClassData({ ...newClassData, time: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                        >
                                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái</label>
                                        <select
                                            value={newClassData.state}
                                            onChange={(e) => setNewClassData({ ...newClassData, state: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                        >
                                            <option value="Đang dạy">Đang dạy</option>
                                            <option value="Kết thúc">Kết thúc</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Danh sách học sinh
                                    </label>
                                    <div>
                                        <StudentListEditor
                                            students={newClassData.students}
                                            onUpdate={(updated) => setNewClassData({ ...newClassData, students: updated })}
                                        />
                                    </div>
                                    <p className="text-xs text-right text-gray-500 mt-1">
                                        {newClassData.students.length} học sinh
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleSaveNewClass}
                                    className="px-4 py-2 text-sm font-bold text-white bg-[var(--primary-color)] hover:bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30 transition-all"
                                >
                                    Lưu lớp
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
