import { useEffect, useState, useCallback } from 'react';
import { questionsApi } from '../api';
import type { QuestionListItem } from '../types';

export function useQuestions() {
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await questionsApi.getAll();
      setQuestions(data);
    } catch {
      setError('Sorular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { questions, loading, error, reload: load };
}