/**
 * Minimal Tiled .tmx → OLW-compatible JSON (orthogonal, csv tile layers + object groups).
 */
import fs from 'node:fs';
import path from 'node:path';

function parseAttrs(tag) {
  const attrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(tag))) attrs[m[1]] = m[2];
  return attrs;
}

function parseCsvInts(csv) {
  return csv
    .trim()
    .split(/\n/)
    .flatMap((line) => line.split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number.parseInt(s, 10));
}

function resolveTilesetTsx(tsxPath, tmxDir) {
  const full = path.resolve(tmxDir, tsxPath);
  const xml = fs.readFileSync(full, 'utf8');
  const tilesetTag = xml.match(/<tileset[^>]*>/)?.[0] ?? '';
  const attrs = parseAttrs(tilesetTag);
  const imageTag = xml.match(/<image[^>]*\/>/)?.[0] ?? '';
  const imgAttrs = parseAttrs(imageTag);
  const imageAbs = path.resolve(path.dirname(full), imgAttrs.source ?? '');
  return { attrs, imageAbs, name: attrs.name };
}

function imageSizeFromTsx(tsxPath) {
  const xml = fs.readFileSync(tsxPath, 'utf8');
  const imageTag = xml.match(/<image[^>]*\/>/)?.[0] ?? '';
  const attrs = parseAttrs(imageTag);
  return {
    width: Number.parseInt(attrs.width ?? '0', 10),
    height: Number.parseInt(attrs.height ?? '0', 10),
  };
}

/**
 * @param {string} tmxPath absolute path to map.tmx
 * @param {{ imageUrlPrefix?: string }} [options]
 */
export function loadTmxAsTiledJson(tmxPath, options = {}) {
  const imageUrlPrefix = options.imageUrlPrefix ?? '/maps/donor/pydew-valley';
  const tmxDir = path.dirname(tmxPath);
  const xml = fs.readFileSync(tmxPath, 'utf8');
  const mapTag = xml.match(/<map[^>]*>/)?.[0] ?? '';
  const mapAttrs = parseAttrs(mapTag);
  const width = Number.parseInt(mapAttrs.width, 10);
  const height = Number.parseInt(mapAttrs.height, 10);
  const tilewidth = Number.parseInt(mapAttrs.tilewidth, 10);
  const tileheight = Number.parseInt(mapAttrs.tileheight, 10);

  const tilesets = [];
  for (const [, attrStr] of xml.matchAll(/<tileset\s+([^>]+)\/>/g)) {
    const attrs = parseAttrs(`<tileset ${attrStr}/>`);
    const firstgid = Number.parseInt(attrs.firstgid, 10);
    if (!attrs.source) continue;
    const { attrs: tsAttrs, imageAbs, name } = resolveTilesetTsx(attrs.source, tmxDir);
    const vendRoot = path.resolve('public/maps/donor/pydew-valley');
    const rel = path.relative(vendRoot, imageAbs).split(path.sep).join('/');
    const dims = fs.existsSync(path.resolve(tmxDir, attrs.source))
      ? imageSizeFromTsx(path.resolve(tmxDir, attrs.source))
      : { width: 0, height: 0 };
    tilesets.push({
      columns: Number.parseInt(tsAttrs.columns, 10),
      firstgid,
      image: `${imageUrlPrefix}/${rel}`,
      imageheight: dims.height,
      imagewidth: dims.width,
      margin: Number.parseInt(tsAttrs.margin ?? '0', 10),
      name: name ?? tsAttrs.name,
      spacing: Number.parseInt(tsAttrs.spacing ?? '0', 10),
      tilecount: Number.parseInt(tsAttrs.tilecount, 10),
      tileheight: Number.parseInt(tsAttrs.tileheight, 10),
      tilewidth: Number.parseInt(tsAttrs.tilewidth, 10),
    });
  }

  const layers = [];
  let layerId = 1;
  for (const [, attrStr, body] of xml.matchAll(/<layer\s+([^>]+)>([\s\S]*?)<\/layer>/g)) {
    const attrs = parseAttrs(`<layer ${attrStr}>`);
    const dataMatch = body.match(/<data[^>]*>([\s\S]*?)<\/data>/);
    if (!dataMatch) continue;
    layers.push({
      id: Number.parseInt(attrs.id, 10) || layerId++,
      name: attrs.name,
      type: 'tilelayer',
      visible: attrs.visible !== '0',
      opacity: Number.parseFloat(attrs.opacity ?? '1'),
      x: 0,
      y: 0,
      width,
      height,
      data: parseCsvInts(dataMatch[1]),
    });
  }

  for (const [, attrStr, body] of xml.matchAll(/<objectgroup\s+([^>]+)>([\s\S]*?)<\/objectgroup>/g)) {
    const attrs = parseAttrs(`<objectgroup ${attrStr}>`);
    const objects = [];
    for (const [, objAttr] of body.matchAll(/<object\s+([^/>]+)\/>/g)) {
      const oa = parseAttrs(`<object ${objAttr}/>`);
      objects.push({
        id: Number.parseInt(oa.id, 10),
        name: oa.name,
        type: oa.type,
        x: Number.parseFloat(oa.x),
        y: Number.parseFloat(oa.y),
        width: Number.parseFloat(oa.width ?? '0'),
        height: Number.parseFloat(oa.height ?? '0'),
      });
    }
    for (const [, objAttr, objBody] of body.matchAll(/<object\s+([^>]+)>([\s\S]*?)<\/object>/g)) {
      const oa = parseAttrs(`<object ${objAttr}>`);
      const hasPoint = /<point/.test(objBody);
      objects.push({
        id: Number.parseInt(oa.id, 10),
        name: oa.name,
        type: oa.type,
        x: Number.parseFloat(oa.x),
        y: Number.parseFloat(oa.y),
        width: Number.parseFloat(oa.width ?? (hasPoint ? '0' : '64')),
        height: Number.parseFloat(oa.height ?? (hasPoint ? '0' : '64')),
      });
    }
    layers.push({
      id: Number.parseInt(attrs.id, 10) || layerId++,
      name: attrs.name,
      type: 'objectgroup',
      visible: attrs.visible !== '0',
      opacity: 1,
      x: 0,
      y: 0,
      draworder: 'topdown',
      objects,
    });
  }

  return {
    compressionlevel: -1,
    width,
    height,
    infinite: false,
    layers,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: mapAttrs.tiledversion ?? '1.11.0',
    tileheight,
    tilewidth,
    tilesets,
    type: 'map',
    version: '1.10',
  };
}