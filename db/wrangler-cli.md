# Wrangler-CLI

```
npx wrangler@latest d1 create db-derbent
npx wrangler@latest d1 delete db-derbent

```

## For Production

```
npx wrangler@latest d1 migrations apply

```

## For Development

```
npx wrangler@latest d1 execute db-derbent --file './db/schema.sql' --local
npx wrangler@latest d1 execute db-derbent --file './db/schema.sql' --remote // DO NOT RUN, JUST FOR INFORMATION

npx wrangler@latest d1 execute db-derbent --command 'SELECT * from users;' --local
npx wrangler@latest d1 execute db-derbent --command "ALTER TABLE users ADD COLUMN app TEXT DEFAULT CURRENT_TIMESTAMP;" --local
```

https://developers.cloudflare.com/workers/wrangler/commands/#d1-execute

## Backup

```
npx wrangler@latest d1 export db-derbent --output backup.sql --local
npx wrangler@latest d1 export db-derbent --output backup.sql --remote


```

### Migrations

https://developers.cloudflare.com/d1/reference/migrations/
https://developers.cloudflare.com/d1/sql-api/foreign-keys/

```
PRAGMA defer_foreign_keys = on;

PRAGMA defer_foreign_keys = off;
```

## KV

https://developers.cloudflare.com/workers/wrangler/commands/#kv-namespace

```
npx wrangler@latest kv namespace create kv-derbent

```

## R2

```
npx wrangler@latest r2 bucket create r2-derbent


```
