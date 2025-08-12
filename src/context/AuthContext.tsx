
// src/context/AuthContext.tsx
'use client';

import type { User } from '@/interfaces';
import type { Dispatch, ReactNode, SetStateAction} from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCurrentUser, logoutUser as apiLogout } from '@/lib/api';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: Dispatch<SetStateAction<User | null>>;
  isLoadingAuth: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const processUserData = useCallback((userData: User | null): User | null => {
    if (!userData) return null;

    let profileActuallyCompleted = false;
    if (userData.role === 'Student' && userData.student_profile) {
      profileActuallyCompleted = userData.student_profile.profile_completed ?? false;
    } else if (userData.role === 'Teacher' && userData.teacher_profile) {
      profileActuallyCompleted = userData.teacher_profile.profile_completed ?? false;
    } else if (userData.role === 'Parent' && userData.parent_profile) {
      profileActuallyCompleted = userData.parent_profile.profile_completed ?? false;
    } else if (userData.role === 'Admin') {
      profileActuallyCompleted = true;
    }
    
    // Create a new object to ensure re-render
    return { ...userData, profile_completed: profileActuallyCompleted };
  }, []);
  
  const refreshUser = useCallback(async () => {
    try {
        const rawUserData = await fetchCurrentUser();
        const processedUser = processUserData(rawUserData);
        setCurrentUser(processedUser);
    } catch (error) {
        console.error("Failed to refresh user data:", error);
        logout();
    }
  }, [processUserData]);

  const updateUserAndContext = useCallback((rawUserData: User) => {
    const processedUser = processUserData(rawUserData);
    setCurrentUser(processedUser);
  }, [processUserData]);


  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoadingAuth(true);
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const rawUserData = await fetchCurrentUser();
          if (rawUserData) {
            updateUserAndContext(rawUserData);
          } else {
            logout();
          }
        } catch (error) {
          console.error("Initialization auth error:", error);
          logout();
        }
      }
      setIsLoadingAuth(false);
    };
    initializeAuth();
  }, [updateUserAndContext]);


  const login = async (token: string) => {
    setIsLoadingAuth(true);
    localStorage.setItem('authToken', token);
    try {
      const rawUserData = await fetchCurrentUser();
      if (rawUserData) {
        updateUserAndContext(rawUserData);
      } else {
        throw new Error("Failed to process user data after login.");
      }
    } catch (error) {
        console.error("Login error:", error);
        logout();
        throw error; 
    } finally {
        setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    apiLogout(); 
    setCurrentUser(null);
    window.location.href = '/login'; 
  };


  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      setCurrentUser: updateUserAndContext, // Use the wrapped setter
      isLoadingAuth,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
