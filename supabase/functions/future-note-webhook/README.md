# Future Note webhook

This Edge Function lets Future Note send upcoming expenses into finaTracker as
pending imports. The mobile app shows them in the Future Note inbox, where the
user confirms account/category before the item becomes a transaction.

## Deploy

```bash
supabase functions deploy future-note-webhook
supabase secrets set FUTURE_NOTE_WEBHOOK_SECRET="replace-with-a-long-random-secret"
```

The function also needs the standard Supabase Edge Function environment:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Endpoint

```text
POST https://<project-ref>.functions.supabase.co/future-note-webhook
```

Use either auth style:

```text
Authorization: Bearer <FUTURE_NOTE_WEBHOOK_SECRET>
```

or:

```text
x-future-note-secret: <FUTURE_NOTE_WEBHOOK_SECRET>
```

## Payload

```json
{
  "user_id": "00000000-0000-0000-0000-000000000000",
  "external_id": "future-note-123",
  "title": "Phone installment",
  "note": "Due next month",
  "amount": 199.9,
  "currency": "MYR",
  "due_date": "2026-07-15T00:00:00+08:00",
  "category_hint": "Shopping",
  "account_hint": "Maybank"
}
```

`external_id` can also be sent as `id`, and `due_date` can also be sent as
`date`. `category_hint` and `account_hint` are optional and are only used to
preselect fields in the confirmation UI.

## Response

```json
{
  "ok": true,
  "import": {
    "id": "...",
    "status": "pending"
  }
}
```

Duplicate `user_id + external_id` payloads update the existing pending item
instead of creating another row.
