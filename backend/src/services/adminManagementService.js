import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../firebaseAdmin.js";

const roles = new Set(["super_admin", "event_admin"]);

function adminRole(user) {
  if (user.customClaims?.admin !== true) return null;
  return user.customClaims.adminRole === "event_admin"
    ? "event_admin"
    : "super_admin";
}

function publicAdmin(user) {
  return {
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    role: adminRole(user),
    createdAt: user.customClaims?.adminAddedAt || user.metadata.creationTime || null,
    disabled: user.disabled,
  };
}

async function listAllUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function activeSuperAdmins(auth) {
  const users = await listAllUsers(auth);
  return users.filter((user) => !user.disabled && adminRole(user) === "super_admin");
}

function managementError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function listAdministrators() {
  const auth = getAuth(getFirebaseAdminApp());
  const users = await listAllUsers(auth);
  return users
    .filter((user) => adminRole(user))
    .map(publicAdmin)
    .sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
}

export async function addAdministrator({ email, role }) {
  if (!roles.has(role)) {
    throw managementError(400, "Choose Super Admin or Event Admin.");
  }
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw managementError(400, "Enter a valid Google account email address.");
  }

  const auth = getAuth(getFirebaseAdminApp());
  let user;
  try {
    user = await auth.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw managementError(
        404,
        "That account is not registered yet. Ask the person to sign in with Google once, then add them.",
      );
    }
    throw error;
  }

  if (adminRole(user)) {
    throw managementError(409, "This account is already an administrator.");
  }

  const adminAddedAt = new Date().toISOString();
  await auth.setCustomUserClaims(user.uid, {
    ...user.customClaims,
    admin: true,
    adminRole: role,
    adminAddedAt,
  });
  await auth.revokeRefreshTokens(user.uid);
  return publicAdmin({
    ...user,
    customClaims: {
      ...user.customClaims,
      admin: true,
      adminRole: role,
      adminAddedAt,
    },
  });
}

export async function updateAdministrator(uid, actorUid, changes) {
  if (uid === actorUid) {
    throw managementError(400, "You cannot change your own administrator access.");
  }
  const hasRole = Object.hasOwn(changes, "role");
  const hasDisabled = Object.hasOwn(changes, "disabled");
  if (!hasRole && !hasDisabled) {
    throw managementError(400, "Provide an administrator role or account status change.");
  }
  if (hasRole && !roles.has(changes.role)) {
    throw managementError(400, "Choose Super Admin or Event Admin.");
  }
  if (hasDisabled && typeof changes.disabled !== "boolean") {
    throw managementError(400, "Account status must be active or deactivated.");
  }

  const auth = getAuth(getFirebaseAdminApp());
  const user = await auth.getUser(uid).catch((error) => {
    if (error.code === "auth/user-not-found") {
      throw managementError(404, "Administrator account was not found.");
    }
    throw error;
  });
  const currentRole = adminRole(user);
  if (!currentRole) {
    throw managementError(404, "Administrator account was not found.");
  }

  const nextRole = hasRole ? changes.role : currentRole;
  const nextDisabled = hasDisabled ? changes.disabled : user.disabled;
  const losesActiveSuperAccess =
    currentRole === "super_admin" &&
    (nextRole !== "super_admin" || nextDisabled);
  if (losesActiveSuperAccess) {
    const superAdmins = await activeSuperAdmins(auth);
    if (superAdmins.length <= 1) {
      throw managementError(409, "The last active Super Admin cannot be demoted or deactivated.");
    }
  }

  await auth.setCustomUserClaims(uid, {
    ...user.customClaims,
    admin: true,
    adminRole: nextRole,
  });
  if (hasDisabled) await auth.updateUser(uid, { disabled: nextDisabled });
  await auth.revokeRefreshTokens(uid);
  return publicAdmin({
    ...user,
    disabled: nextDisabled,
    customClaims: { ...user.customClaims, admin: true, adminRole: nextRole },
  });
}

export async function removeAdministrator(uid, actorUid) {
  if (uid === actorUid) {
    throw managementError(400, "You cannot remove your own administrator access.");
  }
  const auth = getAuth(getFirebaseAdminApp());
  const user = await auth.getUser(uid).catch((error) => {
    if (error.code === "auth/user-not-found") {
      throw managementError(404, "Administrator account was not found.");
    }
    throw error;
  });
  const currentRole = adminRole(user);
  if (!currentRole) throw managementError(404, "Administrator account was not found.");

  if (currentRole === "super_admin" && !user.disabled) {
    const superAdmins = await activeSuperAdmins(auth);
    if (superAdmins.length <= 1) {
      throw managementError(409, "The last active Super Admin cannot be removed.");
    }
  }

  const remainingClaims = { ...user.customClaims };
  delete remainingClaims.admin;
  delete remainingClaims.adminRole;
  delete remainingClaims.adminAddedAt;
  await auth.setCustomUserClaims(
    uid,
    Object.keys(remainingClaims).length ? remainingClaims : null,
  );
  await auth.revokeRefreshTokens(uid);
  return { uid, removed: true };
}
