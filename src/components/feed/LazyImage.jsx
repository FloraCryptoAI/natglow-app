import React, { useState } from 'react'

// Reserves the final aspect ratio with a stone-100 box BEFORE the image
// loads. Prevents the layout shift that happens when a raw <img> appears
// and pushes the rest of the feed down. Once the image decodes, it fades
// in over the placeholder (opacity 0 → 1).
//
// Uses native loading="lazy" so off-screen images don't block initial paint.
export default function LazyImage({
  src,
  alt = '',
  aspectRatio = '4/5',  // Instagram-portrait default — works for hair photos
  className = '',
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className={`relative bg-stone-100 overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  )
}
