// Gera os assets do playground a partir de public/mare/playground:
//  - public/mare/opt/playground-ground.png : terreno isometrico assado
//    (tiles + transitions de canto)
//  - public/mare/opt/playground-rider.png  : folha 16x3 da agua, 64x64 por
//    quadro, com a ancora entre os cascos
//  - public/mare/opt/playground-props/*.png : enfeites recortados no conteudo
//
// Uso: node scripts/build-playground.mjs
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'public/mare/playground';
const RIDER_SRC = 'public/mare/mare-com-pessoa-em-cima.png';
const OUT_DIR = 'public/mare/opt';
const PROP_OUT = path.join(OUT_DIR, 'playground-props');
const COLS = 12;
const ROWS = 12;
const TILE_W = 64; // tiles_192
const TILE_H = 32;
const STEP_X = TILE_W / 2;
const STEP_Y = TILE_H / 2;

const RIDER_CELL = 64;
const RIDER_COLS = 16;
const RIDER_ROWS = 3;

const TERRAIN = Array.from({ length: ROWS }, () => Array(COLS).fill('grass'));
const inBounds = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;

// Estrada de terra atravessando o campo.
for (let r = 8; r <= 9; r += 1) {
  for (let c = 2; c <= 9; c += 1) TERRAIN[r][c] = 'dirt';
}

// Lago a oeste, com uma faixa de areia entre a agua e a grama.
const water = [];
for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    const dx = (c - 2.5) / 2.6;
    const dy = (r - 2.2) / 1.8;
    if (dx * dx + dy * dy <= 1) {
      TERRAIN[r][c] = 'water';
      water.push([c, r]);
    }
  }
}
for (const [c, r] of water) {
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (inBounds(c + dc, r + dr) && TERRAIN[r + dr][c + dc] === 'grass') TERRAIN[r + dr][c + dc] = 'sand';
  }
}
const terrain = TERRAIN;

// --------------------------------------------------------------- terreno ----
// O no (r,c) e compartilhado pelos tiles (r-1..r, c-1..c): o canto herda o
// terreno mais especifico entre os quatro vizinhos.
const RANK = { water: 3, sand: 2, dirt: 1, grass: 0 };
const corners = Array.from({ length: ROWS + 1 }, () => Array(COLS + 1).fill('grass'));
for (let r = 0; r <= ROWS; r += 1) {
  for (let c = 0; c <= COLS; c += 1) {
    let best = 'grass';
    for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const cc = c - 1 + dc;
      const rr = r - 1 + dr;
      if (!inBounds(cc, rr)) continue;
      if (RANK[terrain[rr][cc]] > RANK[best]) best = terrain[rr][cc];
    }
    corners[r][c] = best;
  }
}

// As fontes do terreno (tiles, transicoes e natureza) sao opcionais: depois de
// assar, so o PNG e os enfeites recortados ficam no opt. Sem as fontes, o
// script ainda refaz a folha da Mare.
const HAS_TERRAIN_SRC = existsSync(path.join(ROOT, 'tiles_192'));

const tile = (kind, file) => path.join(ROOT, 'tiles_192', kind, file);
const transition = (base, over, nn) =>
  path.join(ROOT, 'transitions_192', `${base}__${over}`, `${base}__${over}_${String(nn).padStart(2, '0')}.png`);

const GRASS = [0, 1, 2, 3].map((i) => tile('grass', `grass_v${i}.png`));

/** Imagem de um tile: transicao de canto quando ha contornos, senao chao cheio. */
function pickTile(r, c) {
  const nw = corners[r][c];
  const ne = corners[r][c + 1];
  const se = corners[r + 1][c + 1];
  const sw = corners[r + 1][c];
  const list = [nw, ne, se, sw];

  const mask = (kind) =>
    (nw === kind ? 8 : 0) | (ne === kind ? 4 : 0) | (se === kind ? 2 : 0) | (sw === kind ? 1 : 0);

  if (list.includes('water')) return transition('sand', 'water', mask('water'));
  if (list.includes('sand')) return transition('grass', 'sand', mask('sand'));
  if (list.includes('dirt')) return transition('grass', 'dirt', mask('dirt'));
  return GRASS[(r * 7 + c * 3) % GRASS.length];
}

