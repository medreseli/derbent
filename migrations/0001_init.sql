CREATE TABLE users (
    id TEXT PRIMARY KEY,                -- UUIDv7 or NanoID
    app TEXT NOT NULL,                  -- 'sso', 'geveze', 'hodan', etc.
    email TEXT NOT NULL,                -- 
    email_verified BOOLEAN DEFAULT 0,   -- 0 = False, 1 = True
    phash TEXT NOT NULL,                -- Password Hash - PBKDF2 (Web Crypto API)
    token_version INTEGER DEFAULT 1,    -- For tracking session validity
    metadata TEXT DEFAULT '{}',         -- App-specific JSON data

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Allows same email for different apps, but only once per app.
CREATE UNIQUE INDEX idx_users_email_app ON users(email, app);

-- Fast lookup for emails across all apps
CREATE INDEX idx_users_email ON users(email);

-----------------------------------------------

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,                       -- Can be NULL if user is not known
    action TEXT NOT NULL,               -- 'login_success', 'login_failed', etc.
    email TEXT,                         -- Store email if user_id is null or for convenience
    ip TEXT,
    user_agent TEXT,
    details TEXT,                       -- JSON for extra details
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_email ON audit_logs(email);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);