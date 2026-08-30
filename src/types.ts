export type ImageAsset = {
  id: string;
  shotId: string;
  sceneId: string;
  prompt: string;
  src: string;
  createdAt: string;
  savedLocally: boolean;
};

export type Shot = {
  id: string;
  title: string;
  description: string;
  dialogue: string;
  imagePrompt: string;
  camera: string;
};

export type Scene = {
  id: string;
  title: string;
  summary: string;
  text: string;
  location: string;
  moment: string;
  status: 'Idée' | 'À écrire' | 'En cours' | 'Terminée';
  shots: Shot[];
};

export type Chapter = {
  id: string;
  title: string;
  summary: string;
  scenes: Scene[];
};

export type Project = {
  version: 1;
  id: string;
  title: string;
  subtitle: string;
  synopsis: string;
  chapters: Chapter[];
  images: ImageAsset[];
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type Settings = {
  apiKey: string;
  apiBase: string;
  textModel: 'gpt-5.6-luna' | 'gpt-5.6-terra' | 'gpt-5.6-sol';
  imageModel: 'gpt-image-2' | 'gpt-image-2-beta';
};
