import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

export function slug(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new Error('Identifiant invalide');
  return value;
}
export async function json(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}
export function command(executable, args, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true });
    let error = '';
    child.stderr.on('data', chunk => { error = (error + chunk).slice(-4000); });
    child.stdout.resume();
    const timer = setTimeout(() => { child.kill(); reject(new Error('Délai du processus dépassé')); }, timeout);
    child.on('error', err => { clearTimeout(timer); reject(err); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Processus terminé (${code}): ${error}`)); });
  });
}
export class Library {
  constructor(root) { this.root = path.resolve(root); }
  directory(character) { return path.join(this.root, 'characters', slug(character)); }
  async register(character, metadata = {}) {
    const dir = this.directory(character);
    await fs.mkdir(dir, { recursive: true });
    // Exclusive creation prevents silently replacing existing character metadata.
    await fs.writeFile(path.join(dir, 'character.json'), JSON.stringify({ ...metadata, id: character }, null, 2), { flag: 'wx' });
    return dir;
  }
  async list() {
    const dirs = await fs.readdir(path.join(this.root, 'characters')).catch(err => { if (err.code === 'ENOENT') return []; throw err; });
    return Promise.all(dirs.map(id => fs.readFile(path.join(this.directory(id), 'character.json'), 'utf8').then(JSON.parse)));
  }
}
export async function mine(video, out, options = {}) {
  const fps = options.fps ?? 1;
  const seconds = options.seconds ?? 60;
  if (!(fps > 0 && fps <= 10 && seconds > 0 && seconds <= 3600)) throw new Error('fps/seconds hors limites');
  await fs.access(video);
  await fs.mkdir(out, { recursive: true });
  await command(process.env.DEAFLIX_FFMPEG || ffmpeg, ['-nostdin', '-v', 'error', '-i', path.resolve(video), '-t', String(seconds), '-vf', `fps=${fps}`, '-frames:v', String(Math.ceil(fps * seconds)), path.join(out, 'frame-%06d.png')], 300000);
  return (await fs.readdir(out)).filter(f => /^frame-\d+\.png$/.test(f)).sort().map(f => path.join(out, f));
}
export async function processImages(files, out, options = {}) {
  const scale = options.scale ?? 1;
  const minSize = options.minSize ?? 64;
  const minSharpness = options.minSharpness ?? 0;
  if (!Number.isInteger(scale) || scale < 1 || scale > 4 || !Number.isFinite(minSize) || minSize < 1 || !Number.isFinite(minSharpness) || minSharpness < 0) throw new Error('Options QC/upscale invalides');
  await fs.mkdir(out, { recursive: true });
  const seen = new Set(), report = [], accepted = [];
  for (const file of files) {
    try {
      const normalized = await sharp(file).rotate().removeAlpha().png().toBuffer();
      const hash = createHash('sha256').update(normalized).digest('hex');
      const meta = await sharp(normalized).metadata();
      const stats = await sharp(normalized).stats();
      const reason = seen.has(hash) ? 'duplicate' : Math.min(meta.width, meta.height) < minSize ? 'small' : stats.sharpness < minSharpness ? 'blur' : null;
      seen.add(hash);
      if (reason) { report.push({ file, status: 'rejected', reason }); continue; }
      const target = path.join(out, `${hash}.png`);
      await sharp(normalized).resize({ width: meta.width * scale, height: meta.height * scale, kernel: 'lanczos3' }).toFile(target);
      accepted.push(target); report.push({ file, status: 'accepted', target, sharpness: stats.sharpness });
    } catch (err) { report.push({ file, status: 'rejected', reason: 'decode', error: err.message }); }
  }
  if (accepted.length) {
    const columns = 4, cell = 256, rows = Math.ceil(accepted.length / columns);
    const tiles = await Promise.all(accepted.map(async (file, i) => ({ input: await sharp(file).resize(cell, cell, { fit: 'contain', background: '#222' }).png().toBuffer(), left: i % columns * cell, top: Math.floor(i / columns) * cell })));
    await sharp({ create: { width: columns * cell, height: rows * cell, channels: 3, background: '#222' } }).composite(tiles).png().toFile(path.join(out, 'grid.png'));
  }
  await json(path.join(out, 'qc.json'), report);
  return { accepted, report, grid: accepted.length ? path.join(out, 'grid.png') : null };
}
export async function runJobs(jobs, handlers, root, concurrency = 3) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) throw new Error('Concurrence invalide');
  const ids = new Set();
  for (const job of jobs) {
    slug(job.id);
    if (ids.has(job.id) || !handlers[job.type]) throw new Error('Job dupliqué ou type inconnu');
    ids.add(job.id);
  }
  const run = path.join(root, 'runs', randomUUID());
  await fs.mkdir(run, { recursive: true });
  let cursor = 0;
  const results = new Array(jobs.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const index = cursor++, job = jobs[index], dir = path.join(run, job.id);
      const stateFile = path.join(dir, 'status.json');
      const state = { id: job.id, type: job.type, status: 'running', started: new Date().toISOString() };
      await json(stateFile, state);
      try { state.result = await handlers[job.type](job, dir); state.status = 'completed'; }
      catch (err) { state.status = 'failed'; state.error = err.message; }
      state.finished = new Date().toISOString();
      await json(stateFile, state); results[index] = state;
    }
  }));
  await json(path.join(run, 'manifest.json'), results);
  return { run, results };
}
