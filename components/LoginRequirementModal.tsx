"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface LoginRequirementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginRequirementModal({ isOpen, onClose }: LoginRequirementModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 transform transition-all scale-100 relative border border-gray-200 dark:border-gray-700">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div className="text-center">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--primary-color)]"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
                    </div>

                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">Yêu cầu đăng nhập</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Bạn cần đăng nhập để sử dụng tính năng này.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Để sau
                        </button>
                        <Link
                            href="/auth/login"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary-color)] text-white font-medium hover:bg-[var(--primary-hover)] transition-colors text-center shadow-lg shadow-indigo-500/20"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
