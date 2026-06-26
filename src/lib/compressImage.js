import imageCompression from 'browser-image-compression'

// Why this matters: phones take photos at 3–5 MB / 4000×3000 px. Uploading
// raw means 10s+ upload on 4G and 3-8s download per image in the feed.
//
// Tuning rationale (current iteration):
// - Feed card is max-w-xl = 580px wide. With DPR=2 (retina), we need at
//   most 1160px wide. Targeting 720px is a deliberate tradeoff: the image
//   looks fine on 2x screens because phones display the feed at ~390px CSS
//   width, so 720px source = nearly 2x already. Result: 60-70% smaller
//   files vs 1080px with no visible quality loss on phones (the primary
//   viewing surface for this app).
// - WebP at q=0.78 averages ~30% smaller than JPG q=0.8 at same perceived
//   quality. 96%+ browser support; Safari has supported since 2020.

const POST_OPTS = {
  maxSizeMB: 0.25,
  maxWidthOrHeight: 720,
  initialQuality: 0.78,
  useWebWorker: true,
  fileType: 'image/webp',
}

const AVATAR_OPTS = {
  maxSizeMB: 0.03,
  maxWidthOrHeight: 200,
  initialQuality: 0.82,
  useWebWorker: true,
  fileType: 'image/webp',
}

// Wraps the lib so a bad/exotic source file never blocks the upload flow.
// If compression throws (e.g. corrupt file, no canvas support), we hand the
// original File through — slow but functional > broken with a toast error.
async function safeCompress(file, opts) {
  try {
    return await imageCompression(file, opts)
  } catch {
    return file
  }
}

export function compressPostImage(file) {
  return safeCompress(file, POST_OPTS)
}

export function compressAvatar(file) {
  return safeCompress(file, AVATAR_OPTS)
}
