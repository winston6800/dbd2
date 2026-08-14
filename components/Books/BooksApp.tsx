import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type { Chapter, LibraryState } from '../../lib/books/types';
import { EMPTY_LIBRARY } from '../../lib/books/types';
import { addBook, bookById, createBook, removeBook, setActiveBook, setChapterError, setChapterImage, setChapterStatus, setChapterSummary } from '../../lib/books/ops';
import { segmentText } from '../../lib/books/segment';
import { extractPdfText } from '../../lib/books/extractPdfText';
import { summarizeChapter } from '../../lib/books/summarizeClient';
import { generateChapterImage } from '../../lib/books/imageClient';
import { runWithConcurrency } from '../../lib/shared/concurrency';
import { ApiError } from '../../lib/shared/http';
import { createLibrarySaver, loadLibraryFor } from '../../lib/books/sync';
import { C, DISPLAY_FONT, MONO_FONT, PAPER_BACKGROUND } from '../../lib/books/tokens';
import { UploadScreen } from './UploadScreen';
import { ChapterCard } from './ChapterCard';
import { ChapterDetail } from './ChapterDetail';
import { track } from '../../lib/monster/analytics';

/** Chapters processed at once — see runWithConcurrency for why this is neither 1 nor unbounded. */
const PIPELINE_CONCURRENCY = 2;

export const BooksApp: React.FC = () => {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<LibraryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);

  const stateRef = useRef<LibraryState | null>(null);
  const saverRef = useRef<ReturnType<typeof createLibrarySaver> | null>(null);

  const commit = useCallback((next: LibraryState) => {
    stateRef.current = next;
    setState(next);
    saverRef.current?.save(next);
  }, []);

  useEffect(() => {
    if (!user) return;
    saverRef.current = createLibrarySaver(user.id);

    let cancelled = false;
    loadLibraryFor(user.id).then(found => {
      if (cancelled) return;
      const initial = found ?? EMPTY_LIBRARY;
      stateRef.current = initial;
      setState(initial);
      setLoading(false);
    });

    const flushOnHide = () => saverRef.current?.flush();
    document.addEventListener('visibilitychange', flushOnHide);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', flushOnHide);
      saverRef.current?.flush();
    };
  }, [user]);

  /** Summarize → illustrate for one chapter, updating state at each stage. */
  const processChapter = useCallback(async (bookId: string, bookTitle: string, chapter: Chapter) => {
    commit(setChapterStatus(stateRef.current!, bookId, chapter.id, 'summarizing'));
    try {
      const result = await summarizeChapter(bookTitle, chapter.sourceHeading, chapter.text);
      commit(setChapterSummary(stateRef.current!, bookId, chapter.id, result));

      const imageDataUrl = await generateChapterImage(result.imagePrompt);
      commit(setChapterImage(stateRef.current!, bookId, chapter.id, imageDataUrl));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong on this chapter.';
      commit(setChapterError(stateRef.current!, bookId, chapter.id, message));
    }
  }, [commit]);

  const runPipeline = useCallback(async (bookId: string, bookTitle: string, chapters: Chapter[]) => {
    await runWithConcurrency(chapters, PIPELINE_CONCURRENCY, chapter => processChapter(bookId, bookTitle, chapter));
  }, [processChapter]);

  const onFile = useCallback(async (file: File) => {
    setUploadBusy(true);
    setUploadError(null);
    try {
      setUploadPhase('Reading the PDF…');
      const text = await extractPdfText(file, (page, total) => setUploadPhase(`Reading page ${page} of ${total}…`));

      setUploadPhase('Finding chapters…');
      const drafts = segmentText(text);
      if (!drafts.length) throw new Error('Could not find any readable text in that file.');

      const title = file.name.replace(/\.pdf$/i, '');
      const book = createBook(title, file.name, drafts);
      const next = addBook(stateRef.current ?? EMPTY_LIBRARY, book);
      commit(next);
      track('book_uploaded', { chapters: drafts.length });

      setUploadBusy(false);
      setUploadPhase(null);
      void runPipeline(book.id, book.title, book.chapters);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read that file.');
      setUploadBusy(false);
      setUploadPhase(null);
    }
  }, [commit, runPipeline]);

  if (loading) return <Splash label="Opening your library…" />;

  const library = state ?? EMPTY_LIBRARY;
  const activeBook = bookById(library, library.activeBookId);
  const openChapter = activeBook?.chapters.find(c => c.id === openChapterId) ?? null;

  return (
    <div style={{ minHeight: '100dvh', ...PAPER_BACKGROUND, color: C.ink }}>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <span
          style={{ fontFamily: DISPLAY_FONT, fontSize: 18, cursor: library.books.length ? 'pointer' : 'default' }}
          onClick={() => commit(setActiveBook(stateRef.current!, null))}
        >
          Chapters
        </span>
        {activeBook && (
          <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: C.inkFaint }}>{activeBook.title}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => void signOut()} style={{ background: 'none', border: 'none', color: C.inkFaint, fontFamily: MONO_FONT, fontSize: 10, cursor: 'pointer' }}>
            SIGN OUT
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 22px 60px' }}>
        {!activeBook ? (
          <Shelf
            library={library}
            onOpenBook={id => commit(setActiveBook(stateRef.current!, id))}
            onRemoveBook={id => commit(removeBook(stateRef.current!, id))}
            onFile={onFile}
            uploadBusy={uploadBusy}
            uploadPhase={uploadPhase}
            uploadError={uploadError}
          />
        ) : (
          <>
            <button
              onClick={() => commit(setActiveBook(stateRef.current!, null))}
              style={{ background: 'none', border: 'none', color: C.inkFaint, fontFamily: MONO_FONT, fontSize: 11, cursor: 'pointer', padding: 0, marginBottom: 18 }}
            >
              ← All books
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
              {activeBook.chapters.map(chapter => (
                <ChapterCard key={chapter.id} chapter={chapter} onOpen={() => setOpenChapterId(chapter.id)} />
              ))}
            </div>
          </>
        )}
      </div>

      {openChapter && <ChapterDetail chapter={openChapter} onClose={() => setOpenChapterId(null)} />}
    </div>
  );
};

