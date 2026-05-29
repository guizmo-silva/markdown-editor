import { loadModule } from 'hunspell-asm';
import type { HunspellFactory, Hunspell } from 'hunspell-asm';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';

const _require = createRequire(import.meta.url);

const LANG_TO_PACKAGE: Record<string, string> = {
  'en-US': 'dictionary-en',
  'pt-BR': 'dictionary-pt',
  'es-ES': 'dictionary-es',
  'fr-FR': 'dictionary-fr',
  'de-DE': 'dictionary-de',
  'ru-RU': 'dictionary-ru',
};

let factory: HunspellFactory | null = null;
const cache = new Map<string, Hunspell>();

async function getFactory(): Promise<HunspellFactory> {
  if (!factory) factory = await loadModule();
  return factory;
}

async function getChecker(lang: string): Promise<Hunspell | null> {
  if (cache.has(lang)) return cache.get(lang)!;

  const pkg = LANG_TO_PACKAGE[lang];
  if (!pkg) return null;

  const f = await getFactory();
  const pkgDir = path.dirname(_require.resolve(pkg));
  const aff = readFileSync(path.join(pkgDir, 'index.aff'));
  const dic = readFileSync(path.join(pkgDir, 'index.dic'));

  const affPath = f.mountBuffer(aff, `${lang}.aff`);
  const dicPath = f.mountBuffer(dic, `${lang}.dic`);
  const checker = f.create(affPath, dicPath);
  cache.set(lang, checker);
  return checker;
}

const WORD_RE = /^[\p{L}'-]+$/u;

export async function suggestWord(word: string, lang: string): Promise<{ misspelled: boolean; suggestions: string[] }> {
  if (!WORD_RE.test(word) || !LANG_TO_PACKAGE[lang]) {
    return { misspelled: false, suggestions: [] };
  }

  const checker = await getChecker(lang);
  if (!checker) return { misspelled: false, suggestions: [] };

  const correct = checker.spell(word);
  if (correct) return { misspelled: false, suggestions: [] };

  const suggestions = checker.suggest(word).slice(0, 5);
  return { misspelled: true, suggestions };
}
