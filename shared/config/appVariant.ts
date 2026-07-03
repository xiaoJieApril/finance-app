import Constants from 'expo-constants';

export type AppVariant = 'developer' | 'normal';

const rawVariant = process.env.EXPO_PUBLIC_APP_VARIANT?.toLowerCase();
const rawDeveloperTools = process.env.EXPO_PUBLIC_ENABLE_DEVELOPER_TOOLS?.toLowerCase();

export const appVariant: AppVariant = rawVariant === 'normal' ? 'normal' : 'developer';
export const isDeveloperVersion = appVariant === 'developer';
export const isNormalUserVersion = appVariant === 'normal';
export const showDeveloperTools =
  rawDeveloperTools == null
    ? isDeveloperVersion
    : ['1', 'true', 'yes', 'on'].includes(rawDeveloperTools);

export const appBuildInfo = {
  variant: appVariant,
  channel: process.env.EXPO_PUBLIC_BUILD_CHANNEL ?? 'local',
  appVersion: Constants.expoConfig?.version ?? 'unknown',
  runtimeVersion:
    typeof Constants.expoConfig?.runtimeVersion === 'string'
      ? Constants.expoConfig.runtimeVersion
      : Constants.expoConfig?.version ?? 'unknown',
};

export function developerText(developerMessage: string, normalMessage: string) {
  return showDeveloperTools ? developerMessage : normalMessage;
}
