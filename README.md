# Deaflix Writer — iPad

Une application d’écriture et de préparation visuelle pensée pour iPad.

## Ce que l’application permet

- organiser une histoire en chapitres, scènes et plans ;
- ouvrir son espace avec une connexion Google sécurisée par Firebase ;
- écrire chaque scène dans un espace calme et lisible ;
- discuter avec GPT‑5.6 via Evolink en lui donnant le contexte du projet ;
- générer les images des plans avec GPT Image 2 via Evolink ;
- conserver le projet et la clé API uniquement dans le stockage local de l’iPad ;
- exporter et restaurer une sauvegarde complète avec l’app Fichiers ;
- être installée depuis Safari sur l’écran d’accueil.

## Confidentialité

Le dépôt ne contient aucune clé Evolink et aucune histoire personnelle. La connexion Google protège l’accès à l’interface et sépare les sauvegardes locales par compte. La clé saisie dans les réglages, les textes et les images restent conservés uniquement dans le navigateur de l’appareil : ils ne sont pas synchronisés dans Firebase. Pour une deuxième copie de sécurité, utilisez régulièrement **Exporter**.

## Développement

```bash
npm install
npm run dev
```

La publication sur GitHub Pages est automatique après chaque envoi sur la branche `main`.
