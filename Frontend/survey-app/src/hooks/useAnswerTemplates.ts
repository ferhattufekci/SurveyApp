import { useQuery, useQueryClient } from '@tanstack/react-query';
import { answerTemplatesApi } from '../api';
import type { AnswerTemplate } from '../types';

export function useAnswerTemplates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading: loading, error } = useQuery<AnswerTemplate[]>({
    queryKey: ['answerTemplates'],
    queryFn: () => answerTemplatesApi.getAll(),
  });

  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ['answerTemplates'] });

  return {
    templates,
    loading,
    error: error ? 'Şablonlar yüklenemedi.' : null,
    reload,
  };
}