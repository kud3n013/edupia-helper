"use client";

import Link from "next/link";
import { useState } from "react";
import { LoginRequirementModal } from "./LoginRequirementModal";

export function HomeMenu({ isAuthenticated }: { isAuthenticated: boolean }) {
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        if (!isAuthenticated) {
            e.preventDefault();
            setShowLoginModal(true);
        }
    };

    return (
        <>
            <div className="flex justify-center items-center min-h-[40vh] gap-8 flex-wrap">
                <Link
                    href={isAuthenticated ? "/lesson" : "#"}
                    onClick={handleClick}
                    className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-8 text-[var(--text-main)] w-[300px] flex flex-col items-center text-center transition-all duration-300 shadow-[var(--shadow-custom-lg)] hover:-translate-y-[5px] hover:bg-white/90 dark:hover:bg-slate-800/90 hover:border-[var(--primary-color)] group"
                >
                    <svg
                        suppressHydrationWarning
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-16 h-16 stroke-[var(--primary-color)] mb-4"
                    >
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    <h2 className="mb-2 text-[var(--primary-color)] text-xl font-bold">
                        Nhận xét buổi học
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm">
                        Tạo báo cáo tổng kết buổi học, nhận xét từng học sinh và nhắc nhở BTVN.
                    </p>
                </Link>

                <Link
                    href={isAuthenticated ? "/records" : "#"}
                    onClick={handleClick}
                    className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-8 text-[var(--text-main)] w-[300px] flex flex-col items-center text-center transition-all duration-300 shadow-[var(--shadow-custom-lg)] hover:-translate-y-[5px] hover:bg-white/90 dark:hover:bg-slate-800/90 hover:border-[var(--primary-color)] group"
                >
                    <svg
                        suppressHydrationWarning
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-16 h-16 stroke-[var(--primary-color)] mb-4"
                    >
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <path d="M12 11h4" />
                        <path d="M12 16h4" />
                        <path d="M8 11h.01" />
                        <path d="M8 16h.01" />
                    </svg>
                    <h2 className="mb-2 text-[var(--primary-color)] text-xl font-bold">
                        Quản lý buổi học
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm">
                        Xem lịch sử, tính lương, và quản lý các buổi dạy.
                    </p>
                </Link>
            </div>

            <LoginRequirementModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </>
    );
}