const Shelf: React.FC<{
  library: LibraryState;
  onOpenBook: (id: string) => void;
  onRemoveBook: (id: string) => void;
  onFile: (file: File) => void;
  uploadBusy: boolean;
  uploadPhase: string | null;
  uploadError: string | null;
}> = ({ library, onOpenBook, onRemoveBook, onFile, uploadBusy, uploadPhase, uploadError }) => (
  <>
    <UploadScreen onFile={onFile} busy={uploadBusy} phase={uploadPhase} compact={library.books.length > 0} />
    {uploadError && (
      <div style={{ marginTop: 12, fontSize: 13, color: C.accent }}>{uploadError}</div>
    )}

    {library.books.length > 0 && (
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
        {library.books.map(book => {
          const ready = book.chapters.filter(c => c.status === 'ready').length;
          const cover = book.chapters.find(c => c.imageDataUrl)?.imageDataUrl;
          return (
            <div key={book.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <button
                onClick={() => onOpenBook(book.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
              >
                <div style={{ aspectRatio: '4 / 3', background: C.paperDim, overflow: 'hidden' }}>
                  {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontFamily: DISPLAY_FONT, fontSize: 16, marginBottom: 4 }}>{book.title}</div>
                  <div style={{ fontFamily: MONO_FONT, fontSize: 10.5, color: C.inkFaint }}>
                    {ready} / {book.chapters.length} CHAPTERS READY
                  </div>
                </div>
              </button>
              <button
                onClick={() => onRemoveBook(book.id)}
                style={{ width: '100%', background: 'none', border: 'none', borderTop: `1px solid ${C.border}`, padding: '8px', color: C.inkFaint, fontFamily: MONO_FONT, fontSize: 10, cursor: 'pointer' }}
              >
                REMOVE
              </button>
            </div>
          );
        })}
      </div>
    )}
  </>
);

const Splash: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ minHeight: '100dvh', ...PAPER_BACKGROUND, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.inkFaint, fontFamily: MONO_FONT, fontSize: 12 }}>
    {label}
  </div>
);
