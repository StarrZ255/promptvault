import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { mapPrompt, RawPrompt, MappedPrompt } from './mapping';
import crypto from 'crypto';

const dbPath = process.env.PORTABLE_EXECUTABLE_DIR
  ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'vault.db')
  : path.join(app.getPath('userData'), 'vault.db');

export let db: Database.Database;

const BUILTIN_THEMES = [
  { id: 'notebooklm',    label: 'NotebookLM',            icon: '📓', color: '#FF6B35' },
  { id: 'recherche',     label: 'Recherche & Analyse',    icon: '🔍', color: '#00D4AA' },
  { id: 'code',          label: 'Code & Développement',   icon: '💻', color: '#6C63FF' },
  { id: 'redaction',     label: 'Rédaction & Contenu',    icon: '✍️', color: '#4ECDC4' },
  { id: 'productivite',  label: 'Productivité',            icon: '⚡', color: '#FFE66D' },
  { id: 'business',      label: 'Business & Stratégie',   icon: '📊', color: '#A8DADC' },
  { id: 'securite',      label: 'Cybersécurité',           icon: '🔐', color: '#E63946' },
  { id: 'apprentissage', label: 'Apprentissage & Études',  icon: '🎓', color: '#457B9D' },
  { id: 'creativite',    label: 'Créativité & Idéation',  icon: '🎨', color: '#F4A261' },
  { id: 'personnel',     label: 'Personnel',               icon: '👤', color: '#8D99AE' },
  { id: 'autre',         label: 'Autre',                   icon: '🗂️', color: '#6B7280' },
];

const INSERT_PROMPT_SQL = `
  INSERT OR IGNORE INTO prompts
    (id,title,body,theme,tags,target_ai,type,variables,rating,
     is_favorite,is_builtin,locked,lang,use_count,sha256,created_at,updated_at)
  VALUES
    (@id,@title,@body,@theme,@tags,@target_ai,@type,@variables,@rating,
     @is_favorite,@is_builtin,@locked,@lang,@use_count,@sha256,@created_at,@updated_at)
`;

export function initDatabase(): void {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      theme       TEXT NOT NULL,
      tags        TEXT DEFAULT '[]',
      target_ai   TEXT DEFAULT '[]',
      type        TEXT DEFAULT 'task',
      variables   TEXT DEFAULT '[]',
      rating      INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      is_builtin  INTEGER DEFAULT 0,
      locked      INTEGER DEFAULT 0,
      lang        TEXT DEFAULT 'fr',
      use_count   INTEGER DEFAULT 0,
      sha256      TEXT,
      created_at  TEXT,
      updated_at  TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sha256 ON prompts(sha256);
    CREATE TABLE IF NOT EXISTS themes (
      id        TEXT PRIMARY KEY,
      label     TEXT NOT NULL,
      icon      TEXT,
      color     TEXT DEFAULT '#6C63FF',
      is_custom INTEGER DEFAULT 0
    );
  `);

  const insertTheme = db.prepare(
    `INSERT OR IGNORE INTO themes (id, label, icon, color, is_custom) VALUES (?, ?, ?, ?, 0)`
  );
  for (const t of BUILTIN_THEMES) {
    insertTheme.run(t.id, t.label, t.icon, t.color);
  }

  const count = (db.prepare(`SELECT COUNT(*) as n FROM prompts WHERE is_builtin = 1`).get() as { n: number }).n;
  if (count === 0) {
    seedBuiltinPrompts();
  }
}

function getSeedsDir(): string {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'seeds');
  }
  // En prod packagée : process.resourcesPath pointe vers les ressources embarquées
  // En dev : app.isPackaged est false, on lit depuis data/seeds/ à la racine du projet
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'seeds');
  }
  return path.join(app.getAppPath(), 'data', 'seeds');
}

function seedBuiltinPrompts(): void {
  const seedDir = getSeedsDir();
  const files = ['temp_gemini.json', 'temp_notebooklm.json', 'temp_openai.json'];
  const insert = db.prepare(INSERT_PROMPT_SQL);

  const seedMany = db.transaction((rows: MappedPrompt[]) => {
    for (const row of rows) insert.run(row);
  });

  for (const file of files) {
    const filePath = path.join(seedDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[seed] Fichier introuvable : ${filePath}`);
      continue;
    }
    const raw: RawPrompt[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const mapped = raw.map(mapPrompt);
    seedMany(mapped);
    console.log(`[seed] ${file} : ${mapped.length} prompts`);
  }
}

function parseRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    tags:      JSON.parse(row.tags as string ?? '[]'),
    target_ai: JSON.parse(row.target_ai as string ?? '[]'),
    variables: JSON.parse(row.variables as string ?? '[]'),
  };
}

