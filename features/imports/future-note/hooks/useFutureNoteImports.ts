/**
 * React Query wrapper around the Future Note inbox.
 *
 * Provides pending imports plus mutations for ignore/confirm actions.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPendingFutureNoteImports, updateFutureNoteImportStatus } from '@/features/imports/future-note/services/futureNoteImports';
import { financeQueryKeys } from '@/features/finance/services/financeRepository';
import { FutureNoteImport, TransactionEntry } from '@/features/finance/types';

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
