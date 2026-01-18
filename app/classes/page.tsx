"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { createClient } from "@/utils/supabase/client";
import { parseClassInfo } from "@/utils/class-utils";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface ClassRecord {
    id: string;
    user_id: string;
    fixed_class_id: string; // The "Class ID" visible to user
    grade: number;
    level: string;
    state: "Đang dạy" | "Kết thúc";
    num_students: number;
    students: string[]; // List of student names
    schedule: string[]; // Weekdays e.g. ["T2", "T5"]
    time: string; // e.g. "19h30"
    finished_lesson: number;
}

const SCHEDULE_OPTIONS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const TIME_OPTIONS = [
    "18h30", "19h00", "19h30", "20h00", "20h30", "21h00"
];

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");

    // Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        grade: "all",
        level: "all",
        state: "Đang dạy" as "Đang dạy" | "Kết thúc" | "all"
    });

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newClassData, setNewClassData] = useState({
        fixed_class_id: "",
        state: "Đang dạy",
        schedule: [] as string[],
        time: "19h00",
        students: [] as string[] // Initial empty list
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Expanded Rows for Student Editing
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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
            .select("*, finished_lesson")
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
                    finished_lesson: d.finished_lesson || 0
                }));
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
    const filteredClasses = classes.filter((c) => {
        if (filters.state !== "all" && c.state !== filters.state) return false;
        if (filters.grade !== "all" && c.grade?.toString() !== filters.grade) return false;
        if (filters.level !== "all" && c.level !== filters.level) return false;

        const searchStr = query.toLowerCase();
        return (
            (c.fixed_class_id || "").toLowerCase().includes(searchStr) ||
            (c.grade?.toString() || "").includes(searchStr) ||
            (c.level || "").toLowerCase().includes(searchStr)
        );
    });

    // --- Actions ---
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} lớp đã chọn?`)) return;

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
        if (selectedIds.size === filteredClasses.length && filteredClasses.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredClasses.map(c => c.id)));
        }
    };

    const toggleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // --- Actions ---
    const handleSaveNewClass = async () => {
        if (!newClassData.fixed_class_id.trim()) {
            alert("Vui lòng nhập Mã lớp!");
            return;
        }

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
            const pattern = `${newClassData.fixed_class_id}-%`;
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
                time: "19h00",
                students: []
            });
        }
    };

    const toggleScheduleDay = (day: string) => {
        setNewClassData(prev => {
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
                    className="flex-1 p-2 text-sm border rounded bg-white dark:bg-slate-700 dark:border-slate-600 w-full max-w-[120px]"
                />
                <button onClick={onRemove} className="text-red-500 hover:text-red-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        )
    };

    // --- Sub-component: Edit Students ---
    // --- Sub-component: Edit Students ---
    const EditStudentsRow = ({ classRec }: { classRec: ClassRecord }) => {
        const [newStudentName, setNewStudentName] = useState("");

        const addStudent = () => {
            if (newStudentName.trim()) {
                const updated = [...classRec.students, newStudentName.trim()];
                handleUpdateStudents(classRec.id, updated);
                setNewStudentName("");
            }
        };

        const removeStudent = (index: number) => {
            const updated = classRec.students.filter((_, i) => i !== index);
            handleUpdateStudents(classRec.id, updated);
        };

        const updateStudentName = (index: number, newName: string) => {
            if (newName === classRec.students[index]) return;
            const updated = [...classRec.students];
            updated[index] = newName.trim();
            handleUpdateStudents(classRec.id, updated);
        };

        return (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
            >
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold mb-2 text-sm text-[var(--primary-color)]">Danh sách học sinh ({classRec.students.length})</h4>
                    <div className="w-full">
                        <div className="flex flex-wrap gap-2 mb-3">
                            {classRec.students.map((s, idx) => (
                                <div key={`${idx}-${s}`} className="w-auto">
                                    <StudentItem
                                        initialName={s}
                                        onSave={(val) => updateStudentName(idx, val)}
                                        onRemove={() => removeStudent(idx)}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 items-center">
                            <input
                                placeholder="Thêm..."
                                value={newStudentName}
                                onChange={(e) => setNewStudentName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addStudent()}
                                className="p-2 text-sm border border-dashed rounded bg-transparent dark:border-slate-600 focus:bg-white dark:focus:bg-slate-700 w-full max-w-[120px]"
                            />
                            <button onClick={addStudent} className="text-[var(--primary-color)] hover:text-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

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

                    <div className="flex gap-2">
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

                            {/* Reset Button */}
                            <div className="flex items-end">
                                <button
                                    onClick={() => setFilters({
                                        grade: "all",
                                        level: "all",
                                        state: "all"
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

            {/* Table */}
            <div className="glass-panel overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl relative z-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filteredClasses.length && filteredClasses.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                                    />
                                </th>
                                <th className="px-4 py-3">Mã lớp</th>
                                <th className="px-4 py-3">Lớp</th>
                                <th className="px-4 py-3">Trình độ</th>
                                <th className="px-4 py-3 text-center">Đã hoàn thành</th>
                                <th className="px-4 py-3">Lịch học</th>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3 text-center">Học sinh</th>
                                <th className="px-4 py-3 w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                            ) : filteredClasses.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Chưa có lớp học nào phù hợp.</td></tr>
                            ) : (
                                filteredClasses.map((cls) => (
                                    <Fragment key={cls.id}>
                                        <tr key={cls.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedIds.has(cls.id) ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(cls.id)}
                                                    onChange={() => toggleSelectRow(cls.id)}
                                                    className="rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium">{cls.fixed_class_id}</td>
                                            <td className="px-4 py-3">{cls.grade}</td>
                                            <td className="px-4 py-3">{cls.level}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-bold text-xs border border-green-200 dark:border-green-800">
                                                    {cls.finished_lesson} buổi
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1 flex-wrap">
                                                    {cls.schedule && cls.schedule.map(d => (
                                                        <span key={d} className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">{d}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-gray-600 dark:text-gray-400">{cls.time}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block min-w-[30px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 font-bold text-xs">{cls.students?.length || 0}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => setExpandedRowId(expandedRowId === cls.id ? null : cls.id)}
                                                    className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-transform ${expandedRowId === cls.id ? 'rotate-180' : ''}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Expandable Row */}
                                        <AnimatePresence>
                                            {expandedRowId === cls.id && (
                                                <tr>
                                                    <td colSpan={8} className="p-0 border-none">
                                                        <EditStudentsRow classRec={cls} />
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Class Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-4 text-[var(--accent-color)]">Thêm lớp chủ nhiệm mới</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mã lớp</label>
                                <input
                                    type="text"
                                    value={newClassData.fixed_class_id}
                                    onChange={(e) => setNewClassData({ ...newClassData, fixed_class_id: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                    placeholder="Ví dụ: C2.34"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lịch học</label>
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
            )}
        </div>
    );
}
