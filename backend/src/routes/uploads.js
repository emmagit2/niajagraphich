import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { saveImage } from '../services/storage.js';
import { AppError, asyncHandler } from '../lib/errors.js';

const router = Router();
router.use(authenticate);
const schema = z.object({ mimeType:z.enum(['image/png','image/jpeg','image/webp']), base64:z.string().min(1) });
router.post('/uploads', asyncHandler(async (req,res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400,'INVALID_UPLOAD','Provide a supported image MIME type and base64 data.');
  const bytes = Buffer.from(parsed.data.base64,'base64');
  if (!bytes.length || bytes.length > Number(process.env.MAX_UPLOAD_BYTES || 10000000)) throw new AppError(413,'UPLOAD_SIZE_INVALID','Image is empty or exceeds the upload size limit.');
  // Check magic bytes; do not trust only the declared MIME type.
  const sig = bytes.subarray(0,12);
  const valid = (parsed.data.mimeType==='image/png' && sig.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    || (parsed.data.mimeType==='image/jpeg' && sig[0]===0xff && sig[1]===0xd8 && sig[2]===0xff)
    || (parsed.data.mimeType==='image/webp' && sig.toString('ascii',0,4)==='RIFF' && sig.toString('ascii',8,12)==='WEBP');
  if (!valid) throw new AppError(415,'INVALID_IMAGE_CONTENT','File content does not match the declared image type.');
  const saved = await saveImage({ ownerId:req.user.id,bytes,mimeType:parsed.data.mimeType,kind:'upload' });
  const row = (await query(`INSERT INTO design_assets(user_id,storage_key,mime_type,size_bytes,kind)
    VALUES($1,$2,$3,$4,'upload') RETURNING id,mime_type,size_bytes,created_at`,
    [req.user.id,saved.storageKey,saved.mimeType,saved.sizeBytes])).rows[0];
  res.status(201).json({ asset:row });
}));
export default router;
