/**
 * The book summarizer's data model.
 *
 * A Book is one uploaded PDF. It splits into Chapters; each Chapter starts as
 * raw extracted text and fills in as the pipeline runs: a title, an engaging
 * summary, an image prompt, and finally the generated image itself. Status is
 * tracked per chapter rather than per book, because generation happens one
 * chapter at a time and a book with 12 chapters is legitimately "half done."
 */

export type ChapterStatus = 'pending' | 'summarizing' | 'illustrating' | 'ready' | 'error';

export interface Chapter {
  id: string;
  index: number;
  /** Heading detected in the source, e.g. "Chapter 3" — shown until the real title arrives. */
  sourceHeading: string;
  /** Raw extracted text for this chapter. Kept so a chapter can be regenerated. */
  text: string;
  wordCount: number;
  status: ChapterStatus;
  /** Model-written title, once summarized. */
  title: string | null;
  summary: string | null;
  imagePrompt: string | null;
  /** data: URI — see lib/books/storage.ts for the size tradeoff this implies. */
  imageDataUrl: string | null;
  error: string | null;
}

export interface Book {
  id: string;
  title: string;
  sourceFilename: string;
  chapters: Chapter[];
  createdAt: string;
}

/** The slice of app state that gets persisted. */
export interface LibraryState {
  books: Book[];
  activeBookId: string | null;
}

export const EMPTY_LIBRARY: LibraryState = { books: [], activeBookId: null };
