export interface Folder {
  id: string;
  name: string;
  type: 'folder' | 'section' | 'chapter';
  parent?: string;
  children: string[];
  createdAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Flashcard {
  id: string;
  noteId: string;
  question: string;
  answer: string;
  textSelection: string;
  tags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  stats: {
    timesReviewed: number;
    correctAnswers: number;
    lastReviewed?: Date;
    lastResponse?: 'easy' | 'again';
  };
}

export interface AppState {
  folders: Folder[];
  notes: Note[];
  flashcards: Flashcard[];
  selectedNoteId?: string;
  sidebarCollapsed: boolean;
  searchQuery: string;
}

export type RevisionMode = 'current-note' | 'folder' | 'all' | 'tags';

export type EvaluationResult = 'easy' | 'medium' | 'hard' | 'again';