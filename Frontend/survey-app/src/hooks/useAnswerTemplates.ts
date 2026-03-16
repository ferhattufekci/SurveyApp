import { useEffect, useState, useCallback } from 'react';
import { answerTemplatesApi } from '../api';
import type { AnswerTemplate } from '../types';

export function useAnswerTemplates() {
  const [templates, setTemplates] = useState<AnswerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await answerTemplatesApi.getAll();
      setTemplates(data);
    } catch {
      setError('Şablonlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { templates, loading, error, reload: load };
}