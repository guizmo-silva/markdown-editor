import fs from 'fs';

export interface VolumeInfo {
  name: string;       // visible name (e.g., "workspace", "sda1")
  mountPath: string;  // real path in container (e.g., "/workspace", "/md")
}

const VOLUME_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

let cachedVolumes: VolumeInfo[] | null = null;

function parseVolumeEntries(raw: string): VolumeInfo[] {
  const volumes: VolumeInfo[] = [];
  const entries = raw.split(',').map(e => e.trim()).filter(Boolean);

  for (const entry of entries) {
    const colonIndex = entry.indexOf(':');
    if (colonIndex === -1) {
      console.warn(`Invalid volume entry (missing ':'): "${entry}"`);
      continue;
    }

    const name = entry.substring(0, colonIndex).trim();
    const mountPath = entry.substring(colonIndex + 1).trim();

    if (!VOLUME_NAME_REGEX.test(name)) {
      console.warn(`Invalid volume name "${name}" — only [a-zA-Z0-9_-] allowed. Skipping.`);
      continue;
    }

    if (!mountPath) {
      console.warn(`Empty mount path for volume "${name}". Skipping.`);
      continue;
    }

    volumes.push({ name, mountPath });
  }

  return volumes;
}

export function getVolumes(): VolumeInfo[] {
  if (cachedVolumes) return cachedVolumes;

  // Option 1: WORKSPACE_PATHS overrides everything (advanced / legacy)
  const workspacePaths = process.env.WORKSPACE_PATHS;
  if (workspacePaths) {
    const volumes = parseVolumeEntries(workspacePaths);
    if (volumes.length > 0) {
      cachedVolumes = volumes;
      return cachedVolumes;
    }
    console.warn('WORKSPACE_PATHS defined but no valid entries found. Falling back.');
  }

  // Option 2: WORKSPACE_ROOT + optional EXTRA_VOLUMES
  const workspaceRoot = process.env.WORKSPACE_ROOT || '/workspace';
  const volumes: VolumeInfo[] = [{ name: 'workspace', mountPath: workspaceRoot }];

  const extraVolumes = process.env.EXTRA_VOLUMES;
  if (extraVolumes) {
    const extras = parseVolumeEntries(extraVolumes);
    // Prevent duplicates with the workspace volume
    for (const extra of extras) {
      if (extra.name === 'workspace') {
        console.warn(`EXTRA_VOLUMES: name "workspace" is reserved. Skipping.`);
        continue;
      }
      volumes.push(extra);
    }
  }

  cachedVolumes = volumes;
  return cachedVolumes;
}

export function resolveVolumePath(inputPath: string): { volume: VolumeInfo; relativePath: string } {
  const volumes = getVolumes();

  // Normalize: remove leading slash
  let cleanPath = inputPath.trim();
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.slice(1);
  }

  // Extract the first segment as potential volume name
  const slashIndex = cleanPath.indexOf('/');
  const firstSegment = slashIndex === -1 ? cleanPath : cleanPath.substring(0, slashIndex);
  const rest = slashIndex === -1 ? '' : cleanPath.substring(slashIndex + 1);

  // Try to match volume by name
  const matchedVolume = volumes.find(v => v.name === firstSegment);
  if (matchedVolume) {
    return { volume: matchedVolume, relativePath: rest || '.' };
  }

  // Fallback: if there's only 1 volume, use it as default
  if (volumes.length === 1) {
    return { volume: volumes[0], relativePath: cleanPath || '.' };
  }

  throw new Error(`Unknown volume: "${firstSegment}". Available volumes: ${volumes.map(v => v.name).join(', ')}`);
}

export function validateVolumes(): void {
  const volumes = getVolumes();

  for (const volume of volumes) {
    if (!fs.existsSync(volume.mountPath)) {
      console.warn(`Warning: Volume "${volume.name}" mount path does not exist: ${volume.mountPath}`);
    } else {
      console.log(`Volume "${volume.name}" → ${volume.mountPath} (OK)`);
    }
  }
}
