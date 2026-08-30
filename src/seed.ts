import type { Project, Settings } from './types';

export const uid = () => crypto.randomUUID();

export const defaultSettings: Settings = {
  apiKey: '',
  apiBase: 'https://api.evolink.ai',
  textModel: 'gpt-5.6-terra',
  imageModel: 'gpt-image-2',
};

export const starterProject: Project = {
  version: 1,
  id: uid(),
  title: 'Les aventures de Meluche',
  subtitle: 'Un projet Deaflix Writer',
  synopsis: "Meluche découvre qu'une petite lumière bleue s'est échappée du ciel et décide de la raccompagner chez elle.",
  updatedAt: new Date().toISOString(),
  images: [],
  chapters: [
    {
      id: uid(),
      title: 'Chapitre 1 — La lumière perdue',
      summary: 'Meluche découvre une étrange lueur dans le jardin.',
      scenes: [
        {
          id: uid(),
          title: 'Une étoile dans le jardin',
          summary: 'Au crépuscule, Meluche aperçoit une lumière bleue qui tremble sous les fleurs.',
          location: 'Jardin de Meluche',
          moment: 'Crépuscule',
          status: 'En cours',
          text: "Le soir descendait doucement sur le jardin. Meluche rangeait ses outils quand une lueur bleue se mit à danser sous les capucines.\n\nIl s'approcha sans bruit. La lumière frissonnait comme une toute petite étoile qui aurait oublié le chemin du ciel.",
          shots: [
            {
              id: uid(),
              title: 'Plan 1 — Le jardin',
              description: 'Plan large du jardin au crépuscule. Meluche range ses outils près de la cabane.',
              dialogue: '',
              camera: 'Plan large, légère contre-plongée',
              imagePrompt: 'Meluche dans un jardin merveilleux au crépuscule, petite cabane en bois, fleurs colorées, lumière cinématographique douce, plan large, conte illustré haut de gamme, cohérence du personnage',
            },
            {
              id: uid(),
              title: 'Plan 2 — La découverte',
              description: 'Meluche remarque une lueur bleue sous les fleurs et se retourne, surpris.',
              dialogue: 'Meluche : « Qui est là ? »',
              camera: 'Plan moyen, mise au point sur le regard',
              imagePrompt: 'Meluche se retourne avec surprise vers une petite lueur bleue cachée sous des fleurs, jardin au crépuscule, plan moyen, profondeur de champ, conte cinématographique, cohérence du personnage',
            },
            {
              id: uid(),
              title: 'Plan 3 — La petite étoile',
              description: 'Gros plan sur les mains de Meluche entourant la lumière tremblante.',
              dialogue: 'Meluche : « Ne t’inquiète pas, je vais t’aider. »',
              camera: 'Gros plan, lumière volumétrique bleue',
              imagePrompt: 'Gros plan des mains de Meluche protégeant une minuscule étoile bleue lumineuse, émotion tendre, lumière volumétrique, arrière-plan de jardin flou, image de film d’animation haut de gamme',
            },
          ],
        },
      ],
    },
    {
      id: uid(),
      title: 'Chapitre 2 — Le chemin du ciel',
      summary: 'Meluche cherche le point le plus haut de la vallée.',
      scenes: [
        {
          id: uid(),
          title: 'La carte sous la lune',
          summary: 'Meluche prépare son voyage et trace une route jusqu’à la colline.',
          location: 'Atelier de Meluche',
          moment: 'Nuit',
          status: 'À écrire',
          text: '',
          shots: [],
        },
      ],
    },
  ],
};
