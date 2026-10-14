import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { AppError, asyncHandler } from '../lib/errors.js';
import { getImageProvider } from '../providers/index.js';
import { saveImage, getImageBuffer, getAssetUrl } from '../services/storage.js';
import { reserveTokens, finalizeGeneration, refundGeneration, getWallet } from '../services/wallet.js';

const router = Router();
router.use(authenticate);
const operationCosts = {
  standard: Number(process.env.TOKEN_COST_STANDARD || 5),
  high_quality: Number(process.env.TOKEN_COST_HIGH_QUALITY || 10),
  edit: Number(process.env.TOKEN_COST_EDIT || 4),
  variation: Number(process.env.TOKEN_COST_VARIATION || 3)
};
const requestSchema = z.object({
  prompt: z.string().trim().min(5).max(config.maxPromptChars),
  operation: z.enum(['standard','high_quality','edit','variation']).default('standard'),
  settings: z.object({
    aspectRatio: z.enum(['1:1','3:4','4:3','9:16','16:9']).optional(),
    size: z.enum(['1024x1024','1024x1536','1536x1024']).optional(),
    style: z.string().max(80).optional(),
    quality: z.enum(['standard','high']).optional()
  }).default({}),
  sourceAssetId: z.string().uuid().optional()
});
router.get('/generations/costs', asyncHandler(async (req,res) => res.json({ costs: operationCosts })));
router.post('/generations', asyncHandler(async (req,res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400,'INVALID_GENERATION_REQUEST','Invalid generation request.',parsed.error.flatten());
  const { prompt, operation, settings, sourceAssetId } = parsed.data;
  let source = null;
  if (sourceAssetId) {
    const asset = (await query('SELECT * FROM design_assets WHERE id=$1 AND user_id=$2',[sourceAssetId,req.user.id])).rows[0];
    if (!asset) throw new AppError(404,'SOURCE_ASSET_NOT_FOUND','Reference image not found.');
    source = { ...asset, bytes: await getImageBuffer(asset.storage_key), mimeType: asset.mime_type };
  }
  if (['edit','variation'].includes(operation) && !source) throw new AppError(400,'SOURCE_REQUIRED','Edit and variation operations require sourceAssetId.');
  const provider = getImageProvider();
  const generationId = crypto.randomUUID();
  const tokens = operationCosts[operation];
  await reserveTokens({ userId:req.user.id,generationId,tokens,operation,prompt,provider:provider.name,model:provider.model,settings,sourceAssetId:source?.id || null });
  try {
    const output = await provider.generate({ prompt, referenceImage: source, settings });
    const stored = await saveImage({ ownerId:req.user.id,bytes:output.bytes,mimeType:output.mimeType,kind:'generated' });
    const asset = (await query(`INSERT INTO design_assets(user_id,generation_id,storage_key,mime_type,size_bytes,kind)
      VALUES($1,$2,$3,$4,$5,'generated') RETURNING id,storage_key,mime_type,size_bytes,created_at`,
      [req.user.id,generationId,stored.storageKey,stored.mimeType,stored.sizeBytes])).rows[0];
    await finalizeGeneration({ generationId,userId:req.user.id,assetId:asset.id,providerRequestId:output.providerRequestId });
    const wallet = await getWallet(req.user.id);
    res.status(201).json({ generation: { id:generationId,status:'succeeded',prompt,operation,tokenCost:tokens,assetId:asset.id,createdAt:asset.created_at }, asset: { id:asset.id,url:await getAssetUrl(asset.storage_key),mimeType:asset.mime_type }, wallet });
  } catch (e) {
    await refundGeneration({ generationId,userId:req.user.id,errorCode:e.code || 'GENERATION_FAILED',errorMessage:e.message }).catch(refundError => console.error('Token release failed',generationId,refundError.message));
    throw e;
  }
}));
router.get('/generations', asyncHandler(async (req,res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 30),1),100);
  const rows = await query(`SELECT g.id,g.operation,g.prompt,g.model_provider,g.model_name,g.settings,g.status,g.token_cost,g.error_code,g.error_message,g.created_at,g.completed_at,
    a.id AS asset_id,a.storage_key,a.mime_type
    FROM generations g LEFT JOIN design_assets a ON a.id=g.output_asset_id
    WHERE g.user_id=$1 ORDER BY g.created_at DESC LIMIT $2`,[req.user.id,limit]);
  res.json({ generations: await Promise.all(rows.rows.map(async r => ({ ...r, assetUrl:r.storage_key ? await getAssetUrl(r.storage_key) : null }))) });
}));
router.get('/designs', asyncHandler(async (req,res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 30),1),100);
  const rows = await query(`SELECT a.id,a.generation_id,a.mime_type,a.size_bytes,a.kind,a.created_at,g.prompt,g.operation,g.token_cost,a.storage_key
    FROM design_assets a LEFT JOIN generations g ON g.id=a.generation_id
    WHERE a.user_id=$1 ORDER BY a.created_at DESC LIMIT $2`,[req.user.id,limit]);
  res.json({ designs: await Promise.all(rows.rows.map(async r => ({ ...r, url:await getAssetUrl(r.storage_key) }))) });
}));
router.get('/assets/:id', asyncHandler(async (req,res) => {
  const asset = (await query('SELECT * FROM design_assets WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];
  if (!asset) throw new AppError(404,'ASSET_NOT_FOUND','Image not found.');
  const signed = await getAssetUrl(asset.storage_key);
  if (signed) return res.redirect(302,signed);
  const bytes = await getImageBuffer(asset.storage_key);
  res.setHeader('Content-Type',asset.mime_type);
  res.setHeader('Content-Length',bytes.length);
  res.setHeader('Cache-Control','private, no-store');
  res.send(bytes);
}));
router.delete('/designs/:id', asyncHandler(async (req,res) => {
  const r = await query('DELETE FROM design_assets WHERE id=$1 AND user_id=$2 RETURNING id',[req.params.id,req.user.id]);
  if (!r.rowCount) throw new AppError(404,'ASSET_NOT_FOUND','Design not found.');
  res.json({ deleted:true });
}));
export default router;
