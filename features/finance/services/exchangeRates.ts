import { supabase } from '@/infrastructure/supabase/client';

const DEFAULT_BASE_CURRENCY = 'MYR';

type ConversionResult = {
  amount: number | null;
  rate: number | null;
  status: 'converted' | 'cached' | 'missing';
};

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

async function getCachedRate(base: string, quote: string) {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('base_currency', base)
    .eq('quote_currency', quote)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.rate ? Number(data.rate) : null;
}

async function cacheRate(base: string, quote: string, rate: number) {
  await supabase.from('exchange_rates').upsert(
    {
      base_currency: base,
      quote_currency: quote,
      rate,
      rate_date: todayKey(),
      provider: 'frankfurter',
    },
    { onConflict: 'base_currency,quote_currency,rate_date,provider' },
  );
}

async function fetchFrankfurterRate(base: string, quote: string) {
  const response = await fetch(`https://api.frankfurter.dev/v2/rate/${base}/${quote}`);
  if (!response.ok) throw new Error('匯率服務暫時無法使用');

  const data = await response.json();
  return Number(data.rate);
}

export async function convertToBaseCurrency(
  amount: number,
  currency: string,
  baseCurrency = DEFAULT_BASE_CURRENCY,
): Promise<ConversionResult> {
  const source = currency.toUpperCase();
  const target = baseCurrency.toUpperCase();

  if (source === target) {
    return { amount, rate: 1, status: 'converted' };
  }

  try {
    const rate = await fetchFrankfurterRate(source, target);
    await cacheRate(source, target, rate);
    return { amount: amount * rate, rate, status: 'converted' };
  } catch {
    const cachedRate = await getCachedRate(source, target);
    if (cachedRate) {
      return { amount: amount * cachedRate, rate: cachedRate, status: 'cached' };
    }
    return { amount: null, rate: null, status: 'missing' };
  }
}
