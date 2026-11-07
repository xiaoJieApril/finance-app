# Finance App

一个简体中文、MYR 个人账本，包含收支记录、历史记录和类别管理。交易和类别会先保存到设备本机；连接 Supabase 后自动同步。Android/iOS 使用 AsyncStorage，Web 使用本机 localStorage。

## 配置

在 `.env` 中设置：

```text
EXPO_PUBLIC_SUPABASE_URL=你的 Supabase URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

在 Supabase SQL Editor 运行 [完整建表脚本](supabase/SETUP.sql) 后即可启用云端同步。该脚本适用于新建项目，也会为旧表补缺失的同步字段，不会删除记录。若使用 migration 流程，则按顺序运行 `supabase/migrations` 中的两个文件，不需要再运行 `SETUP.sql`。完整契约见 [SCHEMA_CONTRACT.md](supabase/SCHEMA_CONTRACT.md)。

## 启动

```bash
npm install
npx expo start
```

用户登录后，本机账本按 Supabase 用户 ID 分开保存。离线新增、修改和删除会留在本机待同步；应用恢复前台或连接恢复后会重试。退出登录不会删除本机缓存。
