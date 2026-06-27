// One-shot conversion of static quiz images (JPG/PNG) to WebP.
// Run: npm run optimize-quiz-images
//
// Why: WebP at quality 80 is ~30% smaller than JPG and ~50-70% smaller than
// PNG at perceptually identical quality. Browser support is 96%+ (Safari
// since v14, 2020). Originals are removed so the bundle ships only WebP.
//
// Idempotent: if a file is already .webp the regex skips it. Safe to re-run
// when you add new .jpg/.png images.

import sharp from 'sharp'
import { readdir, unlink, stat } from 'node:fs/promises'
import { join } from 'node:path'

const dir = 'public/images/quiz'

const files = await readdir(dir)
let totalSavedKB = 0
let converted = 0

for (const f of files) {
  if (!/\.(jpe?g|png)$/i.test(f)) continue
  const input  = join(dir, f)
  const output = input.replace(/\.(jpe?g|png)$/i, '.webp')

  const beforeSize = (await stat(input)).size
  await sharp(input).webp({ quality: 80, effort: 6 }).toFile(output)
  await unlink(input)
  const afterSize = (await stat(output)).size

  const saved = (beforeSize - afterSize) / 1024
  totalSavedKB += saved
  converted++
  console.log(`${f.padEnd(28)} → ${f.replace(/\.(jpe?g|png)$/i, '.webp').padEnd(28)} -${Math.round(saved)}KB`)
}

console.log(`\nConverted ${converted} files · saved ${Math.round(totalSavedKB)}KB total`)
