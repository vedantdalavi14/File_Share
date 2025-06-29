import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiRequest = async (method: string, url: string, body?: any) => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorBody.message || 'API request failed');
  }
  
  return response;
};
