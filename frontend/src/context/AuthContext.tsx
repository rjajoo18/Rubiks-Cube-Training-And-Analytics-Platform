import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, login as apiLogin, signup as apiSignup, getCurrentUser } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('rubiks_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          localStorage.removeItem('rubiks_token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('rubiks_token', response.token);
  };

  const signup = async (email: string, password: string, name: string) => {
    const user = await apiSignup(email, password, name);
    const loginResponse = await apiLogin(email, password);
    setToken(loginResponse.token);
    setUser(loginResponse.user);
    localStorage.setItem('rubiks_token', loginResponse.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rubiks_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
