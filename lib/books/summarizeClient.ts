import { postAgentTurn } from '../shared/agentTurn';
import { buildSummarySystemPrompt, parseChapterSummary, truncateChapterText, type ChapterSummary } from './summarize';

/** Client side of a chapter's summarize call — prompt building and parsing are pure and tested separately. */
export async function summarizeChapter(bookTitle: string, sourceHeading: string, text: string): Promise<ChapterSummary> {
  const system = buildSummarySystemPrompt(bookTitle, sourceHeading);
  const raw = await postAgentTurn(system, [{ role: 'user', content: truncateChapterText(text) }]);
  return parseChapterSummary(raw, sourceHeading);
}
