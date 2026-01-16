"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PAY_RATES = ["S+", "A+", "B+", "C+", "D"];

export function PayRateSelector({ initialRate }: { initialRate?: string }) {
    const [rate, setRate] = useState(initialRate || "B+");
    const [updating, setUpdating] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (initialRate) setRate(initialRate);
    }, [initialRate]);

    const handleChange = async (newRate: string) => {
        if (updating) return; // Prevent double clicks
        setRate(newRate);
        setUpdating(true);

        try {
            const { error } = await supabase.rpc('update_global_pay_rate', { new_rate: newRate });
            if (error) throw error;

            router.refresh(); // Refresh server components
        } catch (err) {
            console.error("Failed to update global pay rate:", err);
            // Optionally revert UI or show toast
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm self-start mt-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 pl-2">Bậc lương:</span>
            <div className="relative">
                <select
                    value={rate}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={updating}
                    className="appearance-none font-bold text-sm px-4 py-1.5 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-white dark:bg-gray-700 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-600 transition-all border border-gray-200 dark:border-gray-600 text-center w-20 disabled:opacity-50"
                >
                    {PAY_RATES.map((r) => (
                        <option key={r} value={r} className="bg-white dark:bg-gray-800">{r}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg className={`w-4 h-4 text-gray-500 ${updating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {updating ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        )}
                    </svg>
                </div>
            </div>
        </div>
    );
}
