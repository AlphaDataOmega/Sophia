import { useState, useEffect } from 'react';
import { Tool } from '../types/Tool';

interface UseToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  saveTool: (tool: Tool) => Promise<void>;
  deleteTool: (name: string) => Promise<void>;
  executeTool: (name: string, input: any) => Promise<any>;
}

export function useTools(): UseToolsReturn {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tools');
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }
      const data = await response.json();
      setTools(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveTool = async (tool: Tool) => {
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tool),
      });

      if (!response.ok) {
        throw new Error('Failed to save tool');
      }

      await fetchTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tool');
      throw err;
    }
  };

  const deleteTool = async (name: string) => {
    try {
      const response = await fetch(`/api/tools/${name}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tool');
      }

      await fetchTools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tool');
      throw err;
    }
  };

  const executeTool = async (name: string, input: any) => {
    try {
      const response = await fetch(`/api/tools/${name}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to execute tool');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute tool');
      throw err;
    }
  };

  return {
    tools,
    loading,
    error,
    saveTool,
    deleteTool,
    executeTool,
  };
} 