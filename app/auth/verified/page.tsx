"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function VerifiedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] p-4 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="glass-panel p-8 text-center overflow-hidden">
                    {/* Success Icon Animation */}
                    <div className="flex justify-center mb-6">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 20,
                                delay: 0.2,
                            }}
                            className="w-20 h-20 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
                        >
                            <svg
                                className="w-10 h-10 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <motion.path
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.5, delay: 0.5 }}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h1 className="text-3xl font-bold text-[var(--text-main)] mb-3">
                            Xác thực thành công!
                        </h1>
                        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                            Tài khoản của bạn đã được xác minh. <br />
                            Bây giờ bạn có thể đăng nhập và bắt đầu sử dụng.
                        </p>
                    </motion.div>

                    <div className="flex flex-col gap-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Link
                                href="/auth/login"
                                className="w-full inline-flex justify-center items-center py-3.5 px-6 rounded-xl text-white font-semibold bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                            >
                                Đăng nhập ngay
                            </Link>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <Link
                                href="/"
                                className="w-full inline-flex justify-center items-center py-3.5 px-6 rounded-xl text-[var(--text-main)] font-medium bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-colors duration-200"
                            >
                                Về trang chủ
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
