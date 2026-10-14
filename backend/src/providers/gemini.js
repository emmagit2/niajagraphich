import { config } from '../config.js';
import { AppError } from '../lib/errors.js';

export class GeminiProvider {
  name = 'gemini';
  model = config.geminiImageModel;
  async generate({ prompt, referenceImage, settings = {} }) {
    const parts = [{ text: prompt }];
    if (referenceImage) {
      parts.push({
        inline_data: {
          mime_type: referenceImage.mimeType,
          data: referenceImage.bytes.toString('base64')
        }
      });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.aiRequestTimeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['TEXT','IMAGE'],
            ...(settings.aspectRatio ? { imageConfig: { aspectRatio: settings.aspectRatio } } : {})
          }
        }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new AppError(response.status === 429 ? 429 : 502,'AI_PROVIDER_ERROR',
          data.error?.message || `Gemini request failed with status ${response.status}`);
      }
      const candidates = data.candidates || [];
      for (const candidate of candidates) {
        for (const part of candidate.content?.parts || []) {
          const inline = part.inlineData || part.inline_data;
          if (inline?.data) {
            const bytes = Buffer.from(inline.data,'base64');
            if (bytes.length > config.aiMaxOutputBytes) throw new AppError(502,'AI_OUTPUT_TOO_LARGE','Generated image exceeds output limit.');
            return { bytes, mimeType: inline.mimeType || inline.mime_type || 'image/png', providerRequestId: data.responseId || null, model: this.model };
          }
        }
      }
      throw new AppError(502,'AI_NO_IMAGE','The AI provider did not return an image. Try a more specific prompt.');
    } catch (e) {
      if (e.name === 'AbortError') throw new AppError(504,'AI_TIMEOUT','Image generation timed out. Reserved tokens will be released.');
      throw e;
    } finally { clearTimeout(timer); }
  }
}
