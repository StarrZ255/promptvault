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
  suppressed?: 0 | 1;
}

export interface Theme {
  id: string;
  label: string;
  icon: string;
  color: string;
  is_custom: 0 | 1;
  count?: number;
  icon_image?: string | null;
  sort_order?: number;
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
  limit?: number;
  offset?: number;
}

export interface ImportReport {
  imported: number;
  perfectDuplicates: number;
  titleDuplicates: number;
  errors: string[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

export type SuppressedPrompt = Prompt & {
  theme_label: string;
  theme_icon: string;
  theme_color: string;
};

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
    moveBatch: (ids: string[], themeId: string) => Promise<{ moved: number }>;
    duplicate: (id: string) => Promise<Prompt>;
    incrementUseCount: (id: string) => Promise<void>;
    getDeleted: () => Promise<Prompt[]>;
    restore: (id: string) => Promise<void>;
    permanentDelete: (id: string) => Promise<void>;
    emptyTrash: () => Promise<{ deleted: number }>;
    getSuppressedBuiltins: () => Promise<Prompt[]>;
    getSuppressed: () => Promise<SuppressedPrompt[]>;
    hideBatch: (ids: string[]) => Promise<{ hidden: number }>;
    restoreHidden: (id: string) => Promise<void>;
    suppressBuiltins: () => Promise<{ hidden: number }>;
    deleteBuiltins: () => Promise<void>;
  };
  themes: {
    getAll: () => Promise<Theme[]>;
    create: (data: Partial<Theme>) => Promise<Theme>;
    update: (id: string, data: Partial<Theme>) => Promise<Theme>;
    delete: (id: string) => Promise<void>;
    restore: () => Promise<{ restored: number }>;
    reorder: (id: string, order: number) => Promise<void>;
    saveIconImage: (themeId: string) => Promise<string | null>;
  };
  import: {
    fromJson:  (filePath: string)   => Promise<ImportReport>;
    fromPaste: (content: string)    => Promise<PartialPrompt>;
    library:   (jsonString: string) => Promise<ImportResult>;
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
    readFile: (filePath: string) => Promise<string>;
    copyToClipboard: (text: string) => Promise<void>;
    pathToFileUrl: (filePath: string) => Promise<string>;
  };
  shortcuts: {
    get: () => Promise<{ toggleMini: string; quickCapture: string; focusSearch: string; openMain: string }>;
    set: (s: { toggleMini: string; quickCapture: string; focusSearch: string; openMain: string }) => Promise<{ success: boolean; errors: string[] }>;
  };
  startup: {
    get: () => Promise<boolean>;
    set: (enabled: boolean) => Promise<boolean>;
  };
  window: {
    openQuickCapture: () => void;
    openImport: () => void;
    openMini: () => void;
    openMain: () => void;
    editPrompt: (p: Prompt) => void;
    quickCapture: () => void;
    close: () => void;
    minimize: () => void;
    maximize: () => void;
  };
  on: (event: string, callback: (...args: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    vault: VaultAPI;
  }
}
