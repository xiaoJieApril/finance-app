import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, NativeModules, Platform } from 'react-native';
import { NotificationImport, TransactionEntry, TransactionType } from '@/type';
import { supabase } from './supabase';

type NativeNotificationPayload = {
  sourceApp?: string;
  sourcePackage?: string;
  title?: string;
  text?: string;
  postedAt?: number | string;
};

type NotificationListenerModule = {
  isNotificationAccessEnabled?: () => Promise<boolean>;
  openNotificationListenerSettings?: () => Promise<void>;
  consumePendingNotifications?: () => Promise<NativeNotificationPayload[]>;
};

export type NotificationImportSource = NativeNotificationPayload & {
  sourceApp: string;
  sourcePackage: string;
  title?: string;
  text: string;
  postedAt?: number | string;
};

const STORAGE_KEY = '@notification_imports';
const SETTINGS_KEY = '@notification_import_settings';
const PREVIEW_LENGTH = 220;

const FINANCE_NOTIFICATION_LISTENER = NativeModules.FinanceNotificationListener as
  | NotificationListenerModule
  | undefined;

const ALLOWED_APP_HINTS = [
  { packageName: 'com.maybank2u.life', name: 'MAE / Maybank' },
  { packageName: 'my.com.maybank2u.m2umobile', name: 'Maybank2u' },
  { packageName: 'com.cimbmalaysia', name: 'CIMB' },
  { packageName: 'com.cimbbank.my', name: 'CIMB' },
  { packageName: 'com.pb.mobile', name: 'Public Bank' },
  { packageName: 'com.rhb.mobilebanking', name: 'RHB' },
  { packageName: 'com.hlb.my.com.hongleongconnect', name: 'Hong Leong Bank' },
  { packageName: 'my.com.tngdigital.ewallet', name: 'Touch n Go eWallet' },
  { packageName: 'my.com.myboost', name: 'Boost' },
  { packageName: 'my.gov.kwsp.ikaun', name: 'KWSP i-Akaun' },
  { packageName: 'my.com.versa', name: 'Versa' },
];

const SENSITIVE_PATTERN =
  /\b(otp|tac|verification|verify|security code|kod|one[-\s]?time|password|passcode|login|log in|secure2u|authori[sz]e|authentication)\b/i;

const EXPENSE_PATTERN =
  /\b(debit|debited|spent|paid|payment|purchase|charged|withdrawn|sent|transfer(?:red)? to|duitnow to|paywave|deducted)\b/i;
const INCOME_PATTERN =
  /\b(credit|credited|received|receive|refund|cashback|deposit|salary|incoming|duitnow from|transfer(?:red)? from)\b/i;
const TRANSFER_PATTERN = /\b(transfer|duitnow|instant transfer|interbank|own account)\b/i;

function isMissingSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('Could not find the table')
  );
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function createId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

function getAllowedApp(payload: NotificationImportSource) {
  const packageName = payload.sourcePackage.toLowerCase();
  return ALLOWED_APP_HINTS.find((app) => packageName.includes(app.packageName.toLowerCase()));
}

function parseAmount(text: string) {
  const match = text.match(/\b(?:rm|myr|sgd|usd|eur)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:rm|myr|sgd|usd|eur)?\b/i);
  if (!match) return null;

  const currencyMatch = match[0].match(/\b(rm|myr|sgd|usd|eur)\b/i);
  const currency = currencyMatch?.[1]?.toUpperCase() === 'RM' ? 'MYR' : currencyMatch?.[1]?.toUpperCase() ?? 'MYR';
  const amount = Number(match[1].replace(/,/g, ''));
  if (!amount || amount <= 0) return null;
  return { amount, currency };
}

function parseType(text: string): TransactionType | null {
  const isTransfer = TRANSFER_PATTERN.test(text);
  const isExpense = EXPENSE_PATTERN.test(text);
  const isIncome = INCOME_PATTERN.test(text);

  if (isTransfer && isExpense && !isIncome) return 'transfer';
  if (isTransfer && isIncome && !isExpense) return 'transfer';
  if (isIncome) return 'income';
  if (isExpense) return 'expense';
  if (isTransfer) return 'transfer';
  return null;
}

