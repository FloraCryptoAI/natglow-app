import imageCompression from 'browser-image-compression'

// Why this matters: phones take photos at 3–5 MB / 4000×3000 px. Uploading
// raw means 10s+ upload on 4G and 3-8s download per image in the feed.
// Compressing client-side to Instagram-standard sizes (1080px, JPG q=0.8)
// brings post images down to ~100-400KB with no visible quality loss.

const POST_OPTS = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1080,
  initialQuality: 0.8,
  useWebWorker: true,
  fileType: 'image/jpeg',
}

const AVATAR_OPTS = {
  maxSizeMB: 0.08,
  maxWidthOrHeight: 400,
  initialQuality: 0.85,
  useWebWorker: true,
  fileType: 'image/jpeg',
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
