ALTER TABLE pages ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
UPDATE pages SET menu_group = 'École d’équitation' WHERE slug IN ('cours', 'stages', 'balades', 'demi-pensions');
UPDATE pages SET menu_group = 'Écurie propriétaire' WHERE slug IN ('pensions', 'prestations');
