"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

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

const PAY_RATES = ["S+", "A+", "B+", "C+", "D"];
const STATUS_OPTIONS = ["Hoàn thành", "HS vắng mặt", "GS vắng mặt", "Hủy", "Chưa mở lớp", "Feedback trễ"];
const CLASS_TYPES = ["BU", "CN"];
const FEEDBACK_STATUS_OPTIONS = ["Đã nhận xét", "Chưa nhận xét"];
const TIME_OPTIONS = [
    "19:00", "19:15", "19:30", "19:45",
    "20:00", "20:15", "20:30", "20:45",
    "21:00"
];

// --- Helper: Rate Calculation (Duplicated from Lesson Page for now, better in util) ---
const calculateRate = (currentStudentCount: number, currentStatus: string, currentPayRate: string) => {
    let baseRate = 0;

    const rates: Record<string, { single: number, group4: number, group6?: number }> = {
        'S+': { single: 85000, group4: 100000, group6: 115000 },
        'A+': { single: 80000, group4: 95000, group6: 110000 },
        'B+': { single: 60000, group4: 75000, group6: 90000 },
        'C+': { single: 50000, group4: 65000, group6: 90000 },
        'D': { single: 40000, group4: 55000, group6: 55000 },
    };

    const rateProfile = rates[currentPayRate] || rates['D'];

    if (currentStudentCount === 1) baseRate = rateProfile.single;
    else if (currentStudentCount <= 4) baseRate = rateProfile.group4;
    else baseRate = rateProfile.group6 || rateProfile.group4;

    let multiplier = 0;
    switch (currentStatus) {
        case "Hoàn thành": multiplier = 1; break;
        case "HS vắng mặt": multiplier = 0.3; break;
        case "GS vắng mặt": multiplier = -2; break;
        case "Hủy": multiplier = 0; break;
        case "Chưa mở lớp": multiplier = 0; break;
        case "Feedback trễ": multiplier = 1; break;
        default: multiplier = 1;
    }

    return baseRate * multiplier;
};

// --- Helper: Parse Class ID (Ported from Lesson Page) ---
const parseClassId = (classId: string) => {
    let grade = 0;
    let level = "";

    const match = classId.match(/\.(\d+)([a-zA-Z])/);
    if (match && match[1]) {
        // Parse Grade
        const g = parseInt(match[1], 10);
        if (!isNaN(g)) {
            grade = g;
        }

        // Parse Level
        if (match[2]) {
            const l = match[2].toUpperCase();
            const levelMap: Record<string, string> = {
                'A': 'Giỏi',
                'B': 'Khá',
                'C': 'Trung bình',
                'D': 'Yếu'
            };
            level = levelMap[l] || "";
        }
    }
    return { grade, level };
};

