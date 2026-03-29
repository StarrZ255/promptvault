// createRequire charge better-sqlite3 via Node.js natif — complètement invisible
// à Rollup/Vite, aucun bundler ne peut l'intercepter ou le transformer.
import { createRequire } from 'module';
const sqlite3 = createRequire(__filename)('better-sqlite3');
import type { Database as DatabaseType } from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { mapPrompt, RawPrompt, MappedPrompt } from './mapping';
import crypto from 'crypto';
import { pathToFileURL } from 'url';

const dbPath = process.env.PORTABLE_EXECUTABLE_DIR
  ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'vault.db')
  : path.join(app.getPath('userData'), 'vault.db');

export let db: DatabaseType;

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
  db = new sqlite3(dbPath);
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

  // Schema migration — add columns if missing (safe to run on every startup)
  try { db.exec(`ALTER TABLE prompts ADD COLUMN deleted INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE prompts ADD COLUMN deleted_at TEXT`); } catch {}
  try { db.exec(`ALTER TABLE prompts ADD COLUMN suppressed INTEGER DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE themes ADD COLUMN icon_image TEXT`); } catch {}
  try { db.exec(`ALTER TABLE themes ADD COLUMN sort_order INTEGER`); } catch {}

  const insertTheme = db.prepare(
    `INSERT OR IGNORE INTO themes (id, label, icon, color, is_custom) VALUES (?, ?, ?, ?, 0)`
  );
  for (const t of BUILTIN_THEMES) {
    insertTheme.run(t.id, t.label, t.icon, t.color);
  }

  const count = (db.prepare(`SELECT COUNT(*) as n FROM prompts WHERE is_builtin = 1`).get() as { n: number }).n;
  if (count === 0) {
    const skipFlag = path.join(app.getPath('userData'), 'skip-seeds.flag');
    if (fs.existsSync(skipFlag)) {
      console.log('[db] Skip seeds flag detected, skipping builtin prompts seeding.');
      try { fs.unlinkSync(skipFlag); } catch (e) { console.error('Failed to delete skip-seeds flag', e); }
    } else {
      seedBuiltinPrompts();
    }
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
  const files = ['assistant_pro.json', 'recherche_expertise.json', 'creative_hub.json'];
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
  limit?: number; offset?: number;
}): unknown[] {
  let sql = `SELECT * FROM prompts WHERE deleted = 0 AND IFNULL(suppressed, 0) = 0`;
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

  // Ajout de la pagination (Performance)
  if (filter.limit) {
    sql += ` LIMIT ?`;
    params.push(filter.limit);
    if (filter.offset) {
      sql += ` OFFSET ?`;
      params.push(filter.offset);
    }
  }

  return (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(parseRow);
}

export function getPromptById(id: string): unknown {
  const row = db.prepare(`SELECT * FROM prompts WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? parseRow(row) : null;
}

function serializeArrayField(val: unknown): string {
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'string') return val;
  return '[]';
}

export function createPrompt(data: Partial<MappedPrompt>): unknown {
  // Ne jamais persister l'id placeholder du brouillon React (sinon conflit PK + favoris incohérents)
  const id = data.id && data.id !== 'new' ? data.id : crypto.randomUUID();
  const now = new Date().toISOString();
  const body = data.body ?? '';
  const sha256 = crypto.createHash('sha256').update(body).digest('hex');
  const row = {
    id, title: data.title ?? 'Sans titre', body, theme: data.theme ?? 'autre',
    tags:       serializeArrayField(data.tags),
    target_ai:  serializeArrayField(data.target_ai),
    type: data.type ?? 'task',
    variables:  serializeArrayField(data.variables),
    rating: data.rating ?? 0, is_favorite: data.is_favorite ?? 0, is_builtin: 0, locked: 0,
    lang: data.lang ?? 'fr', use_count: 0, sha256,
    created_at: now, updated_at: now,
  };
  db.prepare(INSERT_PROMPT_SQL).run(row);
  return parseRow(row as Record<string, unknown>);
}

export function updatePrompt(id: string, data: Partial<MappedPrompt>): unknown {
  const now = new Date().toISOString();
  const allowed = ['title','body','theme','tags','target_ai','type','variables','rating','is_favorite','locked','lang','suppressed'];
  // Serialize any array fields before binding to SQLite
  const serialized: Record<string, unknown> = { ...data as Record<string, unknown> };
  for (const key of ['tags', 'target_ai', 'variables']) {
    if (key in serialized) serialized[key] = serializeArrayField(serialized[key]);
  }
  const fields = Object.keys(serialized)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = @${k}`)
    .join(', ');
  if (!fields) return getPromptById(id);
  db.prepare(`UPDATE prompts SET ${fields}, updated_at = @updated_at WHERE id = @id`)
    .run({ ...serialized, id, updated_at: now });
  return getPromptById(id);
}

export function deletePrompt(id: string): void {
  const now = new Date().toISOString();
  db.prepare(`UPDATE prompts SET deleted = 1, deleted_at = ? WHERE id = ? AND locked = 0`).run(now, id);
}

export function deleteBatchPrompts(ids: string[]): { deleted: number } {
  if (!ids.length) return { deleted: 0 };
  const now = new Date().toISOString();
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`UPDATE prompts SET deleted = 1, deleted_at = ? WHERE id IN (${placeholders}) AND locked = 0`).run(now, ...ids);
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
  const rows = db.prepare(`
    SELECT t.*, COUNT(p.id) as count
    FROM themes t
    LEFT JOIN prompts p ON p.theme = t.id
      AND p.deleted = 0
      AND IFNULL(p.suppressed, 0) = 0
    GROUP BY t.id
    ORDER BY IFNULL(t.sort_order, 9999), t.is_custom, t.label
  `).all() as Record<string, unknown>[];
  return rows.map(row => ({
    ...row,
    icon_image: row.icon_image ? pathToFileURL(row.icon_image as string).href : null,
  }));
}

export function reorderTheme(id: string, newOrder: number): void {
  db.prepare(`UPDATE themes SET sort_order = ? WHERE id = ?`).run(newOrder, id);
}

export function getSuppressedPrompts(): unknown[] {
  return (db.prepare(`
    SELECT p.*, IFNULL(t.label, p.theme) as theme_label,
           IFNULL(t.icon, '🗂️') as theme_icon,
           IFNULL(t.color, '#6B7280') as theme_color
    FROM prompts p
    LEFT JOIN themes t ON t.id = p.theme
    WHERE p.deleted = 0 AND IFNULL(p.suppressed, 0) = 1
    ORDER BY p.theme, p.title COLLATE NOCASE
  `).all() as Record<string, unknown>[]).map(parseRow);
}

// Alias backward compat
export const getSuppressedBuiltins = getSuppressedPrompts;

export function hideBatchPrompts(ids: string[]): { hidden: number } {
  if (!ids.length) return { hidden: 0 };
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(
    `UPDATE prompts SET suppressed = 1 WHERE id IN (${placeholders}) AND locked = 0`
  ).run(...ids);
  return { hidden: result.changes };
}

export function restoreHiddenPrompt(id: string): void {
  db.prepare(`UPDATE prompts SET suppressed = 0 WHERE id = ?`).run(id);
}

export function suppressBuiltinPrompts(): { hidden: number } {
  const result = db.prepare(
    `UPDATE prompts SET suppressed = 1 WHERE is_builtin = 1 AND locked = 0 AND deleted = 0`
  ).run();
  return { hidden: result.changes };
}

export function deleteBuiltinPrompts(): { deleted: number } {
  const result = db.prepare(
    `UPDATE prompts SET deleted = 1, deleted_at = ? WHERE is_builtin = 1 AND locked = 0`
  ).run(new Date().toISOString());
  return { deleted: result.changes };
}

export function createTheme(data: { id: string; label: string; icon?: string; color?: string; icon_image?: string | null }): unknown {
  db.prepare(`INSERT INTO themes (id, label, icon, color, is_custom, icon_image) VALUES (?, ?, ?, ?, 1, ?)`)
    .run(data.id, data.label, data.icon ?? '🗂️', data.color ?? '#6C63FF', data.icon_image ?? null);
  return data;
}

export function updateTheme(id: string, data: { label?: string; icon?: string; color?: string; icon_image?: string | null }): unknown {
  const fields = Object.keys(data).filter(k => ['label','icon','color','icon_image'].includes(k)).map(k => `${k} = @${k}`).join(', ');
  if (!fields) return;
  db.prepare(`UPDATE themes SET ${fields} WHERE id = @id`).run({ ...data, id });
  return data;
}

export function deleteTheme(id: string): void {
  if (id === 'autre') return; // fallback protégé
  const row = db.prepare(`SELECT icon_image FROM themes WHERE id = ?`).get(id) as { icon_image?: string } | undefined;
  if (row?.icon_image && fs.existsSync(row.icon_image)) {
    try { fs.unlinkSync(row.icon_image); } catch { /* ignore */ }
  }
  db.prepare(`UPDATE prompts SET theme = 'autre' WHERE theme = ?`).run(id);
  db.prepare(`DELETE FROM themes WHERE id = ?`).run(id);
}

export function setThemeIconImage(themeId: string, destPath: string): void {
  db.prepare(`UPDATE themes SET icon_image = ? WHERE id = ?`).run(destPath, themeId);
}

export function importFromJson(filePath: string): { imported: number; perfectDuplicates: number; titleDuplicates: number; errors: string[] } {
  const raw: RawPrompt[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let imported = 0, perfectDuplicates = 0, titleDuplicates = 0;
  const errors: string[] = [];

  const insertStmt = db.prepare(INSERT_PROMPT_SQL);
  const checkSha   = db.prepare(`SELECT id, title, deleted FROM prompts WHERE sha256 = ?`);
  const checkTitle = db.prepare(`SELECT id FROM prompts WHERE LOWER(title) = LOWER(?)`);
  const restoreStmt = db.prepare(`UPDATE prompts SET deleted = 0, deleted_at = NULL WHERE id = ?`);

  const doImport = db.transaction(() => {
    for (const item of raw) {
      try {
        const mapped = mapPrompt(item);
        const existing = checkSha.get(mapped.sha256) as { id: string, title: string, deleted: number } | undefined;
        
        if (existing) {
          if (existing.deleted === 1) {
            // Le prompt existe mais est dans la corbeille -> On le restaure
            restoreStmt.run(existing.id);
            imported++;
          } else {
            // Le prompt existe déjà et est actif -> Doublon parfait ignoré
            perfectDuplicates++;
          }
          continue;
        }

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

export function importPromptLibrary(
  data: unknown[]
): { imported: number; skipped: number } {
  if (!Array.isArray(data) || data.length === 0) return { imported: 0, skipped: 0 };

  let imported = 0, skipped = 0;
  const checkSha    = db.prepare(`SELECT id FROM prompts WHERE sha256 = ? AND deleted = 0`);
  const insertTheme = db.prepare(`INSERT OR IGNORE INTO themes (id, label, icon, color, is_custom) VALUES (?, ?, ?, ?, 1)`);
  const now = new Date().toISOString();

  // Detect format: library ([{ theme, prompts }]) vs flat ([{ title, body, ... }])
  const first = data[0] as Record<string, unknown>;
  const isLibrary = Array.isArray(first.prompts);

  const doImport = db.transaction(() => {
    type Entry = { themeId?: string; prompt: Record<string, unknown> };
    const entries: Entry[] = [];

    if (isLibrary) {
      for (const entry of data as Array<{ theme?: { id: string; label: string; icon?: string; color?: string }; prompts: Record<string, unknown>[] }>) {
        if (entry.theme) {
          insertTheme.run(entry.theme.id, entry.theme.label, entry.theme.icon ?? '🗂️', entry.theme.color ?? '#6C63FF');
        }
        for (const p of (entry.prompts ?? [])) entries.push({ themeId: entry.theme?.id, prompt: p });
      }
    } else {
      for (const p of data as Record<string, unknown>[]) entries.push({ prompt: p });
    }

    const insertStmt = db.prepare(INSERT_PROMPT_SQL);
    for (const { themeId, prompt } of entries) {
      const body = String(prompt.body ?? prompt.content ?? '');
      const sha256 = crypto.createHash('sha256').update(body).digest('hex');
      if (checkSha.get(sha256)) { skipped++; continue; }
      const row = {
        id: crypto.randomUUID(),
        title: String(prompt.title ?? 'Sans titre'),
        body,
        theme: String(themeId ?? prompt.theme ?? 'autre'),
        tags:      serializeArrayField(prompt.tags),
        target_ai: serializeArrayField(prompt.target_ai),
        type:      String(prompt.type ?? 'task'),
        variables: serializeArrayField(prompt.variables),
        rating: Number(prompt.rating ?? 0),
        is_favorite: 0, is_builtin: 0, locked: 0,
        lang: String(prompt.lang ?? 'fr'),
        use_count: 0, sha256,
        created_at: now, updated_at: now,
      };
      if (insertStmt.run(row).changes > 0) imported++;
    }
  });

  doImport();
  return { imported, skipped };
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

export function getDeletedPrompts(): unknown[] {
  return (db.prepare(`SELECT * FROM prompts WHERE deleted = 1 ORDER BY deleted_at DESC`).all() as Record<string, unknown>[]).map(parseRow);
}

export function restorePrompt(id: string): void {
  db.prepare(`UPDATE prompts SET deleted = 0, deleted_at = NULL WHERE id = ?`).run(id);
}

export function permanentDeletePrompt(id: string): void {
  db.prepare(`DELETE FROM prompts WHERE id = ?`).run(id);
}

export function emptyTrash(): { deleted: number } {
  const result = db.prepare(`DELETE FROM prompts WHERE deleted = 1`).run();
  return { deleted: result.changes };
}

export function restoreBuiltinPrompts(): { restored: number } {
  const before = (db.prepare(`SELECT COUNT(*) as n FROM prompts WHERE is_builtin = 1`).get() as { n: number }).n;
  seedBuiltinPrompts();
  const after = (db.prepare(`SELECT COUNT(*) as n FROM prompts WHERE is_builtin = 1`).get() as { n: number }).n;
  return { restored: after - before };
}
