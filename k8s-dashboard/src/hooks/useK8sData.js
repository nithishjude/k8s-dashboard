import { useState, useEffect, useCallback } from 'react';

/**
 * Generic data-fetching hook with loading/error states and refresh support.
 * @param {Function} fetchFn     - async function that returns data
 * @param {Array}    deps        - dep array that triggers re-fetch
 * @param {Object}   opts
 * @param {boolean}  opts.autoRefresh   - enable polling
 * @param {number}   opts.refreshInterval - ms between polls (default 10 000)
 */
export function useK8sData(fetchFn, deps = [], opts = {}) {
  const { autoRefresh = false, refreshInterval = 10_000 } = opts;

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchFn();
      setData(result);
      setLastFetch(new Date());
    } catch (err) {
      const message = typeof err === 'string' ? err : err?.message || 'An error occurred';
      setError({ message, statusCode: err?.statusCode });
    } finally {
      setLoading(false);
    }
  }, [fetchFn, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  useEffect(() => {
    setLoading(true);
    fetch();

    if (autoRefresh) {
      const id = setInterval(fetch, refreshInterval);
      return () => clearInterval(id);
    }
  }, [fetch, autoRefresh, refreshInterval]);

  return { data, loading, error, refresh, lastFetch };
}
