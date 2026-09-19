export function can(
  user,
  permission
) {
  if (!user) {
    return false;
  }

  if (
    user.permissions?.includes("*")
  ) {
    return true;
  }

  return user.permissions?.includes(
    permission
  );
}

export function canAny(
  user,
  permissions
) {
  return permissions.some(
    (permission) =>
      can(user, permission)
  );
}

export function canAll(
  user,
  permissions
) {
  return permissions.every(
    (permission) =>
      can(user, permission)
  );
}