# GRADIENT 🎨

Toolkit web pour les artistes qui veulent passer du pixel à la mine : analyse d'image en niveaux de gris, mapping Darwin 9H→9B, loupe pixel-perfect, grille de report, et export fiche de travail HD.

## Stack
- HTML5 + CSS3 (glassmorphism violet sombre)
- Vanilla JS (Canvas API)
- 100% client-side (aucun backend)

## Features
- ⚡ Import image et conversion immédiate en NB (luminance perceptive 0.299/0.587/0.114)
- 🖌️ Mapping 24 crayons (9H → 9B) avec sampling au survol + loupe zoom 4x
- 🧭 Grille de report réglable (2–10) avec repères alphanumériques
- 🎛️ Mode « simplifier les masses » (posterize 5 niveaux) pour les value studies
- 📋 Palette de session : enregistre les crayons réellement utilisés
- 📤 Export fiche de travail HD (PNG) : image NB + grille + crayons utilisés + légende

## UI rapide
- Barre gauche (import + réglages)
- Vue centrale (avant/après, canvases max-height 90vh, fond #0a0a0c)
- Barre droite (palette utilisée + exports)
- Badge crayon/valeur sous le header

## Usage dev
```bash
# ouvrir dans le navigateur
open index.html
```
Aucun build. Si tu modifies le JS/CSS, rafraîchis.

## Tips
- Clique pour ajouter un crayon à la palette ; l’export ne liste que ceux échantillonnés.
- Pour la grille : slider (0 = off, 10 = dense). Elle se recalcule à la taille native du canvas.
- Loupe = `clientX/Y` (fixed), pointe ne bloque jamais les clics.

## Roadmap (idées)
- ✅ Export HD local
- ⏳ Export PDF annoté
- ⏳ Palettes custom par marques (Caran d'Ache, Faber-Castell)

## Licence
MIT. Fais-en bon usage.
