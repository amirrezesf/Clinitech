
import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { 
  loginUser, 
  registerUser as registerThunk, 
  installSystem as installThunk, 
  logout as logoutAction, 
  updateProfile as updateProfileThunk 
} from '../store/authSlice';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInstalled: boolean;
  isDoctor: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (user: User) => Promise<boolean>;
  install: (adminUser: User, token: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const dispatch = useAppDispatch();
  
  // Consume Redux state to keep Context in sync with Redux
  const reduxUser = useAppSelector(state => state.auth.user);
  const reduxIsAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const reduxIsInstalled = useAppSelector(state => state.auth.isInstalled);

  const isDoctor = reduxUser?.role === 'doctor';

  // Map legacy Context functions to Redux Thunks and Actions
  const login = async (username: string, password: string): Promise<boolean> => {
    const result = await dispatch(loginUser({ username, password }));
    return loginUser.fulfilled.match(result);
  };

  const register = async (newUser: User): Promise<boolean> => {
     const result = await dispatch(registerThunk(newUser));
     return registerThunk.fulfilled.match(result);
  };

  const install = async (adminUser: User, token: string): Promise<boolean> => {
      const result = await dispatch(installThunk({ adminUser, token }));
      return installThunk.fulfilled.match(result);
  };

  const logout = () => {
    dispatch(logoutAction());
  };

  const updateProfile = (updatedData: Partial<User>) => {
    dispatch(updateProfileThunk(updatedData));
  };

  return (
    <AuthContext.Provider value={{
      user: reduxUser,
      isAuthenticated: reduxIsAuthenticated,
      isInstalled: reduxIsInstalled,
      isDoctor,
      login,
      register,
      install,
      logout,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
