# Finance App

一个简体中文、MYR 个人账本，包含收支记录、历史记录和类别管理。交易和类别会先保存到设备本机；连接 Supabase 后自动同步。Android/iOS 使用 AsyncStorage，Web 使用本机 localStorage。

## 配置

在 `.env` 中设置：

```text
EXPO_PUBLIC_SUPABASE_URL=你的 Supabase URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

将 [offline-first migration](supabase/migrations/202611070001_offline_first_ledger.sql) 应用到 Supabase 后再启用云端同步。migration 假设 `transactions` 和 `categories` 表已有 UUID `id` 主键，以及 app 当前使用的交易和类别字段；它会增加账号归属与同步字段，不会清空记录。执行前请核对 Supabase 中的实际表结构。

## 启动

```bash
npm install
npx expo start
```

用户登录后，本机账本按 Supabase 用户 ID 分开保存。离线新增、修改和删除会留在本机待同步；应用恢复前台或连接恢复后会重试。退出登录不会删除本机缓存。
