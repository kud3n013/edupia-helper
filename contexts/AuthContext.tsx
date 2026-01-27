"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Check active session first
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);
            } catch (error) {
                console.error("Error checking auth session:", error);
            } finally {
                setLoading(false);
            }

            // Listen for changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                (_event, session) => {
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            );

            return () => subscription.unsubscribe();
        };

        initializeAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
