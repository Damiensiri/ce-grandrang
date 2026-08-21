CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_content (content_key, value) VALUES
  ('hero.eyebrow', 'Brienne-le-Château · Aube'),
  ('hero.title', 'L’équitation, en grand.'),
  ('hero.text', 'Un lieu de confiance pour apprendre, progresser et vivre une relation unique avec les chevaux.'),
  ('hero.image', '/media/hero.jpg'),
  ('hero.buttonLabel', 'Découvrir le centre'),
  ('hero.buttonUrl', '#activites');
