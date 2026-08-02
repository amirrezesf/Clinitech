
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, UserPermissions, PermissionAction, AppModule, UserSettings } from '../types';
import { MOCK_DOCTORS } from '../services/mockData';

const MODULE_FIELDS_CONFIG: Record<AppModule, string[]> = {
    appointments: ['patient_phone', 'appointment_time', 'service_type', 'status_change'],
    patients: ['id_number', 'phone_number', 'medical_history', 'private_notes'],
    finances: ['payment_amount', 'discount_edit', 'receipt_image', 'profit_reports'],
    services: ['price_edit', 'duration_edit', 'service_activation'],
    insurances: ['coverage_percent', 'insurance_name'],
    reports: ['excel_export', 'financial_summary', 'audit_logs']
};

export const createDefaultPermissions = (allTrue = false): UserPermissions => {
    const modules: AppModule[] = ['appointments', 'patients', 'finances', 'services', 'insurances', 'reports'];
    const actions: PermissionAction[] = ['create', 'read', 'update', 'delete'];
    
    const perms = {} as any;
    modules.forEach(m => {
        perms[m] = { fields: {} };
        actions.forEach(a => {
            perms[m][a] = allTrue;
        });
        
        MODULE_FIELDS_CONFIG[m].forEach(f => {
            perms[m].fields[f] = {
                create: allTrue,
                read: allTrue,
                update: allTrue,
                delete: allTrue
            };
        });
    });
    return perms as UserPermissions;
};

export const createDefaultSettings = (): UserSettings => ({
    smsOnNewAppointment: true,
    smsOnCancellation: true,
    showFinancialsOnDashboard: true,
    compactMode: false,
    autoRecognizeHandwriting: false,
    defaultVisitHandwriting: true,
    showVisitStopwatch: true
});

interface AuthState {
  user: User | null;
  secretaries: User[];
  isAuthenticated: boolean;
  isInstalled: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const getInitialUser = (): User | null => {
    const stored = localStorage.getItem('health_ease_user');
    return stored ? JSON.parse(stored) : null;
};

const getInitialSecretaries = (): User[] => {
    const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
    return registered.filter((u: User) => u.role === 'secretary');
};

const getInitialInstallStatus = (): boolean => {
    return localStorage.getItem('health_ease_installed') === 'true';
};

const initialState: AuthState = {
  user: getInitialUser(),
  secretaries: getInitialSecretaries(),
  isAuthenticated: !!getInitialUser(),
  isInstalled: getInitialInstallStatus(),
  status: 'idle',
  error: null,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ username, password }: any, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
    let userToLogin = registeredUsers.find((u: User) => u.username === username && u.password === password);

    if (!userToLogin && username && password) {
        let allowedIds = [1, 2, 3]; 
        userToLogin = {
            username: username,
            fullName: 'کاربر سیستم',
            role: 'doctor', 
            phoneNumber: '09000000000',
            password: password,
            allowedDoctorIds: allowedIds,
            permissions: createDefaultPermissions(true),
            settings: createDefaultSettings()
        };
    }

    if (userToLogin) {
        if (!userToLogin.allowedDoctorIds) {
            userToLogin.allowedDoctorIds = MOCK_DOCTORS.map(d => d.id);
        }
        
        // Force sync structure
        if (!userToLogin.permissions || !userToLogin.permissions.appointments || !userToLogin.permissions.appointments.fields || typeof Object.values(userToLogin.permissions.appointments.fields)[0] === 'boolean') {
             userToLogin.permissions = userToLogin.role === 'doctor' 
                ? createDefaultPermissions(true) 
                : createDefaultPermissions(false);
        }

        if (!userToLogin.settings) {
            userToLogin.settings = createDefaultSettings();
        }

        const userWithToken = { ...userToLogin, token: `mock-jwt-${Date.now()}` };
        localStorage.setItem('health_ease_user', JSON.stringify(userWithToken));
        localStorage.setItem('health_ease_installed', 'true');
        return userWithToken;
    } else {
        return rejectWithValue('نام کاربری یا رمز عبور اشتباه است');
    }
  }
);

export const registerUser = createAsyncThunk(
    'auth/register',
    async (newUser: User, { rejectWithValue }) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
        if (registeredUsers.some((u: User) => u.username === newUser.username)) {
            return rejectWithValue('User already exists');
        }
        if (!newUser.allowedDoctorIds) newUser.allowedDoctorIds = MOCK_DOCTORS.map(d => d.id);
        if (!newUser.permissions) newUser.permissions = newUser.role === 'doctor' ? createDefaultPermissions(true) : createDefaultPermissions(false);
        if (!newUser.settings) newUser.settings = createDefaultSettings();
        registeredUsers.push(newUser);
        localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
        return newUser;
    }
);

export const installSystem = createAsyncThunk(
    'auth/install',
    async ({ adminUser, token }: { adminUser: User, token: string }) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        adminUser.allowedDoctorIds = MOCK_DOCTORS.map(d => d.id);
        adminUser.permissions = createDefaultPermissions(true);
        adminUser.settings = createDefaultSettings();
        const registeredUsers = [adminUser];
        localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
        localStorage.setItem('health_ease_installed', 'true');
        return true;
    }
);

export const updateProfile = createAsyncThunk(
    'auth/updateProfile',
    async (updatedData: Partial<User>, { getState }) => {
        const state = getState() as any;
        const currentUser = state.auth.user;
        if (!currentUser) return null;
        const updatedUser = { ...currentUser, ...updatedData };
        localStorage.setItem('health_ease_user', JSON.stringify(updatedUser));
        const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const index = registeredUsers.findIndex((u: User) => u.username === currentUser.username);
        if (index !== -1) {
            registeredUsers[index] = { ...registeredUsers[index], ...updatedData };
            localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
        }
        return updatedUser;
    }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('health_ease_user');
    },
    clearError: (state) => {
        state.error = null;
    },
    updateSecretary: (state, action: PayloadAction<User>) => {
        const index = state.secretaries.findIndex(s => s.username === action.payload.username);
        if (index !== -1) {
            state.secretaries[index] = action.payload;
            const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
            const dbIndex = registeredUsers.findIndex((u: User) => u.username === action.payload.username);
            if (dbIndex !== -1) {
                registeredUsers[dbIndex] = action.payload;
                localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
            }
        }
    },
    deleteSecretary: (state, action: PayloadAction<string>) => {
        state.secretaries = state.secretaries.filter(s => s.username !== action.payload);
        const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const filtered = registeredUsers.filter((u: User) => u.username !== action.payload);
        localStorage.setItem('registered_users', JSON.stringify(filtered));
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInstalled = true;
        state.secretaries = getInitialSecretaries();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(installSystem.fulfilled, (state) => {
          state.isInstalled = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
          if (action.payload.role === 'secretary') {
              state.secretaries.push(action.payload);
          }
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
          if (action.payload) {
              state.user = action.payload;
          }
      });
  },
});

export const { logout, clearError, updateSecretary, deleteSecretary } = authSlice.actions;
export default authSlice.reducer;
