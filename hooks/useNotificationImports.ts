import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSampleNotificationImport,
  drainNativeNotificationImports,
  getPendingNotificationImports,
  isNotificationListenerEnabled,
  openNotificationListenerSettings,
  updateNotificationImportStatus,
} from '@/services/notificationImports';
import { financeQueryKeys } from '@/services/financeRepository';
import { NotificationImport, TransactionEntry } from '@/type';
import { useNotificationImportSettings } from './useNotificationImportSettings';

export const notificationImportQueryKeys = {
  pending: ['notification-imports', 'pending'] as const,
  permission: ['notification-imports', 'permission'] as const,
};

export function useNotificationImports() {
  const queryClient = useQueryClient();
  const { settings } = useNotificationImportSettings();
  const importsEnabled = settings.data?.enabled ?? true;

  const pendingImports = useQuery({
    queryKey: [...notificationImportQueryKeys.pending, importsEnabled],
    queryFn: async () => {
      if (importsEnabled) {
        await drainNativeNotificationImports();
      }
      return getPendingNotificationImports();
    },
  });

  const permission = useQuery({
    queryKey: notificationImportQueryKeys.permission,
    queryFn: isNotificationListenerEnabled,
  });

  const refreshFromDevice = useMutation({
    mutationFn: async () => {
      if (!importsEnabled) return [];
      return drainNativeNotificationImports();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationImportQueryKeys.pending });
      queryClient.invalidateQueries({ queryKey: notificationImportQueryKeys.permission });
    },
  });

  const createSample = useMutation({
    mutationFn: createSampleNotificationImport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationImportQueryKeys.pending }),
  });

  const ignoreImport = useMutation({
    mutationFn: (item: NotificationImport) => updateNotificationImportStatus(item, 'ignored'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationImportQueryKeys.pending }),
  });

  const markConfirmed = useMutation({
    mutationFn: ({ item, entry }: { item: NotificationImport; entry: TransactionEntry }) =>
      updateNotificationImportStatus(item, 'confirmed', entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationImportQueryKeys.pending });
      queryClient.invalidateQueries({ queryKey: financeQueryKeys.financeData });
    },
  });

  const openSettings = async () => {
    await openNotificationListenerSettings();
    queryClient.invalidateQueries({ queryKey: notificationImportQueryKeys.permission });
  };

  return {
    pendingImports,
    permission,
    refreshFromDevice,
    createSample,
    ignoreImport,
    markConfirmed,
    openSettings,
  };
}
