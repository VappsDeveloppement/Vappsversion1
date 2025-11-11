"use client";

import { useMemo } from "react";
import { useFirebase } from "../provider";

export function useUser() {
  const { user, isUserLoading, userError } = useFirebase();

  const value = useMemo(
    () => ({
      user,
      isUserLoading,
      userError,
    }),
    [user, isUserLoading, userError]
  );
  return value;
}
