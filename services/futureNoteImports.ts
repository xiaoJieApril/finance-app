import { FutureNoteImport, TransactionEntry } from '@/type';
import { supabase } from './supabase';

function isMissingSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('Could not find the table')
  );
}

export async function getPendingFutureNoteImports() {
  try {
    const { data, error } = await supabase
      .from('future_note_imports')
      .select('*')
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data ?? []) as FutureNoteImport[];
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

export async function updateFutureNoteImportStatus(
  item: FutureNoteImport,
  status: FutureNoteImport['status'],
  confirmedEntry?: TransactionEntry,
) {
  const { error } = await supabase
    .from('future_note_imports')
    .update({ status, confirmed_entry_id: confirmedEntry?.id ?? null })
    .eq('id', item.id);

  if (error) throw error;
}
