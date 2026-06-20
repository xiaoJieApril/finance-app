const fs = require('fs');
const path = require('path');

const DEFAULT_INPUT = 'C:\\Users\\lolha\\Downloads\\transactions_rows.csv';
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'supabase', 'legacy-transactions-import.sql');

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const [headerLine, ...lines] = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(headerLine);

  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function sqlString(value) {
  if (value === undefined || value === null || value === '') return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 'null';
  return String(parsed);
}

function sqlBoolean(value) {
  return String(value).toLowerCase() === 'true' ? 'true' : 'false';
}

function buildValues(rows) {
  return rows
    .map((row) => {
      const userId = row.user_id ? `${sqlString(row.user_id)}::uuid` : 'null';
      return `    (${sqlNumber(row.id)}, ${userId}, ${sqlNumber(row.category_id)}, ${sqlNumber(row.amount)}, ${sqlString(row.note)}, ${sqlString(row.date)}::timestamptz, ${sqlBoolean(row.is_savings)})`;
    })
    .join(',\n');
}

function buildSql(rows) {
  return `-- Generated from transactions_rows.csv.
-- Run this in Supabase SQL Editor after the v2 finance schema migration.
-- It is safe to rerun: existing legacy_transaction_id rows are skipped.

with legacy_rows(id, user_id, category_id, amount, note, date, is_savings) as (
  values
${buildValues(rows)}
),
created_categories as (
  insert into public.finance_categories (
    user_id,
    name,
    icon,
    type,
    budget_limit,
    legacy_category_id
  )
  select distinct
    lr.user_id,
    coalesce(c.name, '未分類'),
    coalesce(c.icon, 'wallet'),
    coalesce(c.type, 'expense'),
    coalesce(c.budget_limit, 0),
    lr.category_id
  from legacy_rows lr
  left join public.categories c on c.id = lr.category_id
  left join public.finance_categories fc
    on fc.user_id = lr.user_id
   and fc.legacy_category_id = lr.category_id
  where lr.category_id is not null
    and fc.id is null
  returning id
),
default_accounts as (
  insert into public.accounts (
    user_id,
    name,
    type,
    currency,
    initial_balance,
    current_balance,
    icon
  )
  select distinct
    lr.user_id,
    'Default Wallet',
    'cash',
    'MYR',
    0,
    0,
    'wallet'
  from legacy_rows lr
  left join public.accounts a
    on a.user_id = lr.user_id
   and a.name = 'Default Wallet'
  where a.id is null
  returning id
)
insert into public.transaction_entries (
  user_id,
  type,
  account_id,
  category_id,
  currency,
  amount,
  base_currency,
  base_currency_amount,
  exchange_rate,
  note,
  date,
  is_savings,
  legacy_transaction_id
)
select
  lr.user_id,
  case when coalesce(c.type, fc.type, 'expense') = 'income' then 'income' else 'expense' end,
  a.id,
  fc.id,
  'MYR',
  lr.amount,
  'MYR',
  lr.amount,
  1,
  coalesce(lr.note, ''),
  lr.date,
  lr.is_savings,
  lr.id
from legacy_rows lr
left join public.categories c on c.id = lr.category_id
left join public.finance_categories fc
  on fc.user_id = lr.user_id
 and fc.legacy_category_id = lr.category_id
left join public.accounts a
  on a.user_id = lr.user_id
 and a.name = 'Default Wallet'
left join public.transaction_entries existing
  on existing.user_id = lr.user_id
 and existing.legacy_transaction_id = lr.id
where existing.id is null;
`;
}

const input = process.argv[2] || DEFAULT_INPUT;
const output = process.argv[3] || DEFAULT_OUTPUT;
const rows = readCsv(input);

if (rows.length === 0) {
  throw new Error(`No transaction rows found in ${input}`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, buildSql(rows), 'utf8');
console.log(`Generated ${output} for ${rows.length} legacy transaction rows.`);
