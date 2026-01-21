"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useState, useEffect } from "react";

export interface ClassRecord {
    id: string;
    user_id: string;
    fixed_class_id: string;
    grade: number;
    level: string;
    state: "Đang dạy" | "Kết thúc";
    num_students: number;
    students: string[];
    schedule: string[];
    time: string;
    num_finished_lessons: number;
    finished_lessons: string[];
}

interface AgendaViewProps {
    classes: ClassRecord[];
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    compact?: boolean;
}

const SCHEDULE_OPTIONS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export const AgendaView = ({ classes, selectedIds, onToggleSelect, compact = false }: AgendaViewProps) => {
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const startHour = 18;
    const totalHours = 4; // 22 - 18
    const hourHeight = 100; // px per hour

    // Responsive grid: 1 col + spacer on mobile, 7 cols + spacer on desktop
    const gridCols = "grid-cols-[60px_1fr] md:grid-cols-[60px_repeat(7,1fr)]";

    const now = new Date();
    // getDay() returns 0 for Sunday, which matches our 'days' array index 0
    const currentDayIndex = now.getDay();
    const currentDayStr = days[currentDayIndex];

    const [activeDayIdx, setActiveDayIdx] = useState(currentDayIndex);

    const handlePrevDay = () => {
        setActiveDayIdx((prev) => (prev - 1 + 7) % 7);
    };

    const handleNextDay = () => {
        setActiveDayIdx((prev) => (prev + 1) % 7);
    };

    const parseTime = (timeStr: string) => {
        if (!timeStr) return null;
        const match = timeStr.match(/(\d+)[:h](\d+)?/);
        if (!match) return null;
        const h = parseInt(match[1]);
        const m = match[2] ? parseInt(match[2]) : 0;
        return h + m / 60;
    };

    const getLevelColor = (level: string) => {
        const l = (level || "").toLowerCase();
        if (l.includes("giỏi") || l === "a") return "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800";
        if (l.includes("khá") || l === "b") return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
        if (l.includes("trung bình") || l === "c") return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
        if (l.includes("yếu") || l === "d") return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800";
        return "text-gray-600 bg-gray-50 dark:bg-gray-800/50 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
    };

    return (
        <div className="glass-panel p-4 border border-gray-200 dark:border-gray-700 rounded-xl relative z-0">
            <div className={`grid ${gridCols} gap-4`}>
                <div className="col-span-1"></div>
                {days.map((day, idx) => (
                    <div
                        key={day}
                        className={`col-span-1 text-center font-bold py-2 border-b border-gray-200 dark:border-gray-700 ${idx !== activeDayIdx ? "hidden md:block" : ""
                            } ${day === currentDayStr
                                ? "text-[var(--primary-color)] bg-[var(--primary-color)]/5 rounded-t-lg"
                                : "text-gray-600 dark:text-gray-300"
                            }`}
                    >
                        {/* Mobile Navigation Header */}
                        <div className="flex md:block justify-between items-center">
                            <button onClick={handlePrevDay} className="md:hidden p-1 text-gray-400 hover:text-[var(--primary-color)]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <span>{day}</span>
                            <button onClick={handleNextDay} className="md:hidden p-1 text-gray-400 hover:text-[var(--primary-color)]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="relative mt-2" style={{ height: `${totalHours * hourHeight}px` }}>
                <div className="absolute inset-0 pointer-events-none">
                    {[18, 19, 20, 21, 22].map((h, i) => (
                        <div key={h} className={`absolute w-full grid ${gridCols} gap-4`} style={{ top: `${i * hourHeight}px` }}>
                            <div className="col-span-1 text-right pr-2 transform -translate-y-1/2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {h}:00
                                </span>
                            </div>
                            <div className="col-span-1 md:col-span-7 border-t border-dashed border-gray-200 dark:border-gray-700/50 mt-[1px]"></div>
                        </div>
                    ))}
                </div>

                <div className={`grid ${gridCols} gap-4 h-full absolute inset-0`}>
                    <div className="col-span-1"></div>
                    {days.map((day, idx) => (
                        <div
                            key={day}
                            className={`col-span-1 relative h-full z-10 ${idx !== activeDayIdx ? "hidden md:block" : ""
                                } ${day === currentDayStr ? "bg-[var(--primary-color)]/5 rounded-b-lg" : ""
                                }`}
                        >
                            {classes.filter(c => c.schedule.includes(day)).map(c => {
                                const timeVal = parseTime(c.time);
                                if (timeVal === null || timeVal < startHour || timeVal > startHour + totalHours) return null;

                                const top = (timeVal - startHour) * hourHeight;
                                const height = 0.75 * hourHeight; // 45 mins

                                const isSelected = selectedIds?.has(c.id);

                                return (
                                    <div
                                        key={`${c.id}-${day}`}
                                        className="absolute w-full px-1"
                                        style={{ top: `${top}px`, height: `${height}px` }}
                                    >
                                        <div
                                            onClick={() => onToggleSelect && onToggleSelect(c.id)}
                                            className={`w-full h-full transition-colors rounded-lg p-1 flex flex-col justify-between items-center shadow-sm hover:shadow-md cursor-pointer group overflow-hidden relative border ${isSelected
                                                ? "bg-[var(--primary-color)]/30 border-[var(--primary-color)] shadow-md"
                                                : "bg-[var(--primary-color)]/10 border-[var(--primary-color)]/30 hover:bg-[var(--primary-color)]/20"
                                                }`}
                                        >
                                            {/* Selection Checkbox */}
                                            {onToggleSelect && selectedIds && (
                                                <div className={`absolute bottom-2 left-2 z-20 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="appearance-none w-4 h-4 rounded-full border-2 border-gray-300 checked:bg-[var(--primary-color)] checked:border-[var(--primary-color)] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22white%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%224%22%20d%3D%22M5%2013l4%204L19%207%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:70%] cursor-pointer transition-all"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            onToggleSelect(c.id);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            )}

                                            <div className="flex flex-col items-center justify-center flex-1 w-full -mt-1">
                                                <div className="font-bold text-sm text-[var(--primary-color)] truncate w-full text-center mb-0.5">{c.fixed_class_id}</div>
                                                {!compact && (
                                                    <div className="flex items-center justify-center gap-2 w-full">
                                                        <div className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400" title={`${c.num_students} học sinh`}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                            <span>{c.num_students}</span>
                                                        </div>
                                                        <div className={`text-[10px] font-bold px-1.5 rounded ${getLevelColor(c.level)}`} title={`Trình độ ${c.level}`}>
                                                            {c.level}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const supabase = createClient();
                                                    // Call the RPC to reset the draft
                                                    await supabase.rpc('reset_lesson_draft');

                                                    // Calculate next lesson number
                                                    let nextLessonNum = 1;
                                                    if (c.finished_lessons && c.finished_lessons.length > 0) {
                                                        const lessonNums = c.finished_lessons
                                                            .map(l => parseInt(l))
                                                            .filter(n => !isNaN(n));
                                                        if (lessonNums.length > 0) {
                                                            nextLessonNum = Math.max(...lessonNums) + 1;
                                                        }
                                                    }
                                                    // Pad with zero if needed (though usually lesson numbers in URL like -1, -35 work fine, 
                                                    // keeping it simple integer is fine, or pad if format was -01)
                                                    // The user said: "if latest number is 34, the next one would be 35"
                                                    // So no forced padding explicitly mentioned for >9, but consistency might be nice.
                                                    // Let's stick to simple integer as requested: "latest lesson number + 1"

                                                    // Navigate manually
                                                    window.location.href = `/lesson?classId=${c.fixed_class_id}-${nextLessonNum}`;
                                                }}
                                                className="text-[10px] bg-white/80 dark:bg-black/40 text-[var(--primary-color)] rounded-full px-3 py-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--primary-color)] hover:text-white font-semibold shadow-sm backdrop-blur-sm transform hover:scale-105 z-30 relative"
                                            >
                                                Feedback
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
