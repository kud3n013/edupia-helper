"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, FormEvent, ChangeEvent } from "react";

interface AuthProps {
    initialView?: 'login' | 'signup';
}

export const Auth = ({ initialView = 'login' }: AuthProps) => {
    const [isSignUp, setIsSignUp] = useState(initialView === 'signup');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [gender, setGender] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                if (!fullName.trim()) {
                    setMessage({ text: "Vui lòng nhập họ và tên!", type: 'error' });
                    setLoading(false);
                    return;
                }

                if (!email.trim()) {
                    setMessage({ text: "Vui lòng nhập email!", type: 'error' });
                    setLoading(false);
                    return;
                }

                if (!gender) {
                    setMessage({ text: "Vui lòng chọn giới tính!", type: 'error' });
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName || email.split('@')[0],
                            gender: gender,
                        },
                    },
                });

                if (error) {
                    setMessage({ text: error.message, type: 'error' });
                } else if (data.user && !data.session) {
                    setMessage({ text: "Tài khoản đã được tạo! Vui lòng kiểm tra email để xác nhận.", type: 'success' });
                } else {
                    setMessage({ text: "Đăng ký thành công! Đang chuyển hướng...", type: 'success' });
                    window.location.href = '/';
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    setMessage({ text: "Đăng nhập thất bại: " + error.message, type: 'error' });
                } else {
                    setMessage({ text: "Đăng nhập thành công! Đang chuyển hướng...", type: 'success' });
                    window.location.href = '/';
                }
            }
        } catch (err) {
            setMessage({ text: "Đã xảy ra lỗi hệ thống.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel w-full max-w-md p-8 shadow-2xl animate-fade-in relative z-10 mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-[var(--primary-color)] mb-2">Edupia Helper</h1>
                <p className="text-[var(--text-secondary)]">
                    {isSignUp ? "Tạo tài khoản mới" : "Đăng nhập để tiếp tục"}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {isSignUp && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-2" htmlFor="fullName">
                                Họ và tên <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                placeholder="Nguyễn Văn A"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Giới tính <span className="text-red-500">*</span></label>
                            <div className="flex gap-4">
                                <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-center gap-2 ${gender === 'male' ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-[var(--primary-color)]'}`}>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="male"
                                        checked={gender === 'male'}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="hidden"
                                    />
                                    <span className="text-lg">♂️</span> Nam
                                </label>
                                <label className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-center gap-2 ${gender === 'female' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-pink-500'}`}>
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="female"
                                        checked={gender === 'female'}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="hidden"
                                    />
                                    <span className="text-lg">♀️</span> Nữ
                                </label>
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-sm font-medium mb-2" htmlFor="email">
                        Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all shadow-sm"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2" htmlFor="password">
                        Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded-lg border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all shadow-sm"
                        required
                    />
                </div>

                {message && (
                    <div className={`p-4 rounded-lg text-sm text-center ${message.type === 'error' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"}`}>
                        {message.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg bg-[var(--primary-color)] text-white font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Đang xử lý..." : (isSignUp ? "Đăng ký" : "Đăng nhập")}
                </button>
            </form>

            <div className="text-center text-sm text-[var(--text-secondary)] mt-4">
                {isSignUp ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
                <button
                    type="button"
                    onClick={() => {
                        setIsSignUp(!isSignUp);
                        setMessage(null);
                    }}
                    className="text-[var(--primary-color)] hover:underline font-semibold bg-transparent border-none cursor-pointer"
                >
                    {isSignUp ? "Đăng nhập ngay" : "Tạo tài khoản mới"}
                </button>
            </div>
        </div>
    );
};
