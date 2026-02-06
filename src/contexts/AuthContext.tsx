import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole, RolePermissions } from '../lib/database.types';

interface UserWithRole extends User {
  role?: UserRole;
  permissions?: RolePermissions;
}

interface AuthContextType {
  user: UserWithRole | null;
  role: UserRole;
  permissions: RolePermissions | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  isOfficer: boolean;
  isAdmin: boolean;
}

const defaultPermissions: RolePermissions = {
  role: 'citizen',
  can_create_report: true,
  can_view_all_reports: true,
  can_update_any_report: false,
  can_delete_report: false,
  can_assign_reports: false,
  can_manage_users: false,
  can_view_analytics: false,
  can_manage_sla: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [role, setRole] = useState<UserRole>('citizen');
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      // Get user's role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching role:', roleError);
      }

      const userRole = (roleData?.role as UserRole) || 'citizen';
      setRole(userRole);

      // Get permissions for this role
      const { data: permData, error: permError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', userRole)
        .single();

      if (permError && permError.code !== 'PGRST116') {
        console.error('Error fetching permissions:', permError);
      }

      setPermissions(permData as RolePermissions || defaultPermissions);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('citizen');
      setPermissions(defaultPermissions);
    }
  }, []);

  const refreshRole = useCallback(async () => {
    if (user?.id) {
      await fetchUserRole(user.id);
    }
  }, [user?.id, fetchUserRole]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserRole(currentUser.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserRole(currentUser.id);
      } else {
        setRole('citizen');
        setPermissions(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Auto-assign citizen role after signup
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role: 'citizen' });

      if (roleError) {
        console.error('Error assigning citizen role:', roleError);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasPermission = useCallback((permission: keyof RolePermissions): boolean => {
    if (!permissions) return false;
    const value = permissions[permission];
    return typeof value === 'boolean' ? value : false;
  }, [permissions]);

  const isOfficer = role === 'ward_officer' || role === 'dept_admin' || role === 'city_admin';
  const isAdmin = role === 'dept_admin' || role === 'city_admin';

  return (
    <AuthContext.Provider value={{
      user,
      role,
      permissions,
      loading,
      signIn,
      signUp,
      signOut,
      refreshRole,
      hasPermission,
      isOfficer,
      isAdmin
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
