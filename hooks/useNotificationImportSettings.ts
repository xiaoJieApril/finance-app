import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationImportSettings,
  updateNotificationImportSettings,
} from '@/services/notificationImports';

export const notificationImportSettingsQueryKey = ['notification-import-settings'] as const;

export function useNotificationImportSettings() {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: notificationImportSettingsQueryKey,
    queryFn: getNotificationImportSettings,
  });

  const updateSettings = useMutation({
    mutationFn: updateNotificationImportSettings,
    onSuccess: (next) => {
      queryClient.setQueryData(notificationImportSettingsQueryKey, next);
    },
  });

  return {
    settings,
    updateSettings,
  };
}
