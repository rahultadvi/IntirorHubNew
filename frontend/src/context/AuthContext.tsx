import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";
import type { AuthUser } from "../services/api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: AuthUser) => void;
  refresh: () => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  uploadCompanyLogo: (file: File) => Promise<void>; 
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readStoredUser = (): AuthUser | null => {
  const stored = localStorage.getItem("authUser");
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch (error) {
    console.warn("Unable to parse authUser from storage", error);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("authToken"));
  const initialUser = useMemo(() => readStoredUser(), []);
  const [user, setUser] = useState<AuthUser | null>(() => initialUser);
  const [loading, setLoading] = useState<boolean>(() => Boolean(token) && !initialUser);

  const persistToken = (value: string | null) => {
    if (value) {
      localStorage.setItem("authToken", value);
    } else {
      localStorage.removeItem("authToken");
    }
  };

  const persistUser = (value: AuthUser | null) => {
    if (value) {
      localStorage.setItem("authUser", JSON.stringify(value));
    } else {
      localStorage.removeItem("authUser");
    }
  };

  const clearSession = () => {
    persistToken(null);
    persistUser(null);
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = () => {
      clearSession();
      // Redirect to login page
      window.location.href = '/login';
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      const shouldShowLoader = !user;
      if (shouldShowLoader) {
        setLoading(true);
      }

      try {
        const profile = await authApi.me(token);
        if (cancelled) {
          return;
        }

        setUser(profile.user);
        persistUser(profile.user);
      } catch (error) {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    hydrate();
    // Poll company status periodically so already-logged-in users get updated payment status
    const interval = setInterval(async () => {
      try {
        const profile = await authApi.me(token);
        if (profile && profile.user) {
          setUser(profile.user);
          persistUser(profile.user);
        }
      } catch (e) {
        // If session expired, clear session
        if (e instanceof Error && e.message.includes('Session expired')) {
          clearSession();
        }
        // ignore other polling errors
      }
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // We intentionally omit user from dependencies to avoid refetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setSession = (nextToken: string, nextUser: AuthUser) => {
    persistToken(nextToken);
    persistUser(nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setLoading(false);
  };

  const refresh = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    try {
      const profile = await authApi.me(token);
      setUser(profile.user);
      persistUser(profile.user);
      
    } catch (error) {
      clearSession();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
  };


  const updateProfile = async (data: Partial<AuthUser>) => {
  if (!token) throw new Error("Not authenticated");

  setLoading(true);
  try {
    const res = await authApi.updateProfile(token, data);
    const updatedUser = res.user;

    setUser(updatedUser);
    persistUser(updatedUser);
  } catch (error) {
    console.error("Profile update failed:", error);
    throw error;
  } finally {
    setLoading(false);
  }
};

const uploadCompanyLogo = async (file: File) => {
  if (!token) throw new Error("Not authenticated");

  setLoading(true);
  try {
    const formData = new FormData();
    formData.append("logo", file);

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/admin/company/upload-logo`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Logo upload failed");
    }

    if (user) {
      const updatedUser = {
        ...user,
        companyLogo: data.logo,
      };
      setUser(updatedUser);
      persistUser(updatedUser);
    }

  } catch (err) {
    console.error("Upload company logo error:", err);
    throw err;
  } finally {
    setLoading(false);
  }
};

  
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      setSession,
      refresh,
      logout,
      updateProfile,
      uploadCompanyLogo,  
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