export default function RecordsPage() {
    const [records, setRecords] = useState<TeachingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [viewMode, setViewMode] = useState<"month" | "week" | "year">("month");
    const [currentPayRate, setCurrentPayRate] = useState<string>("B+"); // User preference

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: keyof TeachingRecord; direction: "asc" | "desc" }>({
        key: "date",
        direction: "desc",
    });

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

    useEffect(() => {
        fetchRecords();
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
        // 1. Date Filter
        const date = new Date(r.date);
        const now = new Date();
        let dateMatch = true;

        if (viewMode === "month") {
            dateMatch = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        } else if (viewMode === "year") {
            dateMatch = date.getFullYear() === now.getFullYear();
        } else if (viewMode === "week") {
            // Simple week check (Sunday to Saturday)
            const onejan = new Date(now.getFullYear(), 0, 1);
            const todayWeek = Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
            const dateWeek = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
            dateMatch = todayWeek === dateWeek && date.getFullYear() === now.getFullYear();
        }

        if (!dateMatch) return false;

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
        const { grade, level } = parseClassId(newRecordData.class_id);

        const newRecord: Partial<TeachingRecord> = {
            user_id: user.id,
            class_id: newRecordData.class_id,
            grade: grade || 0,
            level: level || "Không xác định",
            student_count: 1, // Default
            rate: 0,
            status: newRecordData.status,
            class_type: "BU", // Default
            feedback_status: newRecordData.feedback_status as any,
            date: newRecordData.date,
            time_start: newRecordData.time_start,
            pay_rate: currentPayRate,
        };

        // Calculate initial rate
        newRecord.rate = calculateRate(1, newRecordData.status, currentPayRate);

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
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} buổi học đã chọn?`)) return;

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

        // Optimistic update
        setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

        // If status or pay_rate changed, recalculate rate
        const target = records.find(r => r.id === id);
        if (target && (updates.status || updates.pay_rate)) {
            const newStatus = updates.status || target.status;
            const newPayRate = updates.pay_rate || target.pay_rate;
            const newRate = calculateRate(target.student_count, newStatus, newPayRate);
            updates.rate = newRate;

            // Apply calculated rate to optimistic update
            setRecords(prev => prev.map(r => r.id === id ? { ...r, rate: newRate } : r));
        }

        const { error } = await supabase
            .from("records")
            .update(updates)
            .eq("id", id);

        if (error) {
            console.error("Error updating record:", error);
            fetchRecords(); // Revert on error
        }
    };

    const handleGlobalPayRateChange = async (newRate: string) => {
        setCurrentPayRate(newRate);

        // Optimistic bulk update
        const updatedRecords = records.map(r => {
            const newIncome = calculateRate(r.student_count, r.status, newRate);
            return { ...r, pay_rate: newRate, rate: newIncome };
        });
        setRecords(updatedRecords);

        // Persist to Supabase (Batch update if possible, or parallel/sequential)
        // Since Supabase doesn't support bulk update with different regular ID match easily without UPSERT on primary key.
        // We will use upsert.
        const supabase = createClient();

        // Prepare payload for upsert
        // We only need to send fields that changed + ID.
        // Actually for upsert we need all required fields or it might error if default? No, updates existing.
        // We send: id, pay_rate, rate.
        const updates = updatedRecords.map(r => ({
            id: r.id,
            user_id: r.user_id, // Needed for RLS sometimes? No. But good to be safe if upsert needs constraints? 
            // Actually upsert needs Primary Key.
            pay_rate: newRate,
            rate: r.rate,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from("records")
            .upsert(updates);

        if (error) {
            console.error("Error batch updating pay rates:", error);
            // Optionally revert?
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    return (
        <div className="w-full px-4 md:px-8 py-6 animate-fade-in pb-20">
            <h1 className="text-3xl font-bold text-center mb-8 text-[var(--accent-color)]">Quản lý buổi học</h1>

            {/* Controls Bar */}
            <div className="glass-panel p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-10 backdrop-blur-xl">
                {/* Search */}
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp, trình độ, ngày..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>

                {/* View Mode */}
                <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
                    {(["month", "week", "year"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setViewMode(m)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === m
                                ? "bg-white dark:bg-gray-600 shadow-sm text-[var(--primary-color)]"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            {m === "month" ? "Tháng" : m === "week" ? "Tuần" : "Năm"}
                        </button>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedIds.size === 0}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${selectedIds.size > 0
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Xóa {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                    </button>
                    <button
                        onClick={handleAddClick}
                        className="bg-[var(--primary-color)] text-white hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/30"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Thêm buổi học
                    </button>
                </div>

                {/* Pay Rate Bar */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">Bậc lương:</span>
                    <div className="relative">
                        <select
                            value={currentPayRate}
                            onChange={(e) => handleGlobalPayRateChange(e.target.value)}
                            className="appearance-none font-bold text-sm px-4 py-2 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700 transition-all border-0 text-center w-20"
                        >
                            {PAY_RATES.map((rate) => (
                                <option key={rate} value={rate}>{rate}</option>
                            ))}
                        </select>
                        {/* Custom Arrow because appearance-none removes it */}
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
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
                                                className="rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium">{record.class_id}</td>
                                        <td className="px-4 py-3">{record.grade}</td>
                                        <td className="px-4 py-3">{record.level}</td>
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
                                            <button
                                                onClick={() => updateRecord(record.id, { class_type: record.class_type === "BU" ? "CN" : "BU" })}
                                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${record.class_type === "BU"
                                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                                                    : "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
                                                    }`}
                                            >
                                                {record.class_type}
                                            </button>
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

            {/* Add Record Modal */}
            {isAddModalOpen && (
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
            )}
        </div >
    );
}
