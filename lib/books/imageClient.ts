import { authedPost } from '../shared/http';

/** Client for /api/chapter-image, the one endpoint that holds the OpenAI key. */
export async function generateChapterImage(prompt: string): Promise<string> {
  const { dataUrl } = await authedPost<{ dataUrl: string }>('/api/chapter-image', { prompt });
  return dataUrl;
}
