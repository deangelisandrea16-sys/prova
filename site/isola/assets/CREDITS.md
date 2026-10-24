# Crediti

Modelli di **Kay Lousberg** (www.kaylousberg.com), licenza CC0 (pubblico dominio, uso commerciale consentito).

- KayKit: Medieval Hexagon Pack 1.0 — tessere, edifici, natura, oggetti → `kit.json`
  Fonte: https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0
- KayKit: Adventurers Character Pack 1.0 — `knight.json`, `mage.json`, `rogue.json` (copiati da `prototipi/regno/assets/`)

Animali di **Quaternius** (quaternius.com), CC0: `dragon.json`, `deer.json` — dal pacchetto npm `@netforge/asset-library-files` (copie CC0 elencate nel suo NOTICE), convertiti in glTF senza compressione con `strumenti/conv.mjs`.

`grass.jpg`, `dirt.jpg`: generate per questo progetto con `strumenti/gentex2.py`.
`coro.mp3`: il coro "Oh Sire!" del regno (generato per il progetto, vedi `prototipi/regno/assets/CREDITS.md`).

`kit.json` è generato da `strumenti/build-kit.mjs` (glTF-Transform: unione, deduplica, quantizzazione KHR_mesh_quantization senza WebAssembly, dati incorporati).
