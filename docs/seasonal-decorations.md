# Décorations saisonnières

Le moteur est chargé uniquement par l'accueil et les pages vitrines publiques. Les pages de pré-inscription, de confirmation, d'administration et l'écran dynamique ne le chargent pas.

## Configuration

La configuration publique se trouve dans `public/seasonal/seasonal-config.js`.

- `mode: 'auto'` active le thème correspondant à la date.
- `mode: 'off'` désactive toutes les décorations.
- `mode: 'christmas'` force Noël, indépendamment de la date.
- `enabled: false` désactive un thème sans supprimer sa configuration.
- `start` et `end` définissent une période annuelle inclusive. Une période peut traverser le changement d'année.

## Prévisualisation

L'ajout de `?season=christmas` à une URL force Noël dans l'onglet courant. Le choix reste actif pendant la navigation dans cet onglet.

- `?season=off` désactive les décorations dans l'onglet.
- `?season=auto` efface la prévisualisation et rétablit le calendrier configuré.

Ces paramètres n'écrivent ni dans D1 ni dans R2 et ne modifient aucun compte utilisateur.

## Extension

Un nouveau thème nécessite une entrée de configuration et un renderer associé dans `seasonal.js`. Chaque renderer produit une couche purement décorative, masquée aux technologies d'assistance et sans interaction avec la page.
