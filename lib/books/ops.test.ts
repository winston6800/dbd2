import { describe, expect, it } from 'vitest';
import {
  addBook,
  bookById,
  createBook,
  removeBook,
  setActiveBook,
  setChapterError,
  setChapterImage,
  setChapterStatus,
  setChapterSummary,
} from './ops';
import type { LibraryState } from './types';
import { EMPTY_LIBRARY } from './types';
import type { ChapterDraft } from './segment';

const drafts: ChapterDraft[] = [
  { index: 1, heading: 'Chapter 1', text: 'one', wordCount: 1 },
  { index: 2, heading: 'Chapter 2', text: 'two', wordCount: 1 },
];

function libraryWithOneBook(): { state: LibraryState; bookId: string; chapterIds: [string, string] } {
  const book = createBook('My Book', 'my-book.pdf', drafts);
  const state = addBook(EMPTY_LIBRARY, book);
  return { state, bookId: book.id, chapterIds: [book.chapters[0].id, book.chapters[1].id] };
}

describe('createBook / addBook', () => {
  it('creates one pending chapter per draft and focuses the new book', () => {
    const { state, bookId } = libraryWithOneBook();
    const book = bookById(state, bookId)!;

    expect(book.chapters).toHaveLength(2);
    expect(book.chapters.every(c => c.status === 'pending')).toBe(true);
    expect(state.activeBookId).toBe(bookId);
  });

  it('falls back to the filename when no title is given', () => {
    const book = createBook('   ', 'untitled.pdf', drafts);
    expect(book.title).toBe('untitled.pdf');
  });

  it('adds new books to the front of the list', () => {
    let state = addBook(EMPTY_LIBRARY, createBook('First', 'a.pdf', drafts));
    state = addBook(state, createBook('Second', 'b.pdf', drafts));
    expect(state.books.map(b => b.title)).toEqual(['Second', 'First']);
  });
});

describe('chapter mutations target only the right chapter', () => {
  it('setChapterStatus does not touch a sibling chapter', () => {
    const { state, bookId, chapterIds } = libraryWithOneBook();
    const next = setChapterStatus(state, bookId, chapterIds[0], 'summarizing');
    const book = bookById(next, bookId)!;

    expect(book.chapters[0].status).toBe('summarizing');
    expect(book.chapters[1].status).toBe('pending');
  });

  it('setChapterSummary fills the fields and advances status', () => {
    const { state, bookId, chapterIds } = libraryWithOneBook();
    const next = setChapterSummary(state, bookId, chapterIds[0], {
      title: 'A Title',
      summary: 'A summary.',
      imagePrompt: 'A scene.',
    });
    const chapter = bookById(next, bookId)!.chapters[0];

    expect(chapter).toMatchObject({ title: 'A Title', summary: 'A summary.', imagePrompt: 'A scene.', status: 'illustrating' });
  });

  it('setChapterImage marks the chapter ready', () => {
    const { state, bookId, chapterIds } = libraryWithOneBook();
    const next = setChapterImage(state, bookId, chapterIds[0], 'data:image/png;base64,x');
    const chapter = bookById(next, bookId)!.chapters[0];

    expect(chapter.imageDataUrl).toBe('data:image/png;base64,x');
    expect(chapter.status).toBe('ready');
  });

  it('setChapterError records the message and clears on a later non-error status', () => {
    const { state, bookId, chapterIds } = libraryWithOneBook();
    const errored = setChapterError(state, bookId, chapterIds[0], 'boom');
    expect(bookById(errored, bookId)!.chapters[0].error).toBe('boom');

    const retried = setChapterStatus(errored, bookId, chapterIds[0], 'summarizing');
    expect(bookById(retried, bookId)!.chapters[0].error).toBeNull();
  });

  it('never mutates a different book sharing a chapter id coincidence', () => {
    const { state, bookId, chapterIds } = libraryWithOneBook();
    const otherBook = createBook('Other', 'other.pdf', drafts);
    const withTwo = addBook(state, otherBook);

    const next = setChapterStatus(withTwo, bookId, chapterIds[0], 'ready');
    expect(bookById(next, otherBook.id)!.chapters.every(c => c.status === 'pending')).toBe(true);
  });
});

describe('removeBook', () => {
  it('drops the book and refocuses another when the active one is removed', () => {
    let state = addBook(EMPTY_LIBRARY, createBook('First', 'a.pdf', drafts));
    const second = createBook('Second', 'b.pdf', drafts);
    state = addBook(state, second);

    const next = removeBook(state, second.id);
    expect(next.books).toHaveLength(1);
    expect(next.activeBookId).toBe(next.books[0].id);
  });

  it('leaves the active id alone when removing a book that is not active', () => {
    const first = createBook('First', 'a.pdf', drafts);
    let state = addBook(EMPTY_LIBRARY, first);
    state = addBook(state, createBook('Second', 'b.pdf', drafts));
    state = setActiveBook(state, first.id);

    const next = removeBook(state, state.books[0].id);
    expect(next.activeBookId).toBe(first.id);
  });

  it('clears activeBookId when the last book is removed', () => {
    const book = createBook('Only', 'a.pdf', drafts);
    const state = addBook(EMPTY_LIBRARY, book);
    expect(removeBook(state, book.id).activeBookId).toBeNull();
  });
});
