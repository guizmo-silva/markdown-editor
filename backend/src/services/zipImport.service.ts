import unzipper from 'unzipper';
import path from 'path';
import { SUPPORTED_IMAGE_EXTENSIONS } from '../utils/imageFormats.js';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export interface ZipExtractResult {
  mdFilename: string;
  mdContent: string;
  images: Array<{ name: string; buffer: Buffer }>;
}

export async function extractZip(buffer: Buffer): Promise<ZipExtractResult> {
  const directory = await unzipper.Open.buffer(buffer);

  const mdEntries: unzipper.File[] = [];
  const imageEntries: unzipper.File[] = [];
  const invalidEntries: string[] = [];

  for (const entry of directory.files) {
    if (entry.type === 'Directory') continue;
    if (entry.path.includes('..') || path.isAbsolute(entry.path)) continue;
    const name = path.basename(entry.path);
    const ext = path.extname(name).toLowerCase();

    if (ext === '.md') {
      mdEntries.push(entry);
    } else if (SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
      imageEntries.push(entry);
    } else {
      invalidEntries.push(name);
    }
  }

  if (invalidEntries.length > 0) {
    throw new Error(`ZIP contém arquivos não suportados: ${invalidEntries.join(', ')}`);
  }
  if (mdEntries.length === 0) {
    throw new Error('ZIP não contém nenhum arquivo .md');
  }
  if (mdEntries.length > 1) {
    throw new Error('ZIP contém mais de um arquivo .md');
  }

  for (const entry of [...mdEntries, ...imageEntries]) {
    if (entry.uncompressedSize > MAX_FILE_SIZE) {
      throw new Error(`Arquivo "${path.basename(entry.path)}" excede o limite de 20 MB`);
    }
  }

  const mdEntry = mdEntries[0];
  const mdContent = await mdEntry.buffer().then((b: Buffer) => b.toString('utf-8'));
  const mdFilename = path.basename(mdEntry.path);

  const images: ZipExtractResult['images'] = [];
  for (const entry of imageEntries) {
    const imgBuffer = await entry.buffer();
    images.push({ name: path.basename(entry.path), buffer: imgBuffer });
  }

  return { mdFilename, mdContent, images };
}
