"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MonthPickerProps {
    value: string; // YYYY-MM
    onChange: (value: string) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial year from value or current year
    const initialYear = value ? parseInt(value.split("-")[0]) : new Date().getFullYear();
    const [year, setYear] = useState(initialYear);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMonthSelect = (monthIndex: number) => {
        // monthIndex is 1-12
        const monthStr = monthIndex.toString().padStart(2, "0");
        onChange(`${year}-${monthStr}`);
        setIsOpen(false);
    };

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const displayValue = value
        ? `Tháng ${value.split("-")[1]}/${value.split("-")[0]}`
        : "Chọn tháng...";

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 text-sm p-2 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-[var(--primary-color)] outline-none cursor-pointer flex justify-between items-center"
            >
                <span className={!value ? "text-gray-400" : ""}>{displayValue}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        transition={{ duration: 0.1 }}
                        className="absolute top-full left-0 mt-1 w-full min-w-[200px] z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3"
                    >
                        {/* Year Selector */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <button
                                onClick={(e) => { e.stopPropagation(); setYear(year - 1); }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <span className="font-bold">{year}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); setYear(year + 1); }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        </div>

                        {/* Months Grid */}
                        <div className="grid grid-cols-4 gap-2">
                            {months.map((m) => {
                                const isSelected = value === `${year}-${m.toString().padStart(2, "0")}`;
                                return (
                                    <button
                                        key={m}
                                        onClick={(e) => { e.stopPropagation(); handleMonthSelect(m); }}
                                        className={`text-xs p-2 rounded transition-colors ${isSelected
                                            ? "bg-[var(--primary-color)] text-white"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        T{m}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Clear Option */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onChange(""); setIsOpen(false); }}
                            className="w-full mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-red-500 hover:text-red-600 block text-center"
                        >
                            Bỏ chọn
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
