# GRADIENT

Toolkit web pour passer du pixel à la mine : analyse d'image en niveaux de gris, mapping Darwin 9H→9B, loupe pixel-perfect, grille de report, export fiche de travail HD.

## Stack
- HTML5 + CSS3 (glassmorphism violet sombre)
- Vanilla JS (Canvas API)
- 100% client-side (aucun backend)

## Features
- Import image et conversion immédiate en NB (luminance perceptive 0.299/0.587/0.114)
- Mapping 24 crayons (9H → 9B) avec sampling au survol + loupe zoom 4x
- Grille de report réglable (2–10) avec repères alphanumériques
- Mode « simplifier les masses » (posterize 5 niveaux) pour les value studies
- Palette de session : enregistre les crayons réellement utilisés
- Export fiche de travail HD (PNG) : image NB + grille + crayons utilisés + légende

## UI rapide
- Sidebar gauche : import + réglages
- Vue centrale : avant/après, canvases max-height 90vh, fond #0a0a0c
- Sidebar droite : palette utilisée + exports
- Badge crayon/valeur sous le header

## Usage dev
1) Télécharger le repo (ou cloner).  
2) Ouvrir `index.html` dans le navigateur (double-clic ou `open index.html`).  
Aucun build. Rafraîchir après modification JS/CSS.

## Tips
- Clique pour ajouter un crayon à la palette ; l’export ne liste que ceux échantillonnés.
- Grille : slider (0 = off, 10 = dense). Recalculée à la taille native du canvas.
- Loupe suit `clientX/Y`, pointer-events désactivés pour ne pas bloquer les clics.

## Roadmap (idées)
- Export PDF annoté
- Palettes custom par marques (Caran d'Ache, Faber-Castell)

## Licence
MIT
