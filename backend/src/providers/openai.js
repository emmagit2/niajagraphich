import { config } from '../config.js';
import { AppError } from '../lib/errors.js';

export class OpenAIProvider {
  name = 'openai';
  model = config.openaiImageModel;
  async generate({ prompt, referenceImage, settings = {} }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.aiRequestTimeoutMs);
    try {
      let response;
      if (referenceImage) {
        const form = new FormData();
        form.append('model', this.model);
        form.append('prompt', prompt);
        form.append('image', new Blob([referenceImage.bytes], { type: referenceImage.mimeType }), 'reference-image');
        if (settings.size) form.append('size', settings.size);
        response = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST', headers: { Authorization: `Bearer ${config.openaiApiKey}` }, body: form, signal: controller.signal
        });
      } else {
        response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST', headers: { Authorization: `Bearer ${config.openaiApiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: this.model, prompt, size: settings.size || '1024x1024', n: 1, output_format: 'png' }),
          signal: controller.signal
        });
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new AppError(response.status === 429 ? 429 : 502,'AI_PROVIDER_ERROR',data.error?.message || `OpenAI request failed with status ${response.status}`);
      const item = data.data?.[0];
      if (!item?.b64_json) throw new AppError(502,'AI_NO_IMAGE','AI provider did not return a base64 image.');
      const bytes = Buffer.from(item.b64_json,'base64');
      if (bytes.length > config.aiMaxOutputBytes) throw new AppError(502,'AI_OUTPUT_TOO_LARGE','Generated image exceeds output limit.');
      return { bytes, mimeType: 'image/png', providerRequestId: data.id || null, model: this.model };
    } catch (e) {
      if (e.name === 'AbortError') throw new AppError(504,'AI_TIMEOUT','Image generation timed out. Reserved tokens will be released.');
      throw e;
    } finally { clearTimeout(timer); }
  }
}
