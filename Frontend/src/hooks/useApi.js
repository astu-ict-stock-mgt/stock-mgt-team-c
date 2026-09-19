import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";

const unwrap = (payload) => (payload?.data !== undefined ? payload.data : payload);

export function useApiQuery(path, query, { enabled = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const normalizedQuery = useMemo(() => query ?? {}, [query]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!enabled) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = unwrap(await api.get(path, normalizedQuery));
      if (mounted.current) {
        setData(response);
      }
      return response;
    } catch (caughtError) {
      if (mounted.current) {
        setError(caughtError);
      }
      throw caughtError;
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [enabled, normalizedQuery, path]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    const trigger = () => {
      if (cancelled) {
        return;
      }
      void refetch();
    };

    queueMicrotask(trigger);

    return () => {
      cancelled = true;
    };
  }, [enabled, refetch]);

  return { data, setData, loading, error, refetch };
}

export function useApiMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (fn) => {
    setLoading(true);
    setError(null);

    try {
      return await fn();
    } catch (caughtError) {
      setError(caughtError);
      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}
