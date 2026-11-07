const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const databasePath = path.join(root, 'type', 'database.ts');
const localDatabasePath = path.join(root, 'type', 'localDatabase.ts');
const migrationDir = path.join(root, 'supabase', 'migrations');
const lockedMigrations = new Map([
  ['202611070001_offline_first_ledger.sql', 'A8D29993BC9999EDB081238103ADCC29C6E42C6E7C88C8441EDD90BEF2AA81B3'],
  ['202611070002_ledger_v1_contract.sql', '3E71288638302F1EE9055637F073EFB442700BA9D45DAB83F3EA2C901841251A'],
]);

const expectedRows = {
  categories: {
    id: 'string',
    user_id: 'string',
    name: 'string',
    icon: 'string',
    type: "'income' | 'expense'",
    updated_at: 'string',
    archived_at: 'string | null',
  },
  transactions: {
    id: 'string',
    user_id: 'string',
    category_id: 'string',
    amount: 'number',
    note: 'string',
    date: 'string',
    updated_at: 'string',
    deleted_at: 'string | null',
  },
};

function fail(message) {
  console.error(`Ledger schema contract failed: ${message}`);
  process.exitCode = 1;
}

function extractBlock(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const openIndex = source.indexOf('{', markerIndex);
  if (openIndex < 0) return null;
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  return null;
}

function readFields(source) {
  return Object.fromEntries([...source.matchAll(/^\s*([A-Za-z_]\w*)\s*:\s*([^;]+);/gm)]
    .map((match) => [match[1], match[2].trim()]));
}

const databaseTypes = fs.readFileSync(databasePath, 'utf8');
for (const [tableName, expected] of Object.entries(expectedRows)) {
  const table = extractBlock(databaseTypes, `${tableName}: {`);
  const row = table && extractBlock(table, 'Row: {');
  if (!row) {
    fail(`missing ${tableName}.Row definition`);
    continue;
  }
  const actual = readFields(row);
  for (const [field, type] of Object.entries(expected)) {
    if (actual[field] !== type) fail(`${tableName}.${field} must remain ${type}`);
  }
}

const transactionDefinition = extractBlock(databaseTypes, 'transactions: {') ?? '';
for (const invariant of [
  "foreignKeyName: 'transactions_category_user_id_fkey'",
  "columns: ['category_id', 'user_id']",
  "referencedRelation: 'categories'",
  "referencedColumns: ['id', 'user_id']",
]) {
  if (!transactionDefinition.includes(invariant)) fail(`missing fixed transaction/category relation: ${invariant}`);
}

const categoryDefinition = extractBlock(databaseTypes, 'categories: {') ?? '';
const categoryUpdate = extractBlock(categoryDefinition, 'Update: {') ?? '';
if (Object.hasOwn(readFields(categoryUpdate), 'type')) fail('categories.type is immutable after creation');

const localTypes = fs.readFileSync(localDatabasePath, 'utf8');
for (const field of ['version: 1;', 'userId: string;', 'transactions: Transaction[];', 'categories: Category[];', 'pending: PendingChange[];']) {
  if (!localTypes.includes(field)) fail(`missing stable local JSON envelope field: ${field}`);
}

for (const [filename, expectedHash] of lockedMigrations) {
  const migrationPath = path.join(migrationDir, filename);
  if (!fs.existsSync(migrationPath)) {
    fail(`locked baseline migration is missing: ${filename}`);
    continue;
  }
  const normalized = fs.readFileSync(migrationPath, 'utf8').replace(/\r\n?/g, '\n');
  const actualHash = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').toUpperCase();
  if (actualHash !== expectedHash) fail(`do not edit the locked baseline migration ${filename}; add a new migration`);
}

const baseline = [...lockedMigrations.keys()].sort().at(-1);
for (const filename of fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql') && name > baseline)) {
  const sql = fs.readFileSync(path.join(migrationDir, filename), 'utf8');
  const changesCoreTables = /\b(?:alter\s+table|drop\s+table)\s+(?:if\s+(?:not\s+)?exists\s+)?(?:(?:only|public)\s+)*(?:public\.)?(?:transactions|categories)\b/i;
  if (changesCoreTables.test(sql)) fail(`${filename} changes a locked core table; add a separate table and reference the v1 core`);
}

if (!process.exitCode) console.log('Ledger v1 schema contract is intact.');
