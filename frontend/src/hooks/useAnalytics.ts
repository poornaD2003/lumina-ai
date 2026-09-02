import { useQuery } from '@tanstack/react-query';

export function useAnalytics<T>(key: string, fetchFn: () => Promise<T>) {
  return useQuery({ queryKey: [key], queryFn: fetchFn, staleTime: 60_000 });
}
