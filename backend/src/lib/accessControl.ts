/**
 * Shared access-control helpers for mediator and arbitrator route guards.
 *
 * Centralises the ADMIN_STELLAR_PUBKEYS check so every controller and service
 * reads the allowlist from the same place rather than duplicating the parsing
 * logic inline.
 *
 * Also hosts the cooperative membership role checks used by the cooperative
 * routes and by trade creation on behalf of a cooperative.
 */

import { env } from "../config/env";

function adminPubkeysRaw(): string {
  return process.env.ADMIN_STELLAR_PUBKEYS ?? env.ADMIN_STELLAR_PUBKEYS ?? "";
}

/** Returns the set of mediator/arbitrator addresses from the environment. */
export function getMediatorAllowlist(): Set<string> {
  return new Set(
    adminPubkeysRaw()
      .split(",")
      .map((a: string) => a.trim())
      .filter(Boolean)
  );
}

/** Case-normalized admin allowlist for services that compare lowercase addresses. */
export function getAdminAllowlistLowercase(): Set<string> {
  return new Set(
    adminPubkeysRaw()
      .split(",")
      .map((a: string) => a.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Returns true when `address` appears in the ADMIN_STELLAR_PUBKEYS allowlist. */
export function isMediatorAddress(address: string): boolean {
  return getMediatorAllowlist().has(address);
}

/** Cooperative membership roles, ordered from most to least privileged. */
export const COOPERATIVE_ROLES = ["OWNER", "MANAGER", "MEMBER"] as const;

export type CooperativeRole = (typeof COOPERATIVE_ROLES)[number];

/** Roles allowed to invite, accept, or remove cooperative members. */
export const COOPERATIVE_MANAGEMENT_ROLES: readonly CooperativeRole[] = [
  "OWNER",
  "MANAGER",
];

/** Roles allowed to create trades on behalf of a cooperative. */
export const COOPERATIVE_TRADE_ROLES: readonly CooperativeRole[] = [
  "OWNER",
  "MANAGER",
];

/** Returns true when `role` is a known cooperative membership role. */
export function isCooperativeRole(role: string): role is CooperativeRole {
  return (COOPERATIVE_ROLES as readonly string[]).includes(role);
}

/** Returns true when `role` may manage cooperative membership. */
export function canManageCooperativeMembers(role: string): boolean {
  return (COOPERATIVE_MANAGEMENT_ROLES as readonly string[]).includes(role);
}

/** Returns true when `role` may create trades on behalf of a cooperative. */
export function canCreateCooperativeTrade(role: string): boolean {
  return (COOPERATIVE_TRADE_ROLES as readonly string[]).includes(role);
}

/**
 * Resolves the caller's role within a cooperative from a membership list.
 * Returns null when the caller is not a member.
 */
export function resolveCooperativeRole(
  members: ReadonlyArray<{ userId: string; role: string }>,
  userId: string
): CooperativeRole | null {
  const membership = members.find((m) => m.userId === userId);
  if (!membership || !isCooperativeRole(membership.role)) {
    return null;
  }
  return membership.role;
}

/**
 * Returns true when `userId` holds a role in `cooperativeId` that permits
 * managing membership (invite/accept/remove).
 */
export function isCooperativeManager(
  members: ReadonlyArray<{ userId: string; role: string }>,
  userId: string
): boolean {
  const role = resolveCooperativeRole(members, userId);
  return role !== null && canManageCooperativeMembers(role);
}

/**
 * Returns true when `userId` holds a role in `cooperativeId` that permits
 * creating trades on behalf of the cooperative.
 */
export function canActOnBehalfOfCooperative(
  members: ReadonlyArray<{ userId: string; role: string }>,
  userId: string
): boolean {
  const role = resolveCooperativeRole(members, userId);
  return role !== null && canCreateCooperativeTrade(role);
}

/**
 * A member's consent for a cooperative agent to act on their behalf. Consent
 * is only effective once confirmed with an SMS OTP (`otpVerifiedAt`) and stays
 * effective until the member revokes it (`revokedAt`).
 */
export interface AgentConsentRecord {
  memberId: string;
  agentId: string;
  otpVerifiedAt: Date | null;
  revokedAt: Date | null;
}

/**
 * Returns true when `memberId` has an OTP-confirmed, unrevoked consent in
 * `consents` that allows `agentId` to act for them.
 */
export function hasActiveAgentConsent(
  consents: ReadonlyArray<AgentConsentRecord>,
  agentId: string,
  memberId: string
): boolean {
  return consents.some(
    (consent) =>
      consent.agentId === agentId &&
      consent.memberId === memberId &&
      consent.otpVerifiedAt !== null &&
      consent.revokedAt === null
  );
}

/**
 * Returns true when `agentId` may act for `memberId` in the cooperative: the
 * agent holds a trade-creating role, the member belongs to the cooperative,
 * and the member has an active consent granted to that agent.
 */
export function canActAsMemberWithConsent(
  members: ReadonlyArray<{ userId: string; role: string }>,
  consents: ReadonlyArray<AgentConsentRecord>,
  agentId: string,
  memberId: string
): boolean {
  return (
    canActOnBehalfOfCooperative(members, agentId) &&
    resolveCooperativeRole(members, memberId) !== null &&
    hasActiveAgentConsent(consents, agentId, memberId)
  );
}
