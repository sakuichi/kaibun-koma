// src/template.html に読み取り・判定・改行・挑戦リンク・対戦計算と読み辞書を埋め込んで index.html を作る
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('..', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const MODULES = [['src/reading.js', 'RD'], ['src/kaibun.js', 'KB'], ['src/lines.js', 'LN'], ['src/link.js', 'LK'], ['src/battle.js', 'BT']];
const modules = MODULES.map(([p, name]) => {
  const src = read(p), tail = `if (typeof module !== 'undefined') module.exports = ${name};`;
  if (!src.includes(tail)) throw new Error(p + ' に ' + tail + ' がありません');
  return src.replace(tail, '');
}).join('\n');
let html = read('src/template.html');
for (const mark of ['/*DICT*/', '/*MODULES*/']) if (!html.includes(mark)) throw new Error('template.html に ' + mark + ' がありません');
html = html.replace('/*DICT*/', () => read('dict/dict.b64').trim()).replace('/*MODULES*/', () => modules);
writeFileSync(new URL('index.html', root), html);
console.log('index.html を作成しました:', (html.length / 1024).toFixed(0), 'KB');
