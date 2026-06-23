import { DEFAULT_GROUPS } from '../permissions';
import { User } from '../types';

const getPermissionGroup = (user: User | null | undefined) => {
  if (!user) return null;
  const groupId = user.groupId || user.role;
  return DEFAULT_GROUPS.find(group => group.id === groupId) || null;
};

export const getUserEffectivePermissions = (user: User | null | undefined): Set<string> => {
  if (!user) return new Set();

  const group = getPermissionGroup(user);
  const permissions = new Set(group?.permissions || []);
  const granted = user.permissionOverrides?.granted || [];
  const revoked = new Set(user.permissionOverrides?.revoked || []);

  granted.forEach(key => permissions.add(key));
  revoked.forEach(key => permissions.delete(key));

  return permissions;
};

export const hasPermission = (user: User | null | undefined, key: string): boolean => {
  return getUserEffectivePermissions(user).has(key);
};