// O losangulo ocupa exatamente: (COLS + ROWS - 2) passos de largura e de
// altura, mais o tile final.
const FIELD_W = STEP_X * (COLS + ROWS - 2) + TILE_W;
const FIELD_H = STEP_Y * (COLS + ROWS - 2) + TILE_H;

await mkdir(OUT_DIR, { recursive: true });

if (HAS_TERRAIN_SRC) {
  const layers = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const file = pickTile(r, c);
      if (!existsSync(file)) throw new Error(`asset ausente: ${file}`);
      layers.push({
        input: file,
        left: STEP_X * (c - r) + STEP_X * (ROWS - 1),
        top: STEP_Y * (c + r),
      });
    }
  }

  await sharp({
    create: { width: FIELD_W, height: FIELD_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'playground-ground.png'));
} else {
  console.log('terreno: fontes ausentes, mantendo o playground-ground.png');
}

// ------------------------------------------------------------------ agua ----
// A fonte ja vem com fundo transparente: sem chave de cor (ela comia o pelo
// branco do cavalo e vazava buracos). So o alpha conta.
const riderSrc = RIDER_SRC;
const { data: riderData, info: riderInfo } = await sharp(riderSrc)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: RW, height: RH } = riderInfo;

const cellLeft = (c) => Math.floor((c * RW) / RIDER_COLS);
const cellTop = (r) => Math.floor((r * RH) / RIDER_ROWS);

/** Recorte visivel (alpha > 24) de cada quadro da folha. */
const frames = [];
for (let row = 0; row < RIDER_ROWS; row += 1) {
  for (let col = 0; col < RIDER_COLS; col += 1) {
    const left = cellLeft(col);
    const top = cellTop(row);
    const width = cellLeft(col + 1) - left;
    const height = cellTop(row + 1) - top;
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    let sumX = 0;
    let sumA = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = riderData[((top + y) * RW + (left + x)) * 4 + 3];
        if (alpha > 24) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          sumX += x * alpha;
          sumA += alpha;
        }
      }
    }
    // Pivo: centroide de alfa do desenho. Ele praticamente nao muda entre as
    // 4 direcoes, entao a Mare fica apoiada no mesmo ponto ao virar.
    frames.push({ row, col, left, top, width, height, box: { minX, maxX, minY, maxY }, cx: sumA ? sumX / sumA : width / 2 });
  }
}

// Recorte por bloco de 4 colunas (mesma direcao) e por linha (mesmo
// estado): os 4 quadros de um ciclo compartilham a mesma janela, entao a
// Mare nao "pula" entre quadros e as patas ficam sempre no mesmo ponto.
const groups = [];
for (let row = 0; row < RIDER_ROWS; row += 1) {
  for (let b = 0; b < RIDER_COLS / 4; b += 1) {
    const block = frames.filter((f) => f.row === row && f.col >= b * 4 && f.col < b * 4 + 4);
    const all = frames.filter((f) => f.col >= b * 4 && f.col < b * 4 + 4);
    groups.push({
      row,
      b,
      x0: Math.min(...all.map((f) => f.box.minX)),
      x1: Math.max(...all.map((f) => f.box.maxX)),
      y0: Math.min(...block.map((f) => f.box.minY)),
      y1: Math.max(...block.map((f) => f.box.maxY)),
      block,
    });
  }
}

// Pivo por bloco de direcao: a media do centroide dos 12 quadros, relativo
// a janela de recorte. As 4 direcoes ficam com o mesmo peso no terreno.
const pivots = new Map();
for (let b = 0; b < RIDER_COLS / 4; b += 1) {
  const all = frames.filter((f) => f.col >= b * 4 && f.col < b * 4 + 4);
  const group = groups.find((g) => g.b === b);
  const rel = all.map((f) => f.cx - group.x0);
  pivots.set(b, rel.reduce((sum, v) => sum + v, 0) / rel.length);
}

// Uma escala unica para a folha inteira: virar de direcao nao muda o tamanho
// da Mare.
const scale = Math.min(
  ...groups.map((g) => Math.min((RIDER_CELL - 4) / (g.x1 - g.x0 + 1), (RIDER_CELL - 2) / (g.y1 - g.y0 + 1))),
);

