import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPendingFutureNoteImports, updateFutureNoteImportStatus } from '@/services/futureNoteImports';
import { financeQueryKeys } from '@/services/financeRepository';
import { FutureNoteImport, TransactionEntry } from '@/type';

export const futureNoteImportQueryKeys = {
  pending: ['future-note-imports', 'pending'] as const,
};

export function useFutureNoteImports() {
  const queryClient = useQueryClient();

  const pendingImports = useQuery({
    queryKey: futureNoteImportQueryKeys.pending,
    queryFn: getPendingFutureNoteImports,
  });

  const ignoreImport = useMutation({
    mutationFn: (item: FutureNoteImport) => updateFutureNoteImportStatus(item, 'ignored'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: futureNoteImportQueryKeys.pending }),
  });

  const markConfirmed = useMutation({
    mutationFn: ({ item, entry }: { item: FutureNoteImport; entry: TransactionEntry }) =>
      updateFutureNoteImportStatus(item, 'confirmed', entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: futureNoteImportQueryKeys.pending });
      queryClient.invalidateQueries({ queryKey: financeQueryKeys.financeData });
    },
  });

  return {
    pendingImports,
    ignoreImport,
    markConfirmed,
  };
}
