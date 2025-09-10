import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { IpcClient } from "../ipc/ipc_client";
import type {
  CreateDocsSourceParams,
  DocsSearchParams,
  DocsSearchResult,
  DocsCrawlProgress,
  GenerateEmbeddingsParams,
  ReindexDocsParams,
} from "../ipc/ipc_types";
import { showError } from "../lib/toast";

// Docs sources management
export function useDocsSources() {
  const {
    data: sources,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["docs", "sources"],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.listDocsSources();
    },
    meta: {
      showErrorToast: true,
    },
  });

  return {
    sources: sources || [],
    isLoading,
    error,
    refetch,
  };
}

// Single docs source
export function useDocsSource(sourceId: number | null) {
  const {
    data: source,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["docs", "source", sourceId],
    queryFn: async () => {
      if (!sourceId) return null;
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getDocsSource(sourceId);
    },
    enabled: sourceId !== null,
    meta: {
      showErrorToast: true,
    },
  });

  return {
    source,
    isLoading,
    error,
    refetch,
  };
}

// Create docs source
export function useCreateDocsSource() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: CreateDocsSourceParams) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.createDocsSource(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", "sources"] });
      queryClient.invalidateQueries({ queryKey: ["docs", "stats"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const createSource = async (params: CreateDocsSourceParams) => {
    return mutation.mutateAsync(params);
  };

  return {
    createSource,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Delete docs source
export function useDeleteDocsSource() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (sourceId: number) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.deleteDocsSource(sourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", "sources"] });
      queryClient.invalidateQueries({ queryKey: ["docs", "stats"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const deleteSource = async (sourceId: number) => {
    return mutation.mutateAsync(sourceId);
  };

  return {
    deleteSource,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Stop crawling
export function useStopDocsCrawling() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (sourceId: number) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.stopDocsCrawling(sourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", "sources"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const stopCrawling = async (sourceId: number) => {
    return mutation.mutateAsync(sourceId);
  };

  return {
    stopCrawling,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Pause crawling
export function usePauseDocsCrawling() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (sourceId: number) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.pauseDocsCrawling(sourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", "sources"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const pauseCrawling = async (sourceId: number) => {
    return mutation.mutateAsync(sourceId);
  };

  return {
    pauseCrawling,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Resume crawling
export function useResumeDocsCrawling() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (sourceId: number) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.resumeDocsCrawling(sourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", "sources"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const resumeCrawling = async (sourceId: number) => {
    return mutation.mutateAsync(sourceId);
  };

  return {
    resumeCrawling,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Reindex docs
export function useReindexDocs() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: ReindexDocsParams) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.reindexDocs(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", "sources"] });
      queryClient.invalidateQueries({ queryKey: ["docs", "stats"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const reindexSource = async (sourceId: number) => {
    return mutation.mutateAsync({ sourceId });
  };

  return {
    reindexSource,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Generate embeddings
export function useGenerateDocsEmbeddings() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: GenerateEmbeddingsParams) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.generateDocsEmbeddings(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["docs", "sources"] });
      queryClient.invalidateQueries({ queryKey: ["docs", "stats"] });
    },
    onError: (error) => {
      showError(error);
    },
  });

  const generateEmbeddings = async (sourceId: number, regenerate = false) => {
    return mutation.mutateAsync({ sourceId, regenerate });
  };

  return {
    generateEmbeddings,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Search docs
export function useSearchDocs() {
  const [searchResults, setSearchResults] = useState<DocsSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchDocs = async (params: DocsSearchParams) => {
    if (!params.query.trim()) {
      setSearchResults([]);
      return [];
    }

    setIsSearching(true);
    try {
      const ipcClient = IpcClient.getInstance();
      const results = await ipcClient.searchDocs(params);
      setSearchResults(results);
      return results;
    } catch (error) {
      showError(error);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setSearchResults([]);
  };

  return {
    searchDocs,
    searchResults,
    isSearching,
    clearResults,
  };
}

// Get pages for a source
export function useDocsPages(sourceId: number | null) {
  const {
    data: pages,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["docs", "pages", sourceId],
    queryFn: async () => {
      if (!sourceId) return [];
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getDocsPages(sourceId);
    },
    enabled: sourceId !== null,
    meta: {
      showErrorToast: true,
    },
  });

  return {
    pages: pages || [],
    isLoading,
    error,
    refetch,
  };
}

// Get chunks for a page
export function useDocsChunks(pageId: number | null) {
  const {
    data: chunks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["docs", "chunks", pageId],
    queryFn: async () => {
      if (!pageId) return [];
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getDocsChunks(pageId);
    },
    enabled: pageId !== null,
    meta: {
      showErrorToast: true,
    },
  });

  return {
    chunks: chunks || [],
    isLoading,
    error,
    refetch,
  };
}

// Get docs statistics
export function useDocsStats() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["docs", "stats"],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.getDocsStats();
    },
    meta: {
      showErrorToast: true,
    },
  });

  return {
    stats: stats || {
      totalSources: 0,
      totalPages: 0,
      totalChunks: 0,
      sourcesWithEmbeddings: 0,
    },
    isLoading,
    error,
    refetch,
  };
}

// Listen for crawl progress
export function useDocsCrawlProgress() {
  const [progress, setProgress] = useState<DocsCrawlProgress | null>(null);
  const queryClient = useQueryClient();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const ipcClient = IpcClient.getInstance();

    const unsubscribe = ipcClient.onDocsCrawlProgress((progressData) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      setProgress(progressData);

      // Invalidate relevant queries when status changes
      if (
        progressData.status === "completed" ||
        progressData.status === "failed"
      ) {
        queryClient.invalidateQueries({ queryKey: ["docs", "sources"] });
        queryClient.invalidateQueries({
          queryKey: ["docs", "source", progressData.sourceId],
        });
        queryClient.invalidateQueries({ queryKey: ["docs", "stats"] });

        // Clear progress after a delay
        setTimeout(() => {
          setProgress(null);
          isProcessingRef.current = false;
        }, 5000);
      } else {
        isProcessingRef.current = false;
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return {
    progress,
    clearProgress: () => setProgress(null),
  };
}
