/**
 * Where a layer's model lives and how to turn the response into GLB bytes.
 * 'glb' (default, GitHub Pages): binary .glb file.
 * 'b64' (claude.ai preview, which serves no .glb): the same GLB as base64 text in a .txt file.
 */
export const MODEL_FORMAT = (import.meta.env && import.meta.env.VITE_MODEL_FORMAT) || 'glb';

export function modelUrl(key, format = MODEL_FORMAT) {
  return `models/${key}.${format === 'b64' ? 'txt' : 'glb'}`;
}

/** body: ArrayBuffer for 'glb', string for 'b64'. Returns an ArrayBuffer with the GLB. */
export function decodeModel(body, format = MODEL_FORMAT) {
  if (format !== 'b64') return body;
  const bin = atob(body.replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export async function fetchModel(key, format = MODEL_FORMAT) {
  const res = await fetch(modelUrl(key, format));
  if (!res.ok) throw new Error(`${modelUrl(key, format)}: HTTP ${res.status}`);
  return decodeModel(format === 'b64' ? await res.text() : await res.arrayBuffer(), format);
}
