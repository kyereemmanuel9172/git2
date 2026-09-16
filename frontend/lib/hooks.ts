'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { api, ApiError } from './api';

export function useApiQuery<T>(
  key: string[],
  path: string,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: () => api<T>(path),
    ...options,
  });
}

export function useApiMutation<TData, TVariables = void>(
  path: string | ((variables: TVariables) => string),
  method: string = 'POST',
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: ApiError) => void;
  }
) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const url = typeof path === 'function' ? path(variables) : path;
      return api<TData>(url, { method, body: variables });
    },
    onSuccess: (data, variables) => {
      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

export function useInvalidateQueries(keys: string[]) {
  const queryClient = useQueryClient();
  return () => {
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };
}
