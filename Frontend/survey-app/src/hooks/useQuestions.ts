import { useQuery, useQueryClient } from '@tanstack/react-query';
import { questionsApi } from '../api';
import type { QuestionListItem } from '../types';

export function useQuestions() {
  const queryClient = useQueryClient();

  const { data: questions = [], isLoading: loading, error } = useQuery<QuestionListItem[]>({
    queryKey: ['questions'],
    queryFn: () => questionsApi.getAll(),
  });

  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ['questions'] });

  return {
    questions,
    loading,
    error: error ? 'Sorular yüklenemedi.' : null,
    reload,
  };
}