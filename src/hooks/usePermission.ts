import { useAppSelector } from '@/hooks/useAppSelector';

/**
 * Mirrors the backend's `authorize(permission)` gate (shared/src/middlewares/authorize.ts)
 * so the same capability strings (e.g. 'identity:admin', 'kyc:approve') gate UI here too.
 * Backed by `user.permissions` from GET /auth/me — not the legacy `role` field, which the
 * backend no longer returns on login.
 */
export const usePermission = () => {
  const permissions =
    useAppSelector(state => state.auth.user?.permissions) ?? [];

  const can = (permission: string): boolean => permissions.includes(permission);

  return { permissions, can };
};