export function getPrompts(filter: {
  query?: string; theme?: string; favorites?: boolean;
  type?: string; lang?: string; minRating?: number; sortBy?: string;
}): unknown[] {
  let sql = `SELECT * FROM prompts WHERE 1=1`;
  const params: unknown[] = [];

  if (filter.theme)     { sql += ` AND theme = ?`;    params.push(filter.theme); }
  if (filter.favorites) { sql += ` AND is_favorite = 1`; }
  if (filter.type)      { sql += ` AND type = ?`;     params.push(filter.type); }
  if (filter.lang)      { sql += ` AND lang = ?`;     params.push(filter.lang); }
  if (filter.minRating) { sql += ` AND rating >= ?`;  params.push(filter.minRating); }

  if (filter.query) {
    const q = `%${filter.query}%`;
    sql += ` AND (title LIKE ? OR body LIKE ? OR tags LIKE ?)`;
    params.push(q, q, q);
  }

  const sortMap: Record<string, string> = {
    updated_at: 'updated_at DESC',
    use_count:  'use_count DESC',
    rating:     'rating DESC',
    relevance:  'updated_at DESC',
  };
  sql += ` ORDER BY ${sortMap[filter.sortBy ?? 'updated_at'] ?? 'updated_at DESC'}`;

  return (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(parseRow);
}

export function getPromptById(id: string): unknown {
  const row = db.prepare(`SELECT * FROM prompts WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? parseRow(row) : null;
}

export function createPrompt(data: Partial<MappedPrompt>): unknown {
  const id = data.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const body = data.body ?? '';
  const sha256 = crypto.createHash('sha256').update(body).digest('hex');
  const row = {
    id, title: data.title ?? 'Sans titre', body, theme: data.theme ?? 'autre',
    tags: data.tags ?? '[]', target_ai: data.target_ai ?? '[]',
    type: data.type ?? 'task', variables: data.variables ?? '[]',
    rating: data.rating ?? 0, is_favorite: 0, is_builtin: 0, locked: 0,
    lang: data.lang ?? 'fr', use_count: 0, sha256,
    created_at: now, updated_at: now,
  };
  db.prepare(INSERT_PROMPT_SQL).run(row);
  return parseRow(row as Record<string, unknown>);
}

export function updatePrompt(id: string, data: Partial<MappedPrompt>): unknown {
  const now = new Date().toISOString();
  const allowed = ['title','body','theme','tags','target_ai','type','variables','rating','is_favorite','locked','lang'];
  const fields = Object.keys(data)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ');
  if (!fields) return getPromptById(id);
  db.prepare(`UPDATE prompts SET ${fields}, updated_at = @updated_at WHERE id = @id`)
    .run({ ...data, id, updated_at: now });
  return getPromptById(id);
}

export function deletePrompt(id: string): void {
  db.prepare(`DELETE FROM prompts WHERE id = ? AND locked = 0`).run(id);
}

export function deleteBatchPrompts(ids: string[]): { deleted: number } {
  if (!ids.length) return { deleted: 0 };
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM prompts WHERE id IN (${placeholders}) AND locked = 0`).run(...ids);
  return { deleted: result.changes };
}

export function duplicatePrompt(id: string): unknown {
  const src = db.prepare(`SELECT * FROM prompts WHERE id = ?`).get(id) as MappedPrompt | undefined;
  if (!src) throw new Error('Prompt introuvable');
  const { id: _id, sha256: _sha, ...rest } = src;
  return createPrompt({ ...rest, title: `${src.title} (copie)` });
}

export function incrementUseCount(id: string): void {
  db.prepare(`UPDATE prompts SET use_count = use_count + 1 WHERE id = ?`).run(id);
}

export function getThemes(): unknown[] {
  return db.prepare(`
    SELECT t.*, COUNT(p.id) as count
    FROM themes t
    LEFT JOIN prompts p ON p.theme = t.id
    GROUP BY t.id
    ORDER BY t.is_custom, t.label
  `).all();
}

export function createTheme(data: { id: string; label: string; icon?: string; color?: string }): unknown {
  db.prepare(`INSERT INTO themes (id, label, icon, color, is_custom) VALUES (?, ?, ?, ?, 1)`)
    .run(data.id, data.label, data.icon ?? '🗂️', data.color ?? '#6C63FF');
  return data;
}

export function deleteTheme(id: string): void {
  db.prepare(`DELETE FROM themes WHERE id = ? AND is_custom = 1`).run(id);
}

export function importFromJson(filePath: string): { imported: number; perfectDuplicates: number; titleDuplicates: number; errors: string[] } {
  const raw: RawPrompt[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let imported = 0, perfectDuplicates = 0, titleDuplicates = 0;
  const errors: string[] = [];

  const insertStmt = db.prepare(INSERT_PROMPT_SQL);
  const checkSha   = db.prepare(`SELECT title FROM prompts WHERE sha256 = ?`);
  const checkTitle = db.prepare(`SELECT id FROM prompts WHERE LOWER(title) = LOWER(?)`);

  const doImport = db.transaction(() => {
    for (const item of raw) {
      try {
        const mapped = mapPrompt(item);
        if (checkSha.get(mapped.sha256)) { perfectDuplicates++; continue; }
        if (checkTitle.get(mapped.title)) titleDuplicates++;
        const result = insertStmt.run(mapped);
        if (result.changes > 0) imported++;
      } catch (e) {
        errors.push(String(e));
      }
    }
  });

  doImport();
  return { imported, perfectDuplicates, titleDuplicates, errors };
}

export function exportToJson(ids?: string[]): string {
  let rows;
  if (ids && ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    rows = (db.prepare(`SELECT * FROM prompts WHERE id IN (${ph})`).all(...ids) as Record<string, unknown>[]).map(parseRow);
  } else {
    rows = (db.prepare(`SELECT * FROM prompts`).all() as Record<string, unknown>[]).map(parseRow);
  }
  return JSON.stringify(rows, null, 2);
}

export function restoreBuiltinPrompts(): { restored: number } {
  const before = (db.prepare(`SELECT COUNT(*) as n FROM prompts WHERE is_builtin = 1`).get() as { n: number }).n;
  seedBuiltinPrompts();
  const after = (db.prepare(`SELECT COUNT(*) as n FROM prompts WHERE is_builtin = 1`).get() as { n: number }).n;
  return { restored: after - before };
}
