CREATE TABLE users (
    id TEXT PRIMARY KEY,                    -- UUIDv7 or NanoID
    app TEXT NOT NULL,                      -- 'sso', 'geveze', 'hodan', etc.
    email TEXT NOT NULL,                    -- 
    email_verified BOOLEAN DEFAULT 0,       -- 0 = False, 1 = True
    phash TEXT NOT NULL,                    -- Password Hash - PBKDF2 (Web Crypto API)
    token_version INTEGER DEFAULT 1,        -- For tracking session validity
    metadata TEXT DEFAULT '{}',             -- App-specific JSON data
    two_factor_secret TEXT,                 -- Base32 encoded TOTP Secret
    two_factor_enabled BOOLEAN DEFAULT 0,   -- 0 = False, 1 = True
    is_locked BOOLEAN DEFAULT 0,            -- 0 = False, 1 = True

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

-----------------------------------------------

CREATE TABLE apps (
    id TEXT PRIMARY KEY,          -- e.g., 'sso', 'hodan', 'namedar'
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,                    -- Raw SVG string
    prod_url TEXT NOT NULL,
    dev_url TEXT NOT NULL,
    allow_signups BOOLEAN DEFAULT 1, -- 0 = False, 1 = True
    allow_logins BOOLEAN DEFAULT 1,  -- 0 = False, 1 = True
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert the foundational SSO app
INSERT INTO apps (id, name, description, icon, prod_url, dev_url, allow_signups, allow_logins)
VALUES (
    'sso', 
    'Single sign-on', 
    'Your one account for all our apps.', 
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>', 
    'https://derbent.zerdalu.com', 
    'http://localhost:7777',
    1,
    1
);