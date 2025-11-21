import { useContext } from "react";
import { AuthContext, AuthContextValue } from "@/providers/AuthProvider";

/**
 * Custom hook to access authentication context.
 * Must be used within an AuthProvider.
 * 
 * @throws {Error} If used outside of AuthProvider
 * @returns Authentication state and functions
 */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