function parseMerchant(text: string) {
  const match = text.match(/\b(?:at|to|from|merchant|payee)\s+([a-z0-9&.'’\- ]{3,36})/i);
  return match ? normalizeWhitespace(match[1]).replace(/[.。]+$/, '') : null;
}

function parseAccountHint(text: string) {
  const match = text.match(/\b(?:card|acct|account|a\/c)\s*(?:ending|no\.?)?\s*([*xX\- ]*\d{3,4})\b/i);
  return match ? normalizeWhitespace(match[0]) : null;
}

function toImport(payload: NotificationImportSource): NotificationImport | null {
  const allowedApp = getAllowedApp(payload);
  if (!allowedApp) return null;

  const title = normalizeWhitespace(payload.title ?? '');
  const body = normalizeWhitespace(payload.text);
  const combined = normalizeWhitespace(`${title} ${body}`);
  if (!body || SENSITIVE_PATTERN.test(combined)) return null;

  const amount = parseAmount(combined);
  const occurredAt =
    typeof payload.postedAt === 'number'
      ? new Date(payload.postedAt).toISOString()
      : payload.postedAt
        ? new Date(payload.postedAt).toISOString()
        : new Date().toISOString();
  const notificationHash = hashString(
    `${payload.sourcePackage}|${combined.toLowerCase()}|${amount?.amount ?? 'no-amount'}|${occurredAt.slice(0, 16)}`,
  );

  return {
    id: createId(),
    source_app: allowedApp.name || payload.sourceApp,
    source_package: payload.sourcePackage,
    notification_title: title || null,
    notification_text_preview: body.slice(0, PREVIEW_LENGTH),
    notification_hash: notificationHash,
    parsed_type: parseType(combined),
    parsed_amount: amount?.amount ?? null,
    parsed_currency: amount?.currency ?? 'MYR',
    parsed_merchant: parseMerchant(combined),
    parsed_account_hint: parseAccountHint(combined),
    occurred_at: occurredAt,
    status: 'pending',
  };
}

async function readLocalImports() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as NotificationImport[]) : [];
}

async function writeLocalImports(imports: NotificationImport[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(imports));
}

async function upsertLocalImport(item: NotificationImport) {
  const existing = await readLocalImports();
  if (existing.some((current) => current.notification_hash === item.notification_hash)) {
    return null;
  }
  const next = [item, ...existing].slice(0, 80);
  await writeLocalImports(next);
  return item;
}

export function getSupportedNotificationApps() {
  return ALLOWED_APP_HINTS;
}

export type NotificationImportSettings = {
  enabled: boolean;
};

export const DEFAULT_NOTIFICATION_IMPORT_SETTINGS: NotificationImportSettings = {
  enabled: false,
};

export async function getNotificationImportSettings() {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_NOTIFICATION_IMPORT_SETTINGS;
  return { ...DEFAULT_NOTIFICATION_IMPORT_SETTINGS, ...JSON.parse(raw) } as NotificationImportSettings;
}

export async function updateNotificationImportSettings(patch: Partial<NotificationImportSettings>) {
  const current = await getNotificationImportSettings();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function isNativeNotificationImportEnabled() {
  return Platform.OS === 'android' && Boolean(FINANCE_NOTIFICATION_LISTENER);
}

export async function isNotificationListenerEnabled() {
  if (!isNativeNotificationImportEnabled() || !FINANCE_NOTIFICATION_LISTENER?.isNotificationAccessEnabled) {
    return false;
  }

  return FINANCE_NOTIFICATION_LISTENER.isNotificationAccessEnabled();
}

export async function openNotificationListenerSettings() {
  if (isNativeNotificationImportEnabled() && FINANCE_NOTIFICATION_LISTENER?.openNotificationListenerSettings) {
    await FINANCE_NOTIFICATION_LISTENER.openNotificationListenerSettings();
    return;
  }

  await Linking.openSettings();
}

export async function getPendingNotificationImports() {
  try {
    const { data, error } = await supabase
      .from('notification_imports')
      .select('*')
      .eq('status', 'pending')
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as NotificationImport[];
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    const local = await readLocalImports();
    return local.filter((item) => item.status === 'pending');
  }
}

export async function importNotificationPayload(payload: NotificationImportSource) {
  const parsed = toImport(payload);
  if (!parsed) return null;

  const userId = await getCurrentUserId();
  if (!userId) return upsertLocalImport(parsed);

  const payloadWithUser = { ...parsed, user_id: userId };
  try {
    const { data, error } = await supabase
      .from('notification_imports')
      .insert([payloadWithUser])
      .select()
      .single();

    if (error) {
      if (String(error.message).includes('duplicate') || error.code === '23505') return null;
      throw error;
    }

    return data as NotificationImport;
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    return upsertLocalImport(payloadWithUser);
  }
}

export async function drainNativeNotificationImports() {
  if (!isNativeNotificationImportEnabled() || !FINANCE_NOTIFICATION_LISTENER?.consumePendingNotifications) {
    return [];
  }

  const payloads = await FINANCE_NOTIFICATION_LISTENER.consumePendingNotifications();
  const imported = await Promise.all(
    payloads
      .filter((payload): payload is NotificationImportSource =>
        Boolean(payload.sourceApp && payload.sourcePackage && payload.text),
      )
      .map((payload) => importNotificationPayload(payload)),
  );

  return imported.filter((item): item is NotificationImport => Boolean(item));
}

export async function updateNotificationImportStatus(
  item: NotificationImport,
  status: NotificationImport['status'],
  confirmedEntry?: TransactionEntry,
) {
  if (item.id.startsWith('local-')) {
    const existing = await readLocalImports();
    const next = existing.map((current) =>
      current.id === item.id
        ? { ...current, status, confirmed_entry_id: confirmedEntry?.id ?? current.confirmed_entry_id }
        : current,
    );
    await writeLocalImports(next);
    return;
  }

  const { error } = await supabase
    .from('notification_imports')
    .update({ status, confirmed_entry_id: confirmedEntry?.id ?? null })
    .eq('id', item.id);

  if (error) throw error;
}

export async function createSampleNotificationImport() {
  return importNotificationPayload({
    sourceApp: 'MAE / Maybank',
    sourcePackage: 'com.maybank2u.life',
    title: 'Card Transaction',
    text: 'RM 18.90 paid at FAMILY MART using card ending 1234.',
    postedAt: Date.now(),
  });
}
