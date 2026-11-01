# Décorations saisonnières

Le moteur est chargé uniquement par l'accueil et les pages vitrines publiques. Les pages de pré-inscription, de confirmation, d'administration et l'écran dynamique ne le chargent pas.

## Administration

La gestion courante se fait depuis `Administration > Décorations saisonnières` (`/admin-seasonal.html`). L'écran permet de choisir le mode automatique, de forcer Noël ou de tout désactiver, puis de régler les jours de début et de fin. Les valeurs sont enregistrées dans la table `site_content` déjà utilisée par l'accueil ; aucune table supplémentaire n'est nécessaire.

L'écriture utilise l'authentification de l'administration existante et une liste fermée de clés autorisées. Les valeurs et les dates sont validées par le Worker avant enregistrement.

## Configuration de secours

La configuration de secours se trouve dans `public/seasonal/seasonal-config.js`. Elle s'applique tant qu'aucun réglage n'a été enregistré dans l'administration ou si l'API est momentanément indisponible.

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

## Intégration visuelle

Le renderer principal est inséré comme premier enfant de `.hero` ou `.page-hero`. Sa couche est positionnée absolument dans cette seule section : elle défile avec le contenu, reste derrière les textes et ne couvre jamais le viewport. Elle est inerte, masquée aux technologies d'assistance et ne reçoit aucun événement de pointeur.

Noël ajoute également deux habillages de fond limités à l'en-tête et à la bande d'actualité. Ils n'ajoutent aucun élément interactif et ne modifient pas l'empilement du menu. Les images décoratives sont optimisées et les flocons animés sont produits par une couche DOM légère limitée au héros.

Le moteur ne modifie ni l'en-tête, ni le menu, ni le positionnement ou le `z-index` des composants existants. Les décorations sont coupées aux limites du héros afin d'éviter tout débordement horizontal.

## Gabarit visuel validé — Noël V4

Ce gabarit constitue la référence de proportions pour les futurs thèmes (Halloween, Pâques, etc.). Il faut conserver les mêmes zones d'implantation et les mêmes espaces de sécurité, même si les illustrations changent.

### En-tête et décor horizontal

| Largeur d'écran | Hauteur totale de l'en-tête décoré | Réserve basse ajoutée | Hauteur visible du décor | Mise à l'échelle horizontale |
| --- | ---: | ---: | ---: | ---: |
| Bureau, plus de 1024 px | 114 px | 34 px | 56 px | 100 % |
| Tablette, de 701 à 1024 px | 108 px | 28 px | 52 px | 100 % |
| Mobile, jusqu'à 700 px | 106 px | 34 px | 42 px | 128 % |

Le décor horizontal est ancré sur `bottom: 0`, bord à bord, et doit rejoindre visuellement la bande « À la une » lorsqu'elle existe. Il reste attaché au bas de l'en-tête lorsque cette bande est absente. Il ne doit jamais occuper la zone fonctionnelle supérieure réservée au logo et à la navigation.

L'asset de référence du village mesure **1920 × 160 px**. Son contenu utile doit être concentré dans sa partie basse afin de préserver la lisibilité du logo et du menu. Sur mobile, le cadrage à 128 % donne davantage de présence au décor sans augmenter la hauteur générale de l'en-tête.

### Cadre de l'image principale

| Variante | Dimensions de l'asset de référence | Rendu CSS |
| --- | ---: | --- |
| Bureau/tablette | 1673 × 940 px, ratio 16:9 | étiré à 100 % × 100 % du héros ; largeur 106 % sur tablette |
| Mobile | 941 × 1672 px, ratio vertical proche de 9:16 | étiré à 125 % × 100 % du héros |

Les éléments décoratifs importants doivent rester sur le pourtour de l'asset. Le centre, la zone du titre, le texte descriptif et le bouton principal constituent une zone de sécurité et doivent rester dégagés. Le cadre est découpé par le héros (`overflow: hidden`) et défile avec lui ; il n'est jamais fixé au viewport.

### Règles de composition réutilisables

- Logo, navigation, bouton Menu et textes conservent toujours leur géométrie et restent au premier plan.
- Les décors utilisent les couches saisonnières uniquement ; ils ne changent aucun `z-index` ni positionnement des composants du site.
- Le décor d'en-tête est moins haut que la zone fonctionnelle du menu et s'appuie visuellement sur le bord inférieur.
- La version mobile possède son propre asset vertical et une composition simplifiée ; elle ne doit pas être une simple réduction de la version bureau.
- Les animations sont limitées au héros, n'interceptent aucun événement et sont supprimées avec `prefers-reduced-motion`.
- Sans thème actif, toutes les classes, couches, fonds et modifications temporaires sont retirés afin de restituer le site d'origine.

### Captures étalon

Les rendus validés sont conservés dans `artifacts/christmas-v4/` :

- `desktop.png` : référence bureau 1280 × 937 px ;
- `iphone.png` : référence mobile 390 × 943 px ;
- `comparison-v3-v4.jpg` : comparaison de la progression graphique.

Pour un futur thème, produire au minimum une capture aux mêmes largeurs avant validation. Les proportions ci-dessus doivent servir de point de départ ; seules de petites adaptations propres à l'illustration sont admises, sans déplacement du contenu existant.

## Extension

Un nouveau thème nécessite une entrée de configuration et un renderer associé dans `seasonal.js`. Chaque renderer produit une couche purement décorative, masquée aux technologies d'assistance et sans interaction avec la page.
