"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LoginRequirementModal } from "./LoginRequirementModal";

export function Sidebar({ isAuthenticated }: { isAuthenticated: boolean }) {
    const pathname = usePathname();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isPinned, setIsPinned] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    // Update the CSS variable for layout spacing
    useEffect(() => {
        const root = document.documentElement;
        if (isPinned) {
            root.style.setProperty("--sidebar-width", "80px");
        } else {
            root.style.setProperty("--sidebar-width", "0px");
        }
    }, [isPinned]);

    const navItems = [
        { name: "Trang chủ", path: "/", icon: <HomeIcon /> },
        { name: "Buổi học", path: "/lesson", icon: <BookOpen />, protected: true },
        { name: "Sổ dạy", path: "/records", icon: <ClipboardList />, protected: true },
        { name: "Lớp CN", path: "/classes", icon: <UsersIcon />, protected: true },
    ];

    const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
        if (item.protected && !isAuthenticated) {
            e.preventDefault();
            setShowLoginModal(true);
        }
    };

    return (
        <>
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`fixed right-0 top-0 h-full w-[80px] bg-[var(--glass-bg)] backdrop-blur-md border-l border-[var(--glass-border)] flex flex-col items-center py-8 z-50 transition-transform duration-300 shadow-[var(--shadow-custom-lg)] 
                max-sm:bottom-0 max-sm:top-auto max-sm:h-[60px] max-sm:w-full max-sm:flex-row max-sm:border-l-0 max-sm:border-t max-sm:justify-around max-sm:py-0 max-sm:translate-x-0
                ${!isPinned && !isHovered ? "translate-x-[calc(100%-16px)]" : "translate-x-0"}
                `}
            >
                <div className="w-full h-full flex flex-col items-center justify-between pointer-events-auto">
                    <nav className="flex flex-col gap-6 w-full items-center max-sm:flex-row max-sm:justify-around max-sm:h-full">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            const isProtectedAction = item.protected && !isAuthenticated;

                            return (
                                <Link
                                    key={item.path}
                                    href={isProtectedAction ? "#" : item.path}
                                    onClick={(e) => handleNavClick(e, item)}
                                    className={`p-3 rounded-[var(--radius-md)] flex flex-col items-center justify-center transition-all duration-300 relative group
                                    ${isActive
                                            ? "bg-[var(--primary-color)] text-white shadow-lg shadow-indigo-500/30 scale-110"
                                            : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--primary-color)]"
                                        }`}
                                    title={item.name}
                                >
                                    {item.icon}
                                    <span className="sr-only">{item.name}</span>

                                    {/* Tooltip for desktop */}
                                    <span className="absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none max-sm:hidden">
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsPinned(!isPinned)}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors max-sm:hidden mb-4"
                        title={isPinned ? "Collapse Sidebar" : "Pin Sidebar"}
                    >
                        {isPinned ? <ChevronsRight /> : <ChevronsLeft />}
                    </button>
                </div>
            </aside>

            <LoginRequirementModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </>
    );
}

function HomeIcon() {
    return (
        <svg suppressHydrationWarning xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function BookOpen() {
    return (
        <svg suppressHydrationWarning xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    );
}

function ClipboardList() {
    return (
        <svg suppressHydrationWarning xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4" />
            <path d="M12 16h4" />
            <path d="M8 11h.01" />
            <path d="M8 16h.01" />
        </svg>
    );
}

function ChevronsRight() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
        </svg>
    )
}

function ChevronsLeft() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
        </svg>
    )
}

function UsersIcon() {
    return (
        <svg suppressHydrationWarning xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
