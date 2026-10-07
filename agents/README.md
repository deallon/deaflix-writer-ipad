# Deaflix Agents — MVP local

Service autonome, sans modification du Writer iPad, de batch/dailies ni de la publication Pages. Node ≥22.13. Les « agents » sont des workers spécialisés déterministes ; aucun appel LLM ni abonnement ChatGPT supplémentaire n'est requis. Extraction de frames candidates, pas reconnaissance sémantique des grimaces.

## Installation et lancement

Depuis `agents/` :

```sh
npm ci
npm test
npm start -- character-add celestin
npm start -- characters
npm start -- run examples/jobs.json
```

Copier `examples/jobs.json` et remplacer les chemins médias par des chemins locaux réels. Les chemins relatifs sont résolus depuis le dossier de lancement. `ffmpeg-static` fournit FFmpeg à l'installation (accès réseau nécessaire). En environnement restreint utiliser `DEAFLIX_FFMPEG` avec un exécutable installé.

Chaque job `pipeline` extrait une vidéo puis filtre et traite ses images. Un job `images` accepte `files: ["chemin/image.png"]`. Un job `prepare` écrit seulement une demande d'intégration. Jobs indépendants exécutés en parallèle, maximum configurable ; les étapes d'un pipeline restent séquentielles. Une erreur n'arrête pas les autres jobs et le CLI retourne un code non nul si un job échoue.

## Variables d'environnement

| Variable | Défaut / rôle |
| --- | --- |
| DEAFLIX_DATA_DIR | `data`, racine de la bibliothèque et des runs |
| DEAFLIX_CONCURRENCY | `3`, entier entre 1 et 16 |
| DEAFLIX_FFMPEG | exécutable embarqué, surcharge possible |
| DEAFLIX_BLENDER | chemin Blender, pour préparation de l'adaptateur |
| COMFYUI_URL | URL de votre instance, pour préparation |
| RUNPOD_API_KEY | secret RunPod, jamais écrit par l'adaptateur |
| RUNPOD_ENDPOINT_ID | endpoint existant, pour préparation |

Définir ces variables dans le shell. Pas de chargement automatique `.env` : avec Node utiliser `node --env-file=.env src/cli.mjs run examples/jobs.json`. Ne jamais versionner vos clés.

Options par job : `fps` (0–10, strictement positif, défaut 1), `seconds` (0–3600, strictement positif, défaut 60), `minSize` (défaut 64 pixels), `minSharpness` (défaut 0, seuil Sharp à calibrer sur vos images), `scale` (entier 1–4, défaut 1). Upscale Lanczos configurable, pas un modèle génératif. QC : décodage, taille, netteté et doublons exacts après normalisation, par job. Toutes les images extraites restent dans le run ; les images retenues, la grille et le rapport QC vont dans la bibliothèque. Expression fournie par vous ou `unclassified`.

```text
data/characters/celestin/character.json
data/characters/celestin/expressions/unclassified/<run-uuid>/<job-id>/
data/runs/<run-uuid>/<job-id>/status.json
data/runs/<run-uuid>/<job-id>/frames/
data/runs/<run-uuid>/manifest.json
```

Les métadonnées de personnage existantes ne sont jamais écrasées. Runs isolés par UUID ; relancer crée un nouveau run. Les états sont écrits atomiquement. Pas de reprise automatique après crash ni de file d'attente distribuée dans ce MVP. Les jobs sont des fichiers locaux de confiance : ils autorisent la lecture des chemins indiqués. Le service n'est pas exposé sur Internet. Limiter fps/durée/concurrence selon RAM et disque ; les grilles utilisent la mémoire proportionnellement au nombre d'images.

## Intégrations préparées et accès nécessaires

Blender/3D, ComfyUI et RunPod produisent des fichiers `*-request.json` avec `prepared_only` et les noms des variables manquantes. Même si les variables sont présentes, aucun traitement externe n'est lancé. Pour connecter réellement ces services, fournir : chemin/version Blender et scène/script attendu ; URL ComfyUI accessible et export API du workflow avec modèles ; endpoint RunPod existant, schéma d'entrée/sortie et clé via votre environnement local. Pas d'endpoint, modèle, workflow ou API inventé. Ne pas fournir de secret dans GitHub ou dans le chat.

## Validation

`npm test` vérifie la concurrence réelle et sa limite, l'isolation des erreurs et les états persistés, la bibliothèque, les chemins de personnage, QC/doublons/upscale/grille, un vrai clip FFmpeg généré puis extrait, et les adaptateurs sans exécution ni fuite de clés.

Inspection : dépôt `deallon/deaflix-writer-ipad`, base `3ceaae238788de9ecedf23bdb6058ef24ea24194`, branche `codex/deaflix-agents-mvp`. Le connecteur de liste n'a renvoyé aucun autre dépôt ; cela ne prouve pas leur absence. Aucun fichier existant de l'application n'est modifié.
