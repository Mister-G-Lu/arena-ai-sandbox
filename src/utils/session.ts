/** A session we will act on must carry a user.id. Fake sessions in tests need one too. */
export interface OperatorIdentity {
  id: string;
  email?: string | null;
}

export function requireUserId(session: { user?: { id?: string } | null } | null | undefined): string {
  const id = session?.user?.id;
  if (!id) throw new Error('session has no user.id');
  return id;
}

export function identityFrom(session: { user?: { id?: string; email?: string | null } | null } | null): OperatorIdentity | null {
  const id = session?.user?.id;
  if (!id) return null;
  return { id, email: session?.user?.email ?? null };
}
