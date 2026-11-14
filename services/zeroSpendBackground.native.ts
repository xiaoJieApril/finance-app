import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';
import { reconcileZeroSpendDays, syncZeroSpendUser } from './zeroSpendStore';
import { syncUser } from './offlineStore';

const TASK_NAME = 'finance-zero-spend-daily-check';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return BackgroundTask.BackgroundTaskResult.Success;
    await syncUser(userId);
    await reconcileZeroSpendDays(userId);
    await syncZeroSpendUser(userId);
    await reconcileZeroSpendDays(userId);
    await syncZeroSpendUser(userId);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const registerZeroSpendBackgroundTask = async () => {
  if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) return;
  await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 60 });
};
