import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { Library, processImages, mine, runJobs, slug, command } from '../src/core.mjs';
import { prepareAdapter } from '../src/adapters.mjs';
import ffmpeg from 'ffmpeg-static';
async function temp(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'deaflix-')); t.after(() => fs.rm(dir, {recursive:true, force:true})); return dir; }
test('bounded parallelism, failure isolation and durable states', async t => {
  const root = await temp(t); let active = 0, max = 0;
  const result = await runJobs(Array.from({length:6}, (_,i) => ({id:`job${i}`, type:'test', i})), {test:async job => {
    active++; max = Math.max(max, active); await new Promise(r => setTimeout(r, 30)); active--; if (job.i === 2) throw new Error('expected'); return job.i;
  }}, root, 2);
  assert.equal(max, 2); assert.equal(result.results.filter(r => r.status === 'completed').length, 5);
  assert.equal(JSON.parse(await fs.readFile(path.join(result.run, 'job2/status.json'))).status, 'failed');
  await assert.rejects(runJobs([{id:'same',type:'test'},{id:'same',type:'test'}], {test:()=>{}}, root));
});
test('character metadata protection and traversal rejection', async t => {
  const lib = new Library(await temp(t)); await lib.register('celestin', {name:'Célestin'});
  assert.equal((await lib.list())[0].name, 'Célestin'); await assert.rejects(lib.register('celestin'));
  assert.throws(() => slug('../escape'));
});
test('QC duplicates, small/corrupt images, upscale and grid', async t => {
  const root = await temp(t), image = path.join(root,'image.png'), small = path.join(root,'small.png'), bad = path.join(root,'bad.png');
  await sharp({create:{width:100,height:80,channels:3,background:'red'}}).png().toFile(image);
  await sharp({create:{width:10,height:10,channels:3,background:'blue'}}).png().toFile(small); await fs.writeFile(bad,'broken');
  const result = await processImages([image,image,small,bad], path.join(root,'out'), {scale:2});
  assert.deepEqual(result.report.map(r => r.reason || 'accepted'), ['accepted','duplicate','small','decode']);
  assert.equal((await sharp(result.accepted[0]).metadata()).width,200);
  assert.equal((await sharp(result.grid).metadata()).width,1024);
  assert.equal((await processImages([image],path.join(root,'blur'),{minSharpness:100})).accepted.length,0);
  await assert.rejects(processImages([],root,{scale:0}));
});
test('real video extraction and processing', async t => {
  const root = await temp(t), video = path.join(root,'sample.mp4');
  await command(ffmpeg,['-v','error','-f','lavfi','-i','testsrc=size=128x128:rate=5','-t','2','-pix_fmt','yuv420p',video]);
  const frames = await mine(video,path.join(root,'frames'),{fps:1,seconds:2}); assert.equal(frames.length,2);
  assert.equal((await processImages(frames,path.join(root,'out'))).accepted.length,2);
});
test('adapter requests never execute or persist secrets', async t => {
  const root = await temp(t); const previous = process.env.RUNPOD_API_KEY; process.env.RUNPOD_API_KEY='secret-test';
  t.after(() => { if (previous === undefined) delete process.env.RUNPOD_API_KEY; else process.env.RUNPOD_API_KEY=previous; });
  const result = await prepareAdapter('runpod',{scene:'example'},root); assert.equal(result.executed,false);
  assert.ok(!(await fs.readFile(result.file,'utf8')).includes('secret-test'));
});
