"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { parseClassInfo } from "@/utils/class-utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Legend, Cell } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/contexts/ConfirmationContext";

// --- Types ---
interface TeachingRecord {
    id: string;
    user_id: string;
    class_id: string;
    grade: number;
    level: string;
    student_count: number;
    rate: number;
    status: string;
    class_type: "CN" | "BU";
    feedback_status: "Đã nhận xét" | "Chưa nhận xét";
    date: string; // YYYY-MM-DD
    time_start: string | null;
    pay_rate: string;
}


const STATUS_OPTIONS = ["Hoàn thành", "HS vắng mặt", "GS vắng mặt", "Hủy", "Chưa mở lớp", "Feedback trễ"];
const CLASS_TYPES = ["BU", "CN"];
const FEEDBACK_STATUS_OPTIONS = ["Đã nhận xét", "Chưa nhận xét"];
const TIME_OPTIONS = [
    "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00"
];

// --- Helper: Rate Calculation ---
// REMOVED: Logic migrated to Supabase Trigger (calculate_record_fields)

// --- Helper: Parse Class ID (Ported from Lesson Page) ---
// MOVED TO @/utils/class-utils.ts

export default function RecordsPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const [records, setRecords] = useState<TeachingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [currentPayRate, setCurrentPayRate] = useState<string>("B+"); // User preference - fetched from profile

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: keyof TeachingRecord; direction: "asc" | "desc" }>({
        key: "date",
        direction: "desc",
    });

    // View Mode
    const [viewMode, setViewMode] = useState<"list" | "analytic">("list");

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newRecordData, setNewRecordData] = useState({
        class_id: "",
        status: "Hoàn thành",
        feedback_status: "Đã nhận xét",
        date: new Date().toISOString().split('T')[0],
        time_start: "19:00"
    });


    // --- Filters State ---
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        month: new Date().toISOString().slice(0, 7), // yyyy-MM
        grade: "all",
        level: "all",
        status: "all",
        feedback_status: "all",
        class_type: "all"
    });

    // Derived unique options for filters
    const filterOptions = useMemo(() => {
        const grades = new Set<string>();
        const levels = new Set<string>();
        records.forEach(r => {
            if (r.grade) grades.add(r.grade.toString());
            if (r.level) levels.add(r.level);
        });
        return {
            grades: Array.from(grades).sort((a, b) => Number(a) - Number(b)),
            levels: Array.from(levels).sort()
        };
    }, [records]);

    useEffect(() => {
        const initData = async () => {
            await fetchRecords();
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('pay_rate').eq('id', user.id).maybeSingle();
                if (data?.pay_rate) {
                    setCurrentPayRate(data.pay_rate);
                }
            }
        };
        initData();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("records")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: false });

        if (error) console.error("Error fetching records:", error);
        else {
            if (data && data.length > 0) {
                // Infer most common pay_rate or use first
                setCurrentPayRate(data[0].pay_rate || "D");
            }
            setRecords(data || []);
        }
        setLoading(false);
    };

    // --- Search & Filter ---
    const filteredRecords = records.filter((r) => {
        // 1. Advanced Filters
        if (filters.month && !r.date.startsWith(filters.month)) return false;
        if (filters.grade !== "all" && r.grade?.toString() !== filters.grade) return false;
        if (filters.level !== "all" && r.level !== filters.level) return false;
        if (filters.status !== "all" && r.status !== filters.status) return false;
        if (filters.feedback_status !== "all" && r.feedback_status !== filters.feedback_status) return false;
        if (filters.class_type !== "all" && r.class_type !== filters.class_type) return false;

        // 2. Search Filter
        const searchStr = query.toLowerCase();
        return (
            (r.class_id || "").toLowerCase().includes(searchStr) ||
            (r.grade?.toString() || "").includes(searchStr) ||
            (r.level || "").toLowerCase().includes(searchStr) ||
            (r.status || "").toLowerCase().includes(searchStr) ||
            (r.feedback_status || "").toLowerCase().includes(searchStr) ||
            (r.date || "").includes(searchStr) ||
            (r.time_start || "").includes(searchStr)
        );
    });

    // --- Sort ---
    const sortedRecords = [...filteredRecords].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === bVal) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        const comparison = aVal > bVal ? 1 : -1;
        return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    // --- Actions ---
    const handleAddClick = () => {
        setIsAddModalOpen(true);
    };

    const handleSaveNewRecord = async () => {
        if (!newRecordData.class_id.trim()) {
            alert("Vui lòng nhập Mã lớp!");
            return;
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Parse grade and level from class_id
        const { grade, level, maxStudents } = parseClassInfo(newRecordData.class_id);

        // Check if this class exists in 'classes' table to determine type (CN vs BU)
        // Heuristic: If class_id is "R4.3C.065061-10", we look for fixed_class_id "R4.3C.065061"
        let computedType = "BU";
        if (newRecordData.class_id.includes("-")) {
            // Assume format matches [fixed_id]-[number]
            // We'll try to match the longest prefix first or just split by last hyphen
            const parts = newRecordData.class_id.split("-");
            if (parts.length >= 2) {
                // Remove the last part (the session number) to get potential Fixed ID
                const potentialFixedId = newRecordData.class_id.substring(0, newRecordData.class_id.lastIndexOf("-"));

                const { data: classExists } = await supabase
                    .from("classes")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("fixed_class_id", potentialFixedId)
                    .maybeSingle();

                if (classExists) {
                    computedType = "CN";
                }
            }
        }

        const newRecord: Partial<TeachingRecord> = {
            user_id: user.id,
            class_id: newRecordData.class_id,
            grade: grade || 0,
            level: level || "Không xác định",
            student_count: maxStudents, // Default based on type
            rate: 0,
            status: newRecordData.status,
            class_type: computedType as any, // 'CN' or 'BU'
            feedback_status: newRecordData.feedback_status as any,
            date: newRecordData.date,
            time_start: newRecordData.time_start,
            pay_rate: currentPayRate,
        };



        // Rate is now calculated by Supabase trigger

        const { data, error } = await supabase
            .from("records")
            .insert(newRecord)
            .select()
            .single();

        if (error) {
            console.error("Error adding record:", error);
            alert("Lỗi khi thêm buổi học mới.");
        } else if (data) {
            setRecords([data, ...records]);
            setIsAddModalOpen(false);
            // Reset form
            setNewRecordData({
                class_id: "",
                status: "Hoàn thành",
                feedback_status: "Đã nhận xét",
                date: new Date().toISOString().split('T')[0],
                time_start: "19:00"
            });
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!await confirm({
            title: "Xác nhận xóa buổi học",
            message: `Bạn có chắc chắn muốn xóa ${selectedIds.size} buổi học đã chọn?`,
            type: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy'
        })) return;

        const supabase = createClient();
        const { error } = await supabase
            .from("records")
            .delete()
            .in("id", Array.from(selectedIds));

        if (error) {
            console.error("Error deleting records:", error);
            alert("Lỗi khi xóa dữ liệu.");
        } else {
            setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
            setSelectedIds(new Set());
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRecords.map(r => r.id)));
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

    const handleSort = (key: keyof TeachingRecord) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
        }));
    };

    // --- Updates ---
    const updateRecord = async (id: string, updates: Partial<TeachingRecord>) => {
        const supabase = createClient();

        // Optimistic update (Partial, excluding rate unless we want to impl client-side again or mock it)
        // For accurate rates, we should wait for DB. But for UX, we can optimistically update other fields.
        setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

        const { data, error } = await supabase
            .from("records")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating record:", error);
            fetchRecords(); // Revert on error
        } else if (data) {
            // Update with partial data from DB (which includes calculated rate)
            setRecords(prev => prev.map(r => r.id === id ? data : r));
        }
    };



    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    // --- Analytics Data ---
    const totalIncome = useMemo(() => {
        return filteredRecords.reduce((sum, r) => sum + (r.rate || 0), 0);
    }, [filteredRecords]);

    const chartData = useMemo(() => {
        // Group by Date
        const grouped: Record<string, number> = {};
        // Sort chronologically for chart
        const chronoRecords = [...filteredRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        chronoRecords.forEach(r => {
            const d = new Date(r.date);
            const key = `${d.getDate()}/${d.getMonth() + 1}`; // D/M
            grouped[key] = (grouped[key] || 0) + (r.rate || 0);
        });

        return Object.entries(grouped).map(([date, amount]) => ({
            date,
            amount
        }));
    }, [filteredRecords]);

    const pieDataGrade = useMemo(() => {
        const grouped: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const key = `Lớp ${r.grade}`;
            grouped[key] = (grouped[key] || 0) + 1;
        });
        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [filteredRecords]);

    const pieDataLevel = useMemo(() => {
        const grouped: Record<string, number> = {};
        filteredRecords.forEach(r => {
            const key = r.level || "Unknown";
            grouped[key] = (grouped[key] || 0) + 1;
        });

        const order = ["Giỏi", "Khá", "Trung bình", "Yếu"];
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => {
                const idxA = order.indexOf(a.name);
                const idxB = order.indexOf(b.name);
                // If both are in the known list, sort by index
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                // If only A is in list, it comes first
                if (idxA !== -1) return -1;
                // If only B is in list, it comes first
                if (idxB !== -1) return 1;
                // Otherwise alphabetical
                return a.name.localeCompare(b.name);
            });
    }, [filteredRecords]);

    const COLORS = [
        '#6366f1', // Indigo (Primary)
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#f43f5e', // Rose
        '#06b6d4', // Cyan
        '#8b5cf6', // Violet
        '#84cc16', // Lime
        '#d946ef', // Fuchsia
        '#0ea5e9', // Sky
        '#f97316', // Orange
        '#14b8a6', // Teal
        '#ec4899', // Pink
        '#64748b'  // Slate
    ];
    const LEVEL_COLORS: Record<string, string> = {
        "Giỏi": "#22c55e",      // Green-500
        "Khá": "#3b82f6",       // Blue-500
        "Trung bình": "#eab308",// Yellow-500
        "Yếu": "#ef4444",       // Red-500
        "Unknown": "#9ca3af"    // Gray-400
    };

    const heatmapData = useMemo(() => {
        // Last 30 days
        const days = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            // Count lessons for this date
            const count = filteredRecords.filter(r => r.date === dateStr).length;

            days.push({
                date: dateStr,
                count,
                day: d.getDate(),
                fullDate: d
            });
        }
        return days;
    }, [filteredRecords]);

    return (
        <div className="w-full px-4 md:px-8 py-6 animate-fade-in pb-20">
            <h1 className="text-3xl font-bold text-center mb-8 text-[var(--accent-color)]">Quản lý buổi học</h1>

            {/* Controls Bar */}
            <div className="glass-panel p-3 md:p-4 mb-4 md:mb-6 flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between sticky top-4 z-10 backdrop-blur-xl">
                {/* Search */}
                <div className="relative w-full md:flex-1">
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp, trình độ, ngày..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>

                {/* Mobile Row for Filter & Actions */}
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
                            onClick={() => setViewMode("analytic")}
                            className={`p-2 rounded-md transition-all ${viewMode === "analytic"
                                ? "bg-white dark:bg-slate-700 shadow-sm text-[var(--primary-color)]"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                }`}
                            title="Thống kê"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        </button>
                    </div>

                    {/* Action Buttons */}
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
                            onClick={handleAddClick}
                            title="Thêm buổi học"
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
                        <div className="p-3 md:p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
                            {/* Month Filter */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Tháng / Năm</label>
                                <input
                                    type="month"
                                    value={filters.month}
                                    onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 text-sm p-2 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-[var(--primary-color)] outline-none"
                                />
                            </div>

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
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 text-sm p-2 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-[var(--primary-color)] outline-none"
                                >
                                    <option value="all">Tất cả</option>
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Feedback Filter */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Feedback</label>
                                <select
                                    value={filters.feedback_status}
                                    onChange={(e) => setFilters({ ...filters, feedback_status: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 text-sm p-2 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-[var(--primary-color)] outline-none"
                                >
                                    <option value="all">Tất cả</option>
                                    {FEEDBACK_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Reset Button */}
                            <div className="flex items-end">
                                <button
                                    onClick={() => setFilters({
                                        month: "",
                                        grade: "all",
                                        level: "all",
                                        status: "all",
                                        feedback_status: "all",
                                        class_type: "all"
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
            {viewMode === "list" && (
                <div className="glass-panel overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl relative z-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                                            onChange={toggleSelectAll}
                                            className="appearance-none w-4 h-4 rounded-full border-2 border-gray-300 checked:bg-[var(--primary-color)] checked:border-[var(--primary-color)] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%224%22%20d%3D%22M5%2013l4%204L19%207%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:70%] cursor-pointer transition-all"
                                        />
                                    </th>
                                    <th onClick={() => handleSort("class_id")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap">Mã lớp</th>
                                    <th onClick={() => handleSort("grade")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap">Lớp</th>
                                    <th onClick={() => handleSort("level")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap">Trình độ</th>
                                    <th onClick={() => handleSort("rate")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap text-right">Thu nhập</th>
                                    <th onClick={() => handleSort("status")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap">Trạng thái</th>
                                    <th onClick={() => handleSort("class_type")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap">Loại</th>
                                    <th onClick={() => handleSort("feedback_status")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap">Feedback</th>
                                    <th onClick={() => handleSort("date")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap">Ngày</th>
                                    <th onClick={() => handleSort("time_start")} className="px-4 py-3 cursor-pointer hover:text-[var(--primary-color)] whitespace-nowrap">Giờ</th>
                                    {/* <th className="px-4 py-3 whitespace-nowrap text-right">Lương áp dụng</th>  REMOVED as per request */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={10} className="p-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                                ) : sortedRecords.length === 0 ? (
                                    <tr><td colSpan={10} className="p-8 text-center text-gray-500">Chưa có dữ liệu buổi học.</td></tr>
                                ) : (
                                    sortedRecords.map((record) => (
                                        <tr key={record.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${selectedIds.has(record.id) ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(record.id)}
                                                    onChange={() => toggleSelectRow(record.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="appearance-none w-4 h-4 rounded-full border-2 border-gray-300 checked:bg-[var(--primary-color)] checked:border-[var(--primary-color)] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%224%22%20d%3D%22M5%2013l4%204L19%207%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:70%] cursor-pointer transition-all"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => router.push(`/lesson?classId=${record.class_id}`)}
                                                        className="p-1.5 text-gray-500 hover:text-[var(--primary-color)] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all"
                                                        title="Chỉnh sửa feedback"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                    </button>
                                                    {record.class_id}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{record.grade}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.level === "Giỏi" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                    record.level === "Khá" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                        record.level === "Trung bình" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                                            record.level === "Yếu" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                                "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                    }`}>
                                                    {record.level}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-right text-[var(--primary-color)]">
                                                {formatCurrency(record.rate)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="relative">
                                                    <select
                                                        value={record.status}
                                                        onChange={(e) => updateRecord(record.id, { status: e.target.value })}
                                                        className={`appearance-none font-bold text-xs px-3 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900 transition-all text-center border-0 ${record.status === "Hoàn thành" ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20" :
                                                            record.status === "Hủy" ? "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20" :
                                                                record.status === "HS vắng mặt" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:hover:bg-yellow-500/20" :
                                                                    record.status === "GS vắng mặt" ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20" :
                                                                        record.status === "Feedback trễ" ? "bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:hover:bg-pink-500/20" :
                                                                            "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700"
                                                            }`}
                                                    >
                                                        {STATUS_OPTIONS.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all inline-block ${record.class_type === "BU"
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                                        : "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                                                        }`}
                                                >
                                                    {record.class_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="relative">
                                                    <select
                                                        value={record.feedback_status}
                                                        onChange={(e) => updateRecord(record.id, { feedback_status: e.target.value as any })}
                                                        className={`appearance-none font-bold text-xs px-3 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900 transition-all text-center border-0 ${record.feedback_status === "Đã nhận xét"
                                                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                                                            : "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                                                            }`}
                                                    >
                                                        {FEEDBACK_STATUS_OPTIONS.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="date"
                                                    value={record.date}
                                                    onChange={(e) => updateRecord(record.id, { date: e.target.value })}
                                                    className="bg-transparent border-none text-gray-500 text-sm focus:ring-0 cursor-pointer w-[110px]"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={record.time_start || ""}
                                                    onChange={(e) => updateRecord(record.id, { time_start: e.target.value })}
                                                    className="bg-transparent border-none text-gray-500 text-sm focus:ring-0 cursor-pointer"
                                                >
                                                    <option value="">--</option>
                                                    {TIME_OPTIONS.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            {/* REMOVED Pay Rate Column */}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div >
            )}

            {/* Analytics Section */}
            {viewMode === "analytic" && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        {/* Total Summary Card */}
                        <div className="md:col-span-1 glass-panel p-4 md:p-6 flex flex-col justify-center items-center shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-24 h-24 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2 relative z-10">Tổng thu nhập (đang hiển thị)</h3>
                            <p className="text-4xl font-black text-[var(--primary-color)] relative z-10 tracking-tight">
                                {formatCurrency(totalIncome)}
                            </p>
                        </div>

                        {/* Heatmap Card */}
                        <div className="md:col-span-2 glass-panel p-4 md:p-6 shadow-lg">
                            <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-200">Tần suất dạy (30 ngày gần đây)</h3>
                            <div className="flex flex-wrap gap-2">
                                {heatmapData.map((day, idx) => (
                                    <div
                                        key={day.date}
                                        className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all relative group cursor-default
                                        ${day.count === 0 ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600' :
                                                day.count === 1 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' :
                                                    day.count === 2 ? 'bg-indigo-300 text-indigo-900 dark:bg-indigo-500/60 dark:text-indigo-100' :
                                                        'bg-[var(--primary-color)] text-white'
                                            }`}
                                        title={`${day.date}: ${day.count} buổi`}
                                    >
                                        {day.day}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex gap-4 text-xs text-gray-500 justify-end">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 rounded-sm"></div> 0 buổi</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-100 rounded-sm"></div> 1 buổi</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-300 rounded-sm"></div> 2 buổi</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[var(--primary-color)] rounded-sm"></div> 3+ buổi</div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="md:col-span-3 glass-panel p-4 md:p-6 shadow-lg">
                            <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-200">Biểu đồ thu nhập theo thời gian</h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12, fill: '#888' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#888' }}
                                            tickFormatter={(val) => `${val / 1000}k`}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ stroke: 'var(--primary-color)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-main)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: 'var(--text-main)' }}
                                            formatter={(value: any) => [formatCurrency(value), 'Thu nhập']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="var(--primary-color)"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorIncome)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Pie Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* Grade Pie */}
                        <div className="glass-panel p-4 md:p-6 shadow-lg">
                            <h3 className="text-lg font-bold mb-4 text-center text-gray-700 dark:text-gray-200">Phân bố theo Lớp</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieDataGrade}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieDataGrade.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-main)', borderRadius: '12px' }}
                                            itemStyle={{ color: 'var(--text-main)' }}
                                            formatter={(value: any) => [value, 'Số buổi']}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Level Pie */}
                        <div className="glass-panel p-4 md:p-6 shadow-lg">
                            <h3 className="text-lg font-bold mb-4 text-center text-gray-700 dark:text-gray-200">Phân bố theo Trình độ</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieDataLevel}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieDataLevel.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={LEVEL_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-main)', borderRadius: '12px' }}
                                            itemStyle={{ color: 'var(--text-main)' }}
                                            formatter={(value: any) => [value, 'Số buổi']}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Add Record Modal */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100 border border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold mb-4 text-[var(--accent-color)]">Thêm buổi học mới</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mã lớp</label>
                                    <input
                                        type="text"
                                        value={newRecordData.class_id}
                                        onChange={(e) => setNewRecordData({ ...newRecordData, class_id: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                        placeholder="Ví dụ: C2.34"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái</label>
                                        <select
                                            value={newRecordData.status}
                                            onChange={(e) => setNewRecordData({ ...newRecordData, status: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                        >
                                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback</label>
                                        <select
                                            value={newRecordData.feedback_status}
                                            onChange={(e) => setNewRecordData({ ...newRecordData, feedback_status: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                        >
                                            {FEEDBACK_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày giảng dạy</label>
                                        <input
                                            type="date"
                                            value={newRecordData.date}
                                            onChange={(e) => setNewRecordData({ ...newRecordData, date: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Giờ bắt đầu</label>
                                        <select
                                            value={newRecordData.time_start}
                                            onChange={(e) => setNewRecordData({ ...newRecordData, time_start: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                                        >
                                            {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                                    onClick={handleSaveNewRecord}
                                    className="px-4 py-2 text-sm font-bold text-white bg-[var(--primary-color)] hover:bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30 transition-all"
                                >
                                    Lưu buổi học
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
