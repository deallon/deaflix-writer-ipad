import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Download,
  FileText,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Menu,
  MoreHorizontal,
  Plus,
  Save,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
import { readLocal, writeLocal } from './db';
import { defaultSettings, starterProject, uid } from './seed';
import type { Chapter, ChatMessage, Project, Scene, Settings, Shot } from './types';
import './styles.css';

type Tab = 'structure' | 'ecriture' | 'ia' | 'galerie';
type SaveState = 'saved' | 'saving' | 'offline';
type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };
type ImageTaskStatus = {
  id?: string;
  status?: string;
  progress?: number;
  results?: string[];
  result_data?: Array<{ url?: string }>;
  error?: { message?: string };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function App() {
  const [project, setProject] = useState<Project>(starterProject);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [selectedChapterId, setSelectedChapterId] = useState(starterProject.chapters[0].id);
  const [selectedSceneId, setSelectedSceneId] = useState(starterProject.chapters[0].scenes[0].id);
  const [selectedShotId, setSelectedShotId] = useState(starterProject.chapters[0].scenes[0].shots[0].id);
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set(starterProject.chapters.map((chapter) => chapter.id)));
  const [tab, setTab] = useState<Tab>('structure');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState('16:9');
  const [imageQuality, setImageQuality] = useState('low');
  const [imageCount, setImageCount] = useState(1);
  const [imageJob, setImageJob] = useState<{ label: string; progress: number } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      readLocal<Project>('project'),
      readLocal<Settings>('settings'),
      readLocal<ChatMessage[]>('messages'),
    ])
      .then(([savedProject, savedSettings, savedMessages]) => {
        const nextProject = savedProject ?? starterProject;
        setProject(nextProject);
        setSettings(savedSettings ?? defaultSettings);
        setMessages(savedMessages ?? []);
        const chapter = nextProject.chapters[0];
        const scene = chapter?.scenes[0];
        setSelectedChapterId(chapter?.id ?? '');
        setSelectedSceneId(scene?.id ?? '');
        setSelectedShotId(scene?.shots[0]?.id ?? '');
        setOpenChapters(new Set(nextProject.chapters.map((item) => item.id)));
      })
      .catch(() => setSaveState('offline'))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      Promise.all([
        writeLocal('project', { ...project, updatedAt: new Date().toISOString() }),
        writeLocal('settings', settings),
        writeLocal('messages', messages),
      ])
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('offline'));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [project, settings, messages, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => undefined);
    }
  }, []);

  const selection = useMemo(() => {
    for (const chapter of project.chapters) {
      const scene = chapter.scenes.find((item) => item.id === selectedSceneId);
      if (scene) {
        return {
          chapter,
          scene,
          shot: scene.shots.find((item) => item.id === selectedShotId),
        };
      }
    }
    return { chapter: undefined, scene: undefined, shot: undefined };
  }, [project, selectedSceneId, selectedShotId]);

  useEffect(() => {
    setImagePrompt(selection.shot?.imagePrompt ?? selection.scene?.summary ?? '');
  }, [selectedShotId, selectedSceneId, selection.shot?.imagePrompt, selection.scene?.summary]);

  const mutateProject = (change: (draft: Project) => void) => {
    setProject((current) => {
      const draft = structuredClone(current);
      change(draft);
      draft.updatedAt = new Date().toISOString();
      return draft;
    });
  };

  const updateScene = (fields: Partial<Scene>) => {
    mutateProject((draft) => {
      const scene = draft.chapters.flatMap((chapter) => chapter.scenes).find((item) => item.id === selectedSceneId);
      if (scene) Object.assign(scene, fields);
    });
  };

  const updateShot = (shotId: string, fields: Partial<Shot>) => {
    mutateProject((draft) => {
      const scene = draft.chapters.flatMap((chapter) => chapter.scenes).find((item) => item.id === selectedSceneId);
      const shot = scene?.shots.find((item) => item.id === shotId);
      if (shot) Object.assign(shot, fields);
    });
  };

  const addChapter = () => {
    const chapter: Chapter = { id: uid(), title: `Chapitre ${project.chapters.length + 1}`, summary: '', scenes: [] };
    mutateProject((draft) => draft.chapters.push(chapter));
    setOpenChapters((current) => new Set([...current, chapter.id]));
    setSelectedChapterId(chapter.id);
  };

  const addScene = (chapterId = selectedChapterId || project.chapters[0]?.id) => {
    if (!chapterId) return;
    const scene: Scene = {
      id: uid(),
      title: 'Nouvelle scène',
      summary: '',
      text: '',
      location: '',
      moment: '',
      status: 'Idée',
      shots: [],
    };
    mutateProject((draft) => draft.chapters.find((chapter) => chapter.id === chapterId)?.scenes.push(scene));
    setSelectedChapterId(chapterId);
    setSelectedSceneId(scene.id);
    setSelectedShotId('');
    setOpenChapters((current) => new Set([...current, chapterId]));
    setTab('structure');
    setNavOpen(false);
  };

  const addShot = () => {
    if (!selection.scene) return;
    const shot: Shot = {
      id: uid(),
      title: `Plan ${selection.scene.shots.length + 1}`,
      description: '',
      dialogue: '',
      camera: 'Plan moyen',
      imagePrompt: '',
    };
    mutateProject((draft) => {
      draft.chapters.flatMap((chapter) => chapter.scenes).find((scene) => scene.id === selectedSceneId)?.shots.push(shot);
    });
    setSelectedShotId(shot.id);
  };

  const deleteScene = () => {
    if (!selection.scene || !window.confirm(`Supprimer « ${selection.scene.title} » ?`)) return;
    mutateProject((draft) => {
      const chapter = draft.chapters.find((item) => item.id === selection.chapter?.id);
      if (chapter) chapter.scenes = chapter.scenes.filter((scene) => scene.id !== selectedSceneId);
    });
    const remaining = selection.chapter?.scenes.filter((scene) => scene.id !== selectedSceneId) ?? [];
    setSelectedSceneId(remaining[0]?.id ?? '');
    setSelectedShotId(remaining[0]?.shots[0]?.id ?? '');
  };

  const deleteShot = (shotId: string) => {
    mutateProject((draft) => {
      const scene = draft.chapters.flatMap((chapter) => chapter.scenes).find((item) => item.id === selectedSceneId);
      if (scene) scene.shots = scene.shots.filter((shot) => shot.id !== shotId);
    });
    if (selectedShotId === shotId) setSelectedShotId('');
  };

  const selectScene = (chapterId: string, scene: Scene) => {
    setSelectedChapterId(chapterId);
    setSelectedSceneId(scene.id);
    setSelectedShotId(scene.shots[0]?.id ?? '');
    setNavOpen(false);
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/[^a-z0-9à-ÿ]+/gi, '-').toLowerCase() || 'deaflix-projet'}.deaflix.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast('Sauvegarde exportée dans Fichiers');
  };

  const importProject = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Project;
      if (!parsed.chapters || parsed.version !== 1) throw new Error('format');
      setProject(parsed);
      const chapter = parsed.chapters[0];
      setSelectedChapterId(chapter?.id ?? '');
      setSelectedSceneId(chapter?.scenes[0]?.id ?? '');
      setSelectedShotId(chapter?.scenes[0]?.shots[0]?.id ?? '');
      setToast('Projet restauré');
    } catch {
      setToast("Ce fichier n'est pas une sauvegarde Deaflix valide");
    }
  };

  const requireApiKey = () => {
    if (settings.apiKey.trim()) return true;
    setSettingsOpen(true);
    setToast('Ajoutez votre clé Evolink pour utiliser l’IA');
    return false;
  };

  const sendChat = async (suggestion?: string) => {
    const text = (suggestion ?? chatInput).trim();
    if (!text || chatLoading || !requireApiKey()) return;
    const userMessage: ChatMessage = { id: uid(), role: 'user', content: text, createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const context = selection.scene
        ? `PROJET: ${project.title}\nSYNOPSIS: ${project.synopsis}\nCHAPITRE: ${selection.chapter?.title}\nSCÈNE: ${selection.scene.title}\nRÉSUMÉ: ${selection.scene.summary}\nTEXTE: ${selection.scene.text}\nPLANS: ${selection.scene.shots.map((shot) => `${shot.title}: ${shot.description}`).join(' | ')}`
        : `PROJET: ${project.title}\nSYNOPSIS: ${project.synopsis}`;
      const response = await fetch(`${settings.apiBase.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.apiKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.textModel,
          reasoning_effort: 'medium',
          max_tokens: 1800,
          messages: [
            {
              role: 'system',
              content: "Tu es l'agent d'écriture de Deaflix Writer. Tu aides à écrire en français, à structurer les chapitres, scènes et plans, et à préparer des prompts visuels précis. Respecte la voix et les personnages de l'auteur. Ne remplace jamais son intention. Réponds clairement et de façon directement utilisable.\n\n" + context,
            },
            ...nextMessages.slice(-10).map(({ role, content }) => ({ role, content })),
          ],
        }),
      });
      if (!response.ok) throw new Error((await response.text()) || `Erreur ${response.status}`);
      const data = (await response.json()) as ChatResponse;
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Réponse vide');
      setMessages((current) => [...current, { id: uid(), role: 'assistant', content, createdAt: new Date().toISOString() }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connexion impossible';
      setToast(`Evolink : ${message.slice(0, 140)}`);
    } finally {
      setChatLoading(false);
    }
  };

  const urlToDataUrl = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Téléchargement impossible');
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Format d’image invalide'));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };

  const generateImages = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt || !selection.scene || !requireApiKey() || imageJob) return;
    setImageJob({ label: 'Envoi du plan à GPT Image…', progress: 4 });
    try {
      if (selection.shot) updateShot(selection.shot.id, { imagePrompt: prompt });
      const response = await fetch(`${settings.apiBase.replace(/\/$/, '')}/v1/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.apiKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.imageModel,
          prompt,
          size: imageSize,
          resolution: '1K',
          quality: settings.imageModel === 'gpt-image-2-beta' ? undefined : imageQuality,
          background: 'opaque',
          n: settings.imageModel === 'gpt-image-2-beta' ? 1 : imageCount,
        }),
      });
      if (!response.ok) throw new Error((await response.text()) || `Erreur ${response.status}`);
      const task = (await response.json()) as ImageTaskStatus;
      if (!task?.id) throw new Error("Evolink n'a pas renvoyé de tâche");
      let completed: ImageTaskStatus | null = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await sleep(attempt < 5 ? 4000 : 7000);
        const statusResponse = await fetch(`${settings.apiBase.replace(/\/$/, '')}/v1/tasks/${encodeURIComponent(task.id)}`, {
          headers: { Authorization: `Bearer ${settings.apiKey.trim()}` },
        });
        if (!statusResponse.ok) throw new Error(`Suivi de l’image impossible (${statusResponse.status})`);
        const status = (await statusResponse.json()) as ImageTaskStatus;
        const progress = Number(status.progress) || Math.min(92, 10 + attempt * 4);
        setImageJob({ label: status.status === 'pending' ? 'Image en attente…' : 'GPT Image dessine le plan…', progress });
        if (status.status === 'completed') {
          completed = status;
          break;
        }
        if (status.status && ['failed', 'cancelled'].includes(status.status)) throw new Error(status.error?.message || `Tâche ${status.status}`);
      }
      const urls = (completed?.results ?? completed?.result_data?.map((item) => item.url) ?? []).filter(
        (url): url is string => typeof url === 'string' && url.length > 0,
      );
      if (!urls.length) throw new Error("L’image n’a pas été reçue avant le délai maximum");
      setImageJob({ label: 'Sauvegarde sur votre iPad…', progress: 96 });
      const assets = await Promise.all(
        urls.map(async (url: string) => {
          try {
            return { src: await urlToDataUrl(url), savedLocally: true };
          } catch {
            return { src: url, savedLocally: false };
          }
        }),
      );
      mutateProject((draft) => {
        draft.images.unshift(
          ...assets.map((asset) => ({
            id: uid(),
            shotId: selection.shot?.id ?? '',
            sceneId: selection.scene!.id,
            prompt,
            createdAt: new Date().toISOString(),
            ...asset,
          })),
        );
      });
      setTab('galerie');
      setToast(assets.every((asset) => asset.savedLocally) ? 'Image enregistrée sur cet iPad' : 'Image créée — exportez-la rapidement');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Génération impossible';
      setToast(`Evolink : ${message.slice(0, 150)}`);
    } finally {
      setImageJob(null);
    }
  };

  const saveAssistantAsScene = (message: ChatMessage) => {
    if (!selectedChapterId) return;
    const title = message.content.split('\n').find((line) => line.trim())?.replace(/^#+\s*/, '').slice(0, 70) || 'Scène proposée par l’IA';
    const scene: Scene = {
      id: uid(),
      title,
      summary: 'Proposition créée par l’assistant IA',
      text: message.content,
      location: '',
      moment: '',
      status: 'À écrire',
      shots: [],
    };
    mutateProject((draft) => draft.chapters.find((chapter) => chapter.id === selectedChapterId)?.scenes.push(scene));
    setSelectedSceneId(scene.id);
    setSelectedShotId('');
    setTab('ecriture');
    setToast('Proposition ajoutée comme nouvelle scène');
  };

  if (!ready) {
    return (
      <div className="splash">
        <span className="splash-logo" style={{ backgroundImage: 'url("./icons/icon-192.png")' }} aria-hidden="true" />
        <span>Ouverture de votre studio…</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <button className="icon-button mobile-menu" onClick={() => setNavOpen(true)} aria-label="Ouvrir les chapitres"><Menu size={20} /></button>
          <span className="brand-logo" style={{ backgroundImage: 'url("./icons/icon-192.png")' }} aria-hidden="true" />
          <div>
            <strong>DEAFLIX</strong>
            <span>WRITER</span>
          </div>
        </div>
        <div className="project-heading">
          <input value={project.title} onChange={(event) => mutateProject((draft) => { draft.title = event.target.value; })} aria-label="Titre du projet" />
          <div className={`save-indicator ${saveState}`}>
            {saveState === 'saved' ? <Check size={13} /> : <Save size={13} />}
            {saveState === 'saved' ? 'Sauvegardé sur cet iPad' : saveState === 'saving' ? 'Sauvegarde…' : 'Stockage indisponible'}
          </div>
        </div>
        <div className="top-actions">
          <input ref={importRef} hidden type="file" accept=".json,.deaflix.json,application/json" onChange={(event) => event.target.files?.[0] && importProject(event.target.files[0])} />
          <button className="secondary-button hide-small" onClick={() => importRef.current?.click()}><Upload size={16} /> Restaurer</button>
          <button className="secondary-button" onClick={exportProject}><Download size={16} /> <span className="hide-small">Exporter</span></button>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Réglages"><SettingsIcon size={20} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`navigator ${navOpen ? 'open' : ''}`}>
          <div className="nav-mobile-head">
            <strong>Votre histoire</strong>
            <button className="icon-button" onClick={() => setNavOpen(false)}><X size={20} /></button>
          </div>
          <div className="nav-title-row">
            <div><span>Structure</span><strong>Chapitres & scènes</strong></div>
            <button className="small-add" onClick={addChapter} title="Nouveau chapitre"><Plus size={17} /></button>
          </div>
          <div className="chapter-list">
            {project.chapters.map((chapter, chapterIndex) => {
              const isOpen = openChapters.has(chapter.id);
              return (
                <section className="chapter" key={chapter.id}>
                  <button className={`chapter-heading ${selectedChapterId === chapter.id ? 'active' : ''}`} onClick={() => {
                    setSelectedChapterId(chapter.id);
                    setOpenChapters((current) => {
                      const next = new Set(current);
                      if (next.has(chapter.id)) next.delete(chapter.id);
                      else next.add(chapter.id);
                      return next;
                    });
                  }}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="chapter-number">{String(chapterIndex + 1).padStart(2, '0')}</span>
                    <span className="chapter-name">{chapter.title}</span>
                    <MoreHorizontal size={15} />
                  </button>
                  {isOpen && (
                    <div className="scene-list">
                      {chapter.scenes.map((scene) => (
                        <button aria-label={`Ouvrir la scène ${scene.title}`} className={`scene-link ${selectedSceneId === scene.id ? 'active' : ''}`} key={scene.id} onClick={() => selectScene(chapter.id, scene)}>
                          <span className={`status-dot status-${scene.status.replace(/\s/g, '-').toLowerCase()}`} />
                          <span><strong>{scene.title}</strong><small>{scene.shots.length} plan{scene.shots.length !== 1 ? 's' : ''} · {scene.status}</small></span>
                        </button>
                      ))}
                      <button className="add-scene" onClick={() => addScene(chapter.id)}><Plus size={15} /> Ajouter une scène</button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <button className="new-chapter" onClick={addChapter}><Plus size={17} /> Nouveau chapitre</button>
          <div className="storage-note"><Archive size={16} /><span><strong>Local et privé</strong><small>Votre histoire reste sur cet iPad.</small></span></div>
        </aside>
        {navOpen && <button className="nav-backdrop" onClick={() => setNavOpen(false)} aria-label="Fermer" />}

        <main className="main-panel">
          <nav className="tabs" aria-label="Sections">
            <TabButton active={tab === 'structure'} icon={<LayoutGrid size={17} />} label="Structure" onClick={() => setTab('structure')} />
            <TabButton active={tab === 'ecriture'} icon={<FileText size={17} />} label="Écriture" onClick={() => setTab('ecriture')} />
            <TabButton active={tab === 'ia'} icon={<Sparkles size={17} />} label="Agent IA" onClick={() => setTab('ia')} />
            <TabButton active={tab === 'galerie'} icon={<ImageIcon size={17} />} label="Galerie" badge={project.images.length || undefined} onClick={() => setTab('galerie')} />
          </nav>

          {!selection.scene ? (
            <div className="empty-state">
              <div className="empty-icon"><Clapperboard size={30} /></div>
              <h1>Commencez une nouvelle scène</h1>
              <p>Une scène contient votre texte et les différents plans qui composeront l’image ou la séquence.</p>
              <button className="primary-button" onClick={() => addScene()}><Plus size={17} /> Créer une scène</button>
            </div>
          ) : tab === 'structure' ? (
            <StructureView scene={selection.scene} chapter={selection.chapter!} selectedShotId={selectedShotId} setSelectedShotId={setSelectedShotId} updateScene={updateScene} updateShot={updateShot} addShot={addShot} deleteShot={deleteShot} deleteScene={deleteScene} openImage={(shot) => { setSelectedShotId(shot.id); setImagePrompt(shot.imagePrompt || shot.description); setTab('ia'); }} />
          ) : tab === 'ecriture' ? (
            <WritingView scene={selection.scene} chapter={selection.chapter!} updateScene={updateScene} openAI={() => setTab('ia')} />
          ) : tab === 'ia' ? (
            <AIView
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChat={sendChat}
              chatLoading={chatLoading}
              saveAsScene={saveAssistantAsScene}
              scene={selection.scene}
              shot={selection.shot}
              imagePrompt={imagePrompt}
              setImagePrompt={setImagePrompt}
              imageSize={imageSize}
              setImageSize={setImageSize}
              imageQuality={imageQuality}
              setImageQuality={setImageQuality}
              imageCount={imageCount}
              setImageCount={setImageCount}
              imageJob={imageJob}
              generateImages={generateImages}
              model={settings.textModel}
              imageModel={settings.imageModel}
              configure={() => setSettingsOpen(true)}
            />
          ) : (
            <GalleryView project={project} selectImage={(sceneId, shotId) => { setSelectedSceneId(sceneId); setSelectedShotId(shotId); }} removeImage={(id) => mutateProject((draft) => { draft.images = draft.images.filter((image) => image.id !== id); })} />
          )}
        </main>
      </div>

      {settingsOpen && (
        <SettingsModal settings={settings} setSettings={setSettings} close={() => setSettingsOpen(false)} />
      )}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function TabButton({ active, icon, label, badge, onClick }: { active: boolean; icon: React.ReactNode; label: string; badge?: number; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span>{badge ? <b>{badge}</b> : null}</button>;
}

function StructureView({ scene, chapter, selectedShotId, setSelectedShotId, updateScene, updateShot, addShot, deleteShot, deleteScene, openImage }: {
  scene: Scene; chapter: Chapter; selectedShotId: string; setSelectedShotId: (id: string) => void; updateScene: (fields: Partial<Scene>) => void; updateShot: (id: string, fields: Partial<Shot>) => void; addShot: () => void; deleteShot: (id: string) => void; deleteScene: () => void; openImage: (shot: Shot) => void;
}) {
  return (
    <div className="content structure-view">
      <div className="breadcrumb"><BookOpen size={14} /> {chapter.title} <ChevronRight size={13} /> Scène</div>
      <div className="scene-title-row">
        <div className="scene-title-fields">
          <input className="scene-title-input" value={scene.title} onChange={(event) => updateScene({ title: event.target.value })} />
          <input className="scene-summary-input" placeholder="Décrivez cette scène en une phrase…" value={scene.summary} onChange={(event) => updateScene({ summary: event.target.value })} />
        </div>
        <select className="status-select" value={scene.status} onChange={(event) => updateScene({ status: event.target.value as Scene['status'] })}>
          <option>Idée</option><option>À écrire</option><option>En cours</option><option>Terminée</option>
        </select>
        <button className="danger-icon" onClick={deleteScene} aria-label="Supprimer la scène"><Trash2 size={17} /></button>
      </div>
      <div className="scene-meta">
        <label><span>Lieu</span><input placeholder="Ex. Forêt enchantée" value={scene.location} onChange={(event) => updateScene({ location: event.target.value })} /></label>
        <label><span>Moment</span><input placeholder="Ex. Aube" value={scene.moment} onChange={(event) => updateScene({ moment: event.target.value })} /></label>
      </div>
      <div className="section-heading">
        <div><span>Découpage visuel</span><h2>Plans de la scène</h2><p>Chaque plan correspond à une image, un cadrage ou un moment précis.</p></div>
        <button className="primary-button" onClick={addShot}><Plus size={17} /> Ajouter un plan</button>
      </div>
      {scene.shots.length ? (
        <div className="shot-grid">
          {scene.shots.map((shot, index) => (
            <article className={`shot-card ${selectedShotId === shot.id ? 'selected' : ''}`} key={shot.id}>
              <div className="shot-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="shot-card-top">
                <input value={shot.title} onFocus={() => setSelectedShotId(shot.id)} onChange={(event) => updateShot(shot.id, { title: event.target.value })} onClick={(event) => event.stopPropagation()} />
                <button onClick={(event) => { event.stopPropagation(); deleteShot(shot.id); }}><Trash2 size={15} /></button>
              </div>
              <label>Description<textarea rows={4} placeholder="Ce que l'on voit dans ce plan…" value={shot.description} onFocus={() => setSelectedShotId(shot.id)} onChange={(event) => updateShot(shot.id, { description: event.target.value })} /></label>
              <label>Cadrage<input value={shot.camera} onFocus={() => setSelectedShotId(shot.id)} onChange={(event) => updateShot(shot.id, { camera: event.target.value })} /></label>
              <label>Dialogue<textarea rows={2} placeholder="Dialogue ou voix off…" value={shot.dialogue} onFocus={() => setSelectedShotId(shot.id)} onChange={(event) => updateShot(shot.id, { dialogue: event.target.value })} /></label>
              <button className="image-action" onClick={(event) => { event.stopPropagation(); openImage(shot); }}><WandSparkles size={16} /> Générer l’image de ce plan</button>
            </article>
          ))}
          <button className="add-shot-card" onClick={addShot}><span><Plus size={23} /></span><strong>Nouveau plan</strong><small>Ajoutez un cadrage à cette scène</small></button>
        </div>
      ) : (
        <button className="first-shot" onClick={addShot}><span><Clapperboard size={28} /></span><strong>Découper cette scène en plans</strong><small>Commencez par le premier cadrage de votre scène.</small><b><Plus size={16} /> Créer le premier plan</b></button>
      )}
    </div>
  );
}

function WritingView({ scene, chapter, updateScene, openAI }: { scene: Scene; chapter: Chapter; updateScene: (fields: Partial<Scene>) => void; openAI: () => void }) {
  const words = scene.text.trim() ? scene.text.trim().split(/\s+/).length : 0;
  return (
    <div className="content writing-view">
      <div className="breadcrumb"><BookOpen size={14} /> {chapter.title} <ChevronRight size={13} /> {scene.title}</div>
      <div className="writing-head"><div><span>Manuscrit</span><h1>{scene.title}</h1></div><button className="ai-button" onClick={openAI}><Sparkles size={17} /> Demander à l’agent IA</button></div>
      <textarea className="manuscript" placeholder="Écrivez votre scène ici…" value={scene.text} onChange={(event) => updateScene({ text: event.target.value })} />
      <div className="writing-footer"><span>{words} mot{words !== 1 ? 's' : ''}</span><span>Sauvegarde automatique locale</span></div>
    </div>
  );
}

function AIView(props: {
  messages: ChatMessage[]; chatInput: string; setChatInput: (value: string) => void; sendChat: (suggestion?: string) => void; chatLoading: boolean; saveAsScene: (message: ChatMessage) => void; scene: Scene; shot?: Shot; imagePrompt: string; setImagePrompt: (value: string) => void; imageSize: string; setImageSize: (value: string) => void; imageQuality: string; setImageQuality: (value: string) => void; imageCount: number; setImageCount: (value: number) => void; imageJob: { label: string; progress: number } | null; generateImages: () => void; model: string; imageModel: string; configure: () => void;
}) {
  return (
    <div className="ai-workspace">
      <section className="chat-panel">
        <header><div className="agent-avatar"><Sparkles size={20} /></div><div><strong>Agent d’écriture</strong><span>{props.model} · connaît la scène actuelle</span></div><button className="icon-button" onClick={props.configure}><SettingsIcon size={18} /></button></header>
        <div className="quick-prompts">
          <button onClick={() => props.sendChat('Continue cette scène en respectant mon style.')}>Continuer la scène</button>
          <button onClick={() => props.sendChat('Propose un découpage en 3 plans cinématographiques pour cette scène.')}>Créer 3 plans</button>
          <button onClick={() => props.sendChat('Améliore le rythme et les dialogues sans changer mon histoire.')}>Améliorer le texte</button>
        </div>
        <div className="messages">
          {!props.messages.length && (
            <div className="agent-welcome"><Sparkles size={24} /><h2>Parlons de votre histoire</h2><p>Je connais le projet, le chapitre et la scène sélectionnée. Demandez-moi de continuer, corriger ou découper votre idée.</p></div>
          )}
          {props.messages.map((message) => (
            <div className={`message ${message.role}`} key={message.id}>
              <div>{message.content}</div>
              {message.role === 'assistant' && <button onClick={() => props.saveAsScene(message)}><Plus size={14} /> Ajouter comme scène</button>}
            </div>
          ))}
          {props.chatLoading && <div className="message assistant typing"><i /><i /><i /></div>}
        </div>
        <div className="composer">
          <textarea rows={2} value={props.chatInput} onChange={(event) => props.setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); props.sendChat(); } }} placeholder="Parlez à votre agent d’écriture…" />
          <button onClick={() => props.sendChat()} disabled={props.chatLoading || !props.chatInput.trim()}><Send size={18} /></button>
        </div>
      </section>

      <section className="image-panel">
        <header><div><span>Studio visuel</span><h2>Créer l’image du plan</h2></div><div className="model-chip">{props.imageModel}</div></header>
        <div className="context-card"><Clapperboard size={17} /><div><span>Contexte sélectionné</span><strong>{props.shot?.title ?? props.scene.title}</strong><small>{props.shot?.camera ?? props.scene.summary}</small></div></div>
        <label className="prompt-label"><span>Prompt d’image</span><textarea rows={8} value={props.imagePrompt} onChange={(event) => props.setImagePrompt(event.target.value)} placeholder="Décrivez précisément l’image à créer…" /><small>Le personnage, le décor, le cadrage, la lumière et le style sont importants.</small></label>
        <div className="image-options">
          <label>Format<select value={props.imageSize} onChange={(event) => props.setImageSize(event.target.value)}><option value="16:9">Cinéma 16:9</option><option value="4:3">Paysage 4:3</option><option value="1:1">Carré 1:1</option><option value="9:16">Vertical 9:16</option><option value="3:2">Photo 3:2</option></select></label>
          <label>Qualité<select value={props.imageQuality} onChange={(event) => props.setImageQuality(event.target.value)} disabled={props.imageModel === 'gpt-image-2-beta'}><option value="low">Brouillon économique</option><option value="medium">Équilibrée</option><option value="high">Finale</option></select></label>
          <label>Images<select value={props.imageCount} onChange={(event) => props.setImageCount(Number(event.target.value))} disabled={props.imageModel === 'gpt-image-2-beta'}><option value={1}>1 image</option><option value={2}>2 images</option><option value={3}>3 images</option></select></label>
        </div>
        {props.imageJob ? (
          <div className="generation-progress"><div><span>{props.imageJob.label}</span><strong>{Math.round(props.imageJob.progress)}%</strong></div><div className="progress-track"><i style={{ width: `${props.imageJob.progress}%` }} /></div><small>Vous pouvez laisser l’application ouverte pendant la création.</small></div>
        ) : (
          <button className="generate-button" onClick={props.generateImages} disabled={!props.imagePrompt.trim()}><WandSparkles size={19} /> Générer avec GPT Image</button>
        )}
        <p className="cost-note"><KeyRound size={14} /> Utilise votre clé Evolink. La génération peut consommer des crédits.</p>
      </section>
    </div>
  );
}

function GalleryView({ project, removeImage }: { project: Project; selectImage: (sceneId: string, shotId: string) => void; removeImage: (id: string) => void }) {
  const download = (src: string, index: number) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `deaflix-image-${index + 1}.png`;
    link.target = '_blank';
    link.click();
  };
  return (
    <div className="content gallery-view">
      <div className="gallery-head"><div><span>Bibliothèque visuelle</span><h1>Galerie du projet</h1><p>Les images copiées localement restent disponibles hors connexion.</p></div><div className="gallery-count">{project.images.length}<small>images</small></div></div>
      {project.images.length ? <div className="gallery-grid">{project.images.map((image, index) => {
        const scene = project.chapters.flatMap((chapter) => chapter.scenes).find((item) => item.id === image.sceneId);
        const shot = scene?.shots.find((item) => item.id === image.shotId);
        return <article key={image.id}><div className="gallery-image"><div className="generated-picture" aria-hidden="true" style={{ backgroundImage: `url("${image.src.replace(/"/g, '%22')}")` }} /><span className="sr-only">{image.prompt}</span><span className={image.savedLocally ? 'local' : 'temporary'}>{image.savedLocally ? 'Sur cet iPad' : 'Lien temporaire'}</span></div><div className="gallery-copy"><strong>{shot?.title ?? scene?.title ?? 'Image du projet'}</strong><p>{image.prompt}</p><div><button onClick={() => download(image.src, index)}><Download size={15} /> Enregistrer</button><button className="delete" onClick={() => removeImage(image.id)}><Trash2 size={15} /></button></div></div></article>;
      })}</div> : <div className="empty-state compact"><div className="empty-icon"><ImageIcon size={30} /></div><h2>Aucune image pour l’instant</h2><p>Sélectionnez un plan, ouvrez « Agent IA » puis créez sa première image.</p></div>}
    </div>
  );
}

function SettingsModal({ settings, setSettings, close }: { settings: Settings; setSettings: React.Dispatch<React.SetStateAction<Settings>>; close: () => void }) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="modal-backdrop">
      <button className="modal-close-area" onClick={close} aria-label="Fermer les réglages" />
      <section className="settings-modal">
        <header><div><span>Connexion privée</span><h2>Réglages de l’IA</h2></div><button className="icon-button" onClick={close}><X size={20} /></button></header>
        <div className="privacy-card"><KeyRound size={20} /><div><strong>Votre clé reste sur cet iPad</strong><p>Elle est enregistrée dans le stockage local de Safari. Elle n’est jamais ajoutée au projet GitHub ni à vos exports.</p></div></div>
        <label>Clé API Evolink<div className="key-field"><input type={showKey ? 'text' : 'password'} value={settings.apiKey} onChange={(event) => setSettings((current) => ({ ...current, apiKey: event.target.value }))} placeholder="sk-…" autoCapitalize="off" autoCorrect="off" /><button onClick={() => setShowKey((value) => !value)}>{showKey ? 'Masquer' : 'Afficher'}</button></div></label>
        <label>Agent GPT<select value={settings.textModel} onChange={(event) => setSettings((current) => ({ ...current, textModel: event.target.value as Settings['textModel'] }))}><option value="gpt-5.6-luna">GPT‑5.6 Luna — rapide et économique</option><option value="gpt-5.6-terra">GPT‑5.6 Terra — équilibré (conseillé)</option><option value="gpt-5.6-sol">GPT‑5.6 Sol — puissance maximale</option></select></label>
        <label>Modèle d’image<select value={settings.imageModel} onChange={(event) => setSettings((current) => ({ ...current, imageModel: event.target.value as Settings['imageModel'] }))}><option value="gpt-image-2">GPT Image 2 — qualité complète</option><option value="gpt-image-2-beta">GPT Image 2 Beta — tarif fixe 1K</option></select></label>
        <details><summary>Réglage avancé</summary><label>Adresse Evolink<input value={settings.apiBase} onChange={(event) => setSettings((current) => ({ ...current, apiBase: event.target.value }))} /></label></details>
        <footer><a href="https://evolink.ai" target="_blank" rel="noreferrer">Obtenir une clé Evolink</a><button className="primary-button" onClick={close}><Check size={17} /> Enregistrer</button></footer>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
