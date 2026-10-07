import path from 'node:path';
import { json } from './core.mjs';

// Explicit preparation boundary: no remote calls or GPU billing in the MVP.
export async function prepareAdapter(kind, payload, out) {
  const required = { blender: ['DEAFLIX_BLENDER'], comfyui: ['COMFYUI_URL'], runpod: ['RUNPOD_API_KEY', 'RUNPOD_ENDPOINT_ID'] };
  if (!required[kind]) throw new Error('Adaptateur inconnu');
  const missing = required[kind].filter(name => !process.env[name]);
  const file = path.join(out, `${kind}-request.json`);
  await json(file, { adapter: kind, status: 'prepared_only', missing, payload });
  return { file, missing, executed: false };
}
