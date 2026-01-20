"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";

export default function CalendarSyncPage() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchToken();
    }, []);

    const fetchToken = async () => {
        setLoading(true);
        const supabase = createClient();

        // Call RPC to get current token or create if missing
        const { data, error } = await supabase.rpc('get_or_create_calendar_token');

        if (error) {
            console.error("Error fetching token:", error);
        } else {
            setToken(data);
        }
        setLoading(false);
    };

    const handleRegenerate = async () => {
        if (!confirm("Bạn có chắc chắn muốn tạo lại link? Link cũ sẽ không còn hoạt động.")) return;

        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase.rpc('regenerate_calendar_token');

        if (error) {
            console.error("Error regenerating token:", error);
            alert("Lỗi khi tạo lại token.");
        } else {
            setToken(data);
        }
        setLoading(false);
    };

    const getCalendarUrl = () => {
        if (!token) return "";
        // Use window.location.origin to get base URL
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}/api/calendar/${token}`;
    };

    const handleCopy = () => {
        const url = getCalendarUrl();
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full px-4 md:px-8 py-6 animate-fade-in pb-20 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8 text-[var(--accent-color)]">Đồng bộ lịch dạy</h1>

            <div className="glass-panel p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-[var(--primary-color)]/10 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>

                    <h2 className="text-xl font-semibold">Đồng bộ với Google Calendar, Outlook, ...</h2>
                    <p className="text-gray-500 text-sm mb-4">
                        Sử dụng đường dẫn bên dưới để thêm lịch dạy vào ứng dụng lịch của bạn.
                        Lịch sẽ tự động cập nhật khi bạn thay đổi thông tin lớp học.
                    </p>

                    {loading ? (
                        <div className="p-4 text-gray-400">Đang tải token...</div>
                    ) : (
                        <div className="w-full bg-gray-50 dark:bg-slate-800 p-4 rounded-lg flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                            <code className="flex-1 text-xs md:text-sm break-all text-gray-600 dark:text-gray-300 font-mono">
                                {getCalendarUrl()}
                            </code>
                            <button
                                onClick={handleCopy}
                                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors relative"
                                title="Sao chép"
                            >
                                {copied ? (
                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                )}
                            </button>
                        </div>
                    )}

                    <div className="mt-6 flex flex-col items-center gap-2 w-full">
                        <div className="text-xs text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20 p-3 rounded-md w-full text-left">
                            <strong>Lưu ý:</strong> Đường dẫn này chứa mã bí mật của bạn. Không chia sẻ nó với người khác.
                            Nếu bạn nghi ngờ mã bị lộ, hãy nhấn nút "Tạo lại Link" bên dưới.
                        </div>

                        <button
                            onClick={handleRegenerate}
                            disabled={loading}
                            className="mt-4 px-4 py-2 text-sm text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition-colors w-full md:w-auto"
                        >
                            Tạo lại Link (Hủy link cũ)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
