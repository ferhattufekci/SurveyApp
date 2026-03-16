import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api';
import type { User } from '../types';

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ['users'] });

  return {
    users,
    loading,
    error: error ? 'Kullanıcılar yüklenemedi.' : null,
    reload,
  };
}