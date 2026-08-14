import type { Book, Chapter, ChapterStatus, LibraryState } from './types';
import type { ChapterDraft } from './segment';
import { uid } from '../monster/ids';

/**
 * Every mutation of the library, as a pure function — same reasoning as
 * lib/net/ops.ts: the pipeline runs several chapters through several async
 * stages concurrently, and "the wrong chapter got the wrong image" is the kind
 * of bug a screenshot cannot catch but a test of the reducer logic can.
 */

const now = () => new Date().toISOString();

export function chapterFromDraft(draft: ChapterDraft): Chapter {
  return {
    id: uid('chapter'),
    index: draft.index,
    sourceHeading: draft.heading,
    text: draft.text,
    wordCount: draft.wordCount,
    status: 'pending',
    title: null,
    summary: null,
    imagePrompt: null,
    imageDataUrl: null,
    error: null,
  };
}

export function createBook(title: string, sourceFilename: string, drafts: ChapterDraft[]): Book {
  return {
    id: uid('book'),
    title: title.trim() || sourceFilename,
    sourceFilename,
    chapters: drafts.map(chapterFromDraft),
    createdAt: now(),
  };
}

export function addBook(state: LibraryState, book: Book): LibraryState {
  return { books: [book, ...state.books], activeBookId: book.id };
}

export function bookById(state: LibraryState, id: string | null): Book | null {
  if (!id) return null;
  return state.books.find(b => b.id === id) ?? null;
}

export function setActiveBook(state: LibraryState, id: string | null): LibraryState {
  return { ...state, activeBookId: id };
}

export function removeBook(state: LibraryState, id: string): LibraryState {
  const books = state.books.filter(b => b.id !== id);
  const activeBookId = state.activeBookId === id ? (books[0]?.id ?? null) : state.activeBookId;
  return { books, activeBookId };
}

function replaceChapter(state: LibraryState, bookId: string, chapterId: string, fn: (c: Chapter) => Chapter): LibraryState {
  return {
    ...state,
    books: state.books.map(book =>
      book.id !== bookId
        ? book
        : { ...book, chapters: book.chapters.map(c => (c.id === chapterId ? fn(c) : c)) },
    ),
  };
}

export function setChapterStatus(state: LibraryState, bookId: string, chapterId: string, status: ChapterStatus): LibraryState {
  return replaceChapter(state, bookId, chapterId, c => ({ ...c, status, error: status === 'error' ? c.error : null }));
}

export function setChapterSummary(
  state: LibraryState,
  bookId: string,
  chapterId: string,
  summary: { title: string; summary: string; imagePrompt: string },
): LibraryState {
  return replaceChapter(state, bookId, chapterId, c => ({
    ...c,
    title: summary.title,
    summary: summary.summary,
    imagePrompt: summary.imagePrompt,
    status: 'illustrating',
  }));
}

export function setChapterImage(state: LibraryState, bookId: string, chapterId: string, imageDataUrl: string): LibraryState {
  return replaceChapter(state, bookId, chapterId, c => ({ ...c, imageDataUrl, status: 'ready' }));
}

export function setChapterError(state: LibraryState, bookId: string, chapterId: string, error: string): LibraryState {
  return replaceChapter(state, bookId, chapterId, c => ({ ...c, status: 'error', error }));
}