const sheet = [];
for (const g of groups) {
  const cw = g.x1 - g.x0 + 1;
  const ch = g.y1 - g.y0 + 1;
  const outW = Math.max(1, Math.round(cw * scale));
  const outH = Math.max(1, Math.round(ch * scale));
  const left = Math.round(RIDER_CELL / 2 - pivots.get(g.b) * scale); // pivo no centro
  const top = Math.max(0, RIDER_CELL - outH); // patas no rodape do quadro
  for (const frame of g.block) {
    const scaled = await sharp(riderData, { raw: { width: RW, height: RH, channels: 4 } })
      .extract({
        left: frame.left + g.x0,
        top: frame.top + g.y0,
        width: cw,
        height: ch,
      })
      .resize(outW, outH, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    sheet.push({ input: scaled, left: frame.col * RIDER_CELL + left, top: frame.row * RIDER_CELL + top });
  }
}

await sharp({
  create: {
    width: RIDER_CELL * RIDER_COLS,
    height: RIDER_CELL * RIDER_ROWS,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(sheet)
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT_DIR, 'playground-rider.png'));

// -------------------------------------------------------------- manifesto ----
// A cena completa (terreno e enfeites) em um arquivo que o
// componente importa: o mesmo build script e a unica fonte da verdade.
const NATURE = path.join(ROOT, 'nature_192', 'summer');
const PROPS = [
  ['bush_large_r0.png', 5, 0],
  ['rock_large_r0.png', 8, 0],
  ['bush_r0.png', 10, 1],
  ['flowers_r0.png', 7, 2],
  ['stump_r0.png', 0, 4],
  ['grass_tuft_r0.png', 5, 4],
  ['boulders_r0.png', 9, 4],
  ['bush_large_r1.png', 3, 5],
  ['rock_small_r0.png', 6, 6],
  ['flowers_r1.png', 9, 7],
  ['grass_tuft_r1.png', 1, 8],
  ['log_r0.png', 4, 10],
  ['bush_r1.png', 7, 11],
  ['grass_tuft_r2.png', 11, 8],
];

await mkdir(PROP_OUT, { recursive: true });

const props = [];
for (const [file, c, r] of PROPS) {
  const p = path.join(NATURE, file);
  if (!existsSync(p)) {
    // Sem a fonte da natureza, o enfeite ja recortado vale: o manifesto so
    // precisa do tamanho, que o PNG existente ja tem.
    const existing = path.join(PROP_OUT, file);
    if (!existsSync(existing)) throw new Error(`asset ausente: ${p}`);
    const { width: w, height: h } = await sharp(existing).metadata();
    props.push({
      file,
      x: STEP_X * (c - r) + STEP_X * (ROWS - 1) + TILE_W / 2,
      y: STEP_Y * (c + r) + TILE_H / 2,
      w,
      h,
      z: (c + r) * 8,
    });
    continue;
  }
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let maxX = -1;
  let minY = info.height;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  await sharp(p)
    .extract({ left: minX, top: minY, width: w, height: h })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PROP_OUT, file));
  props.push({
    file,
    x: STEP_X * (c - r) + STEP_X * (ROWS - 1) + TILE_W / 2,
    y: STEP_Y * (c + r) + TILE_H / 2,
    w,
    h,
    z: (c + r) * 8,
  });
}

const scene = {
  cols: COLS,
  rows: ROWS,
  field: { w: FIELD_W, h: FIELD_H },
  tile: { w: TILE_W, h: TILE_H, anchorX: STEP_X * (ROWS - 1) + TILE_W / 2, anchorY: TILE_H / 2 },
  terrain: terrain.map((row) => row.map((kind) => ({ grass: 'g', dirt: 'd', sand: 's', water: 'w' })[kind]).join('')),
  props,
};

await writeFile('src/lib/mare/playground-scene.json', `${JSON.stringify(scene, null, 2)}\n`);

console.log(`ground ${FIELD_W}x${FIELD_H} -> public/mare/opt/playground-ground.png`);
console.log(`rider  ${RIDER_CELL * RIDER_COLS}x${RIDER_CELL * RIDER_ROWS} -> public/mare/opt/playground-rider.png`);
console.log(`cena   -> src/lib/mare/playground-scene.json`);
