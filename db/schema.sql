CREATE TABLE users (
    id TEXT PRIMARY KEY,                -- UUIDv7 or NanoID
    app TEXT NOT NULL,                  -- 'sso', 'geveze', 'hodan', etc.
    email TEXT NOT NULL,                -- 
    phash TEXT NOT NULL,                -- Password Hash - PBKDF2 (Web Crypto API)
    metadata TEXT DEFAULT '{}',         -- App-specific JSON data

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Allows same email for different apps, but only once per app.
CREATE UNIQUE INDEX idx_users_email_app ON users(email, app);

-- Fast lookup for emails across all apps
CREATE INDEX idx_users_email ON users(email);
