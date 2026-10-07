import fs from 'node:fs/promises';
import path from 'node:path';
import { Library, mine, processImages, runJobs, slug } from './core.mjs';
import { prepareAdapter } from './adapters.mjs';

const root = path.resolve(process.env.DEAFLIX_DATA_DIR || 'data');
const library = new Library(root);
async function main() {
  const [action, arg] = process.argv.slice(2);
  if (action === 'character-add') return library.register(slug(arg));
  if (action === 'characters') return library.list();
  if (action !== 'run' || !arg) throw new Error('Usage: npm start -- character-add ID | characters | run jobs.json');
  const jobs = JSON.parse(await fs.readFile(arg, 'utf8'));
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('Une liste non vide de jobs est requise');
  const handlers = {
    pipeline: async (job, dir) => {
      const characterDir = library.directory(job.character);
      await fs.access(path.join(characterDir, 'character.json'));
      const expression = slug(job.expression || 'unclassified');
      const frames = await mine(job.video, path.join(dir, 'frames'), job.options);
      const out = path.join(characterDir, 'expressions', expression, path.basename(path.dirname(dir)), job.id);
      return processImages(frames, out, job.options);
    },
    images: async (job, dir) => {
      const characterDir = library.directory(job.character);
      await fs.access(path.join(characterDir, 'character.json'));
      if (!Array.isArray(job.files) || !job.files.length) throw new Error('files doit contenir des images');
      return processImages(job.files, path.join(characterDir, 'expressions', slug(job.expression || 'unclassified'), path.basename(path.dirname(dir)), job.id), job.options);
    },
    prepare: (job, dir) => prepareAdapter(job.adapter, job.payload, dir)
  };
  const result = await runJobs(jobs, handlers, root, Number(process.env.DEAFLIX_CONCURRENCY || 3));
  if (result.results.some(job => job.status === 'failed')) process.exitCode = 1;
  return result;
}
main().then(result => console.log(JSON.stringify(result, null, 2))).catch(err => { console.error(err.message); process.exitCode = 1; });
