import { createContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    avatarThumbnailUrl?: string;
    role?: string;
    bio?: string;
    city?: string;
    age?: number;
}

export interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
    navigateToAuth: (mode?: "login" | "register") => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { data: user, isLoading, refetch } = useQuery<User | null>({
        queryKey: ["/api/users/me"],
        queryFn: async () => {
            const token = localStorage.getItem("accessToken");
            if (!token) return null;

            const response = await fetch("/api/users/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem("accessToken");
                }
                return null;
            }

            return response.json();
        },
        retry: false,
    });

    const login = (token: string) => {
        localStorage.setItem("accessToken", token);
        refetch();
    };

    const logout = () => {
        localStorage.removeItem("accessToken");
        window.location.href = "/auth";
    };

    const navigateToAuth = (mode?: "login" | "register") => {
        if (mode) {
            window.location.href = `/auth?mode=${mode}`;
        } else {
            window.location.href = "/auth";
        }
    };

    const value: AuthContextValue = {
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        navigateToAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
