CREATE TABLE IF NOT EXISTS display_playlist_items (
  id TEXT PRIMARY KEY, active INTEGER NOT NULL DEFAULT 1, position INTEGER NOT NULL DEFAULT 10,
  type TEXT NOT NULL CHECK (type IN ('site_page','news','image','video','external_url','message')),
  source_slug TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '', media_url TEXT NOT NULL DEFAULT '', external_url TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 12, transition TEXT NOT NULL DEFAULT 'fade', starts_at TEXT NOT NULL DEFAULT '', ends_at TEXT NOT NULL DEFAULT '', time_from TEXT NOT NULL DEFAULT '', time_to TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS display_playlist_order ON display_playlist_items(position, updated_at);
