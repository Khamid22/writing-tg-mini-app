import { useEffect, useState } from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Fetch when deps change, debounced. Returns data, loading, error, and a manual reload(). */
export function useAdminFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: { debounceMs?: number; enabled?: boolean } = {},
): State<T> {
  const { debounceMs = 0, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = () => {
      setLoading(true);
      setError(null);
      fetcher()
        .then((value) => { if (!cancelled) setData(value); })
        .catch((err: Error) => { if (!cancelled) setError(err.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    const handle = debounceMs > 0 ? window.setTimeout(run, debounceMs) : (run(), 0);
    return () => {
      cancelled = true;
      if (debounceMs > 0) window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}
