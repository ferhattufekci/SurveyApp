import { useQuery, useQueryClient } from '@tanstack/react-query';
import { surveysApi } from '../api';
import type { SurveyListItem } from '../types';

export function useSurveys() {
  const queryClient = useQueryClient();

  const { data: surveys = [], isLoading: loading, error } = useQuery<SurveyListItem[]>({
    queryKey: ['surveys'],
    queryFn: () => surveysApi.getAll(),
  });

  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ['surveys'] });

  return {
    surveys,
    loading,
    error: error ? 'Anketler yüklenemedi.' : null,
    reload,
  };
}