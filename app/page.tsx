import { createClient } from "@/utils/supabase/server";
import { signOut } from "./auth/login/actions";
import Link from "next/link";
import { HomeMenu } from "@/components/HomeMenu";
import { PayRateSelector } from "@/components/PayRateSelector";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* Fetch Profile for Pay Rate */
  let profile = null;
  if (user) {
    // Check if profiles table exists and has data, otherwise we use default
    // We assume profiles table exists based on previous context, but let's be safe
    // Actually, usually we might joining query, but separate fetch is fine for now
    const { data } = await supabase.from('profiles').select('pay_rate').eq('id', user.id).single();
    profile = data;
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <header className="text-center mb-8">
        <div className="flex justify-center items-center gap-4 mb-2 relative">
          <h1 className="text-[2.5rem] font-bold text-[var(--primary-color)] shadow-sm leading-tight drop-shadow-sm">
            Edupia Helper
          </h1>
        </div>
        <p className="text-[var(--text-secondary)] text-[1.1rem]">
          Công cụ hỗ trợ giáo viên Edupia tạo nhận xét nhanh chóng
        </p>
      </header>

      {/* User Card or Auth Actions */}
      <div className="flex flex-col items-center mb-12 gap-4">
        {user ? (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center gap-6 max-w-lg w-full animate-fade-in relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-color)]/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-purple-500 p-[2px] shadow-lg">
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {user.user_metadata.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-[var(--primary-color)] to-purple-500">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm"></div>
              </div>

              <div className="flex-1 min-w-0 z-10">
                <h3 className="text-lg font-bold truncate text-[var(--text-main)] flex items-center gap-2">
                  {user.user_metadata.full_name || "Xin chào!"}
                  {user.user_metadata.gender === 'male' && <span className="text-blue-500 text-base" title="Nam">♂️</span>}
                  {user.user_metadata.gender === 'female' && <span className="text-pink-500 text-base" title="Nữ">♀️</span>}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] truncate">
                  {user.email}
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                  <form action={signOut}>
                    <button className="px-4 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-2 hover:shadow-md">
                      <svg suppressHydrationWarning xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                      Đăng xuất
                    </button>
                  </form>
                  {/* Pay Rate Selector Inside Card */}
                  <div className="-mt-2">
                    <PayRateSelector initialRate={profile?.pay_rate || 'B+'} />
                  </div>
                </div>
              </div>
            </div>


          </div>
        ) : (
          <div className="flex gap-4">
            <Link
              href="/auth/login"
              className="px-6 py-3 rounded-full bg-[var(--primary-color)] text-white font-semibold shadow-lg hover:shadow-[var(--primary-color)]/30 hover:-translate-y-1 transition-all"
            >
              Đăng nhập
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 rounded-full border border-[var(--primary-color)] text-[var(--primary-color)] font-semibold hover:bg-[var(--primary-color)]/10 transition-all"
            >
              Tạo tài khoản
            </Link>
          </div>
        )}
      </div>

      <HomeMenu isAuthenticated={!!user} />
    </div>
  );
}
