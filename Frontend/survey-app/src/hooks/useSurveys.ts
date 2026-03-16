import { useEffect, useState, useCallback } from 'react';
import { surveysApi } from '../api';
import type { SurveyListItem } from '../types';

export function useSurveys() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await surveysApi.getAll();
      setSurveys(data);
    } catch {
      setError('Anketler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { surveys, loading, error, reload: load };
}