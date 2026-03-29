import crypto from 'crypto';

const THEME_MAP: Record<string, string> = {
  'productivité':   'productivite',
  'productivite':   'productivite',
  'créativité':     'creativite',
  'creativite':     'creativite',
  'rédaction':      'redaction',
  'redaction':      'redaction',
  'analyse':        'recherche',
  'automatisation': 'autre',
  'cybersécurité':  'securite',
  'cybersecurite':  'securite',
  'notebooklm':     'notebooklm',
  'recherche':      'recherche',
  'code':           'code',
  'apprentissage':  'apprentissage',
  'business':       'business',
  'personnel':      'personnel',
  'securite':       'securite',
  'autre':          'autre',
};

function normalizeTheme(raw: string): string {
  const lower = raw.toLowerCase();
  if (THEME_MAP[lower]) return THEME_MAP[lower];
  const noAccent = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return THEME_MAP[noAccent] ?? 'autre';
}

export interface RawPrompt {
  id?: string;
  title: string;
  content?: string;
  body?: string;
  context?: string[];
  target_ai?: string[];
  type?: string;
  variables?: string[];
  rating?: number;
  source?: string;
  locked?: boolean;
  lang?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MappedPrompt {
  id: string;
  title: string;
  body: string;
  theme: string;
  tags: string;
  target_ai: string;
  type: string;
  variables: string;
  rating: number;
  is_favorite: number;
  is_builtin: number;
  locked: number;
  lang: string;
  use_count: number;
  sha256: string;
  created_at: string;
  updated_at: string;
}

export function suggestPromptFromText(content: string): { title: string; body: string; suggestedTheme: string; suggestedTags: string[] } {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const firstLine = lines[0] || '';
  const title = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
  
  const lower = content.toLowerCase();
  let theme = 'autre';
  const tags: string[] = [];

  // Logic: Keywords detection
  if (lower.includes('function') || lower.includes('const ') || lower.includes('import ') || lower.includes('return ') || lower.includes('code ') || lower.includes('script')) {
    theme = 'code';
    tags.push('Développement');
  } else if (lower.includes('analyse') || lower.includes('extraire') || lower.includes('données') || lower.includes('synthèse') || lower.includes('rapport')) {
    theme = 'recherche';
    tags.push('Analyse');
  } else if (lower.includes('écrire') || lower.includes('rédiger') || lower.includes('email') || lower.includes('brouillon') || lower.includes('article') || lower.includes('blog')) {
    theme = 'redaction';
    tags.push('Contenu');
  } else if (lower.includes('histoire') || lower.includes('créatif') || lower.includes('personnage') || lower.includes('poème') || lower.includes('art')) {
    theme = 'creativite';
    tags.push('Créatif');
  } else if (lower.includes('business') || lower.includes('stratégie') || lower.includes('marché') || lower.includes('client')) {
    theme = 'business';
    tags.push('Audit');
  } else if (lower.includes('sécurité') || lower.includes('mots de passe') || lower.includes('hack') || lower.includes('protection')) {
    theme = 'securite';
    tags.push('Sécurité');
  } else if (lower.includes('apprendre') || lower.includes('cours') || lower.includes('éducation') || lower.includes('étude')) {
    theme = 'apprentissage';
    tags.push('Étude');
  } else if (lower.includes('agenda') || lower.includes('organisation') || lower.includes('tâche') || lower.includes('efficace')) {
    theme = 'productivite';
    tags.push('Efficacité');
  }

  return {
    title,
    body: content,
    suggestedTheme: theme,
    suggestedTags: tags,
  };
}

export function mapPrompt(raw: RawPrompt): MappedPrompt {
  const body = raw.content ?? raw.body ?? '';
  const context = raw.context ?? [];
  const theme = normalizeTheme(context[0] ?? 'autre');
  const extraTags = context.slice(1);
  const sha256 = crypto.createHash('sha256').update(body).digest('hex');

  return {
    id:          raw.id ?? crypto.randomUUID(),
    title:       raw.title,
    body,
    theme,
    tags:        JSON.stringify(extraTags),
    target_ai:   JSON.stringify(raw.target_ai ?? []),
    type:        raw.type ?? 'task',
    variables:   JSON.stringify(raw.variables ?? []),
    rating:      raw.rating ?? 0,
    is_favorite: 0,
    is_builtin:  raw.source === 'officiel' ? 1 : 0,
    locked:      raw.locked ? 1 : 0,
    lang:        raw.lang ?? 'fr',
    use_count:   0,
    sha256,
    created_at:  raw.created_at ?? new Date().toISOString(),
    updated_at:  raw.updated_at ?? new Date().toISOString(),
  };
}
