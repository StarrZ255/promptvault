export interface Prompt {
  id: string;
  title: string;
  body: string;
  theme: string;
  tags: string[];
  target_ai: string[];
  type: string;
  variables: string[];
  rating: number;
  is_favorite: 0 | 1;
  is_builtin: 0 | 1;
  locked: 0 | 1;
  lang: string;
  use_count: number;
  sha256: string;
  created_at: string;
  updated_at: string;
  deleted?: 0 | 1;
  deleted_at?: string;
}

export interface Theme {
  id: string;
  label: string;
  icon: string;
  color: string;
  is_custom: 0 | 1;
  count?: number;
}

export interface SearchFilter {
  query?: string;
  theme?: string;
  favorites?: boolean;
  type?: string;
  lang?: string;
  minRating?: number;
  sortBy?: 'relevance' | 'updated_at' | 'use_count' | 'rating';
  trash?: boolean;
}

export interface ImportReport {
  imported: number;
  perfectDuplicates: number;
  titleDuplicates: number;
  errors: string[];
}

export interface PartialPrompt {
  title: string;
  body: string;
  suggestedTheme: string;
  suggestedTags: string[];
}

export interface VaultAPI {
  prompts: {
    getAll: (filter: SearchFilter) => Promise<Prompt[]>;
    getById: (id: string) => Promise<Prompt>;
    create: (data: Partial<Prompt>) => Promise<Prompt>;
    update: (id: string, data: Partial<Prompt>) => Promise<Prompt>;
    delete: (id: string) => Promise<void>;
    deleteBatch: (ids: string[]) => Promise<{ deleted: number }>;
    duplicate: (id: string) => Promise<Prompt>;
    incrementUseCount: (id: string) => Promise<void>;
    getDeleted: () => Promise<Prompt[]>;
    restore: (id: string) => Promise<void>;
    permanentDelete: (id: string) => Promise<void>;
    emptyTrash: () => Promise<{ deleted: number }>;
  };
  themes: {
    getAll: () => Promise<Theme[]>;
    create: (data: Partial<Theme>) => Promise<Theme>;
    update: (id: string, data: Partial<Theme>) => Promise<Theme>;
    delete: (id: string) => Promise<void>;
    restore: () => Promise<{ restored: number }>;
  };
  import: {
    fromJson: (filePath: string) => Promise<ImportReport>;
    fromPaste: (content: string) => Promise<PartialPrompt>;
  };
  export: {
    toJson: (ids?: string[]) => Promise<string>;
  };
  search: {
    query: (params: SearchFilter) => Promise<Prompt[]>;
  };
  system: {
    openFileDialog: (opts: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
    saveFileDialog: (opts: { defaultPath?: string }) => Promise<string | null>;
    copyToClipboard: (text: string) => Promise<void>;
  };
  shortcuts: {
    get: () => Promise<{ toggleMini: string; quickCapture: string; focusSearch: string; openMain: string }>;
    set: (s: { toggleMini: string; quickCapture: string; focusSearch: string; openMain: string }) => Promise<void>;
  };
  startup: {
    get: () => Promise<boolean>;
    set: (enabled: boolean) => Promise<boolean>;
  };
  window: {
    openQuickCapture: () => void;
    openImport: () => void;
    openMini?: () => void;
    openMain?: () => void;
    closeWindow: () => void;
  };
  on: (event: string, callback: (...args: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    vault: VaultAPI;
  }
}
