import type { PropsWithChildren } from 'react';

import { Redirect, type Href } from 'expo-router';

import { resolveRouteAccess, type AccessLevel } from '@/utils/access-control';
import { getSessionUser } from '@/utils/session';

type AccessGateProps = PropsWithChildren<{
  required: AccessLevel;
}>;

export function AccessGate({ required, children }: AccessGateProps) {
  const redirectTo = resolveRouteAccess(required, getSessionUser());

  if (redirectTo) {
    return <Redirect href={redirectTo as Href} />;
  }

  return <>{children}</>;
}
