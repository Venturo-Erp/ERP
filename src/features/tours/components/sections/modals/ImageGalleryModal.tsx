'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ImageGalleryState as LuxuryGalleryState, ImageInfo } from '../utils/itineraryLuxuryUtils'
import { ImageGalleryState as ArtGalleryState } from '../hooks/useImageGallery'
import { ART } from '../utils/art-theme'

type ImageGalleryModalProps = {
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onSelectIndex: (index: number) => void
} & (
  | { variant?: 'luxury'; imageGallery: LuxuryGalleryState | null }
  | { variant: 'art'; imageGallery: ArtGalleryState | null }
)

function isArtGallery(
  variant: 'luxury' | 'art' | undefined,
  gallery: LuxuryGalleryState | ArtGalleryState
): gallery is ArtGalleryState {
  return variant === 'art'
}

export function ImageGalleryModal(props: ImageGalleryModalProps) {
  const { imageGallery, onClose, onPrev, onNext, onSelectIndex } = props
  const variant = props.variant ?? 'luxury'

  if (!imageGallery) return null

  const isArt = variant === 'art'
  const images = imageGallery.images
  const currentIndex = imageGallery.currentIndex

  // Resolve current image URL and metadata
  const currentUrl = isArt
    ? (images as string[])[currentIndex]
    : (images as ImageInfo[])[currentIndex].url
  const currentTitle = isArt
    ? (imageGallery as ArtGalleryState).title
    : (images as ImageInfo[])[currentIndex].title
  const currentDescription = !isArt ? (images as ImageInfo[])[currentIndex].description : undefined

  return (
    <Dialog open={true} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        overlayClassName="backdrop-blur-none bg-black/85"
        className={`max-w-5xl w-full border-none p-0 gap-0 ${!isArt ? 'bg-transparent' : ''}`}
        style={isArt ? { backgroundColor: ART.ink } : undefined}
        aria-describedby={undefined}
      >
        <div className="relative flex items-center justify-center min-h-[60vh]">
          {/* Art variant: counter */}
          {isArt && (
            <div className="absolute top-6 left-6 z-10">
              <span className="text-sm tracking-wider font-mono text-white/60">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          )}

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={onPrev}
                className={`absolute z-10 flex items-center justify-center transition-colors ${
                  isArt
                    ? 'left-6 w-12 h-12 border border-white hover:bg-card hover:text-black'
                    : 'left-4 w-12 h-12 rounded-full bg-card/10 hover:bg-card/20'
                }`}
                aria-label="Previous image"
              >
                <ChevronLeft className={isArt ? 'w-6 h-6 text-white' : 'w-8 h-8 text-white'} />
              </button>
              <button
                onClick={onNext}
                className={`absolute z-10 flex items-center justify-center transition-colors ${
                  isArt
                    ? 'right-6 w-12 h-12 border border-white hover:bg-card hover:text-black'
                    : 'right-4 w-12 h-12 rounded-full bg-card/10 hover:bg-card/20'
                }`}
                aria-label="Next image"
              >
                <ChevronRight className={isArt ? 'w-6 h-6 text-white' : 'w-8 h-8 text-white'} />
              </button>
            </>
          )}

          {/* Main image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: isArt ? 0.95 : 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: isArt ? 0.95 : 0.9 }}
              transition={{ duration: 0.2 }}
              className={isArt ? 'max-w-5xl max-h-[85vh] mx-6' : 'max-w-5xl max-h-[80vh] relative'}
            >
              <img
                src={currentUrl}
                alt={currentTitle || ''}
                className={
                  isArt
                    ? 'max-w-full max-h-[85vh] object-contain'
                    : 'max-w-full max-h-[80vh] object-contain rounded-lg'
                }
              />
              {/* Luxury variant: title/description overlay */}
              {!isArt && (currentTitle || currentDescription) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                  {currentTitle && (
                    <h3
                      className="text-white text-xl font-bold mb-2"
                      style={{ fontFamily: "'Noto Serif TC', serif" }}
                    >
                      {currentTitle}
                    </h3>
                  )}
                  {currentDescription && (
                    <p className="text-white/80 text-sm">{currentDescription}</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {isArt
                ? images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectIndex(idx)}
                      className={`w-2 h-2 transition-all ${
                        idx === currentIndex ? 'bg-card w-8' : 'bg-card/30 hover:bg-card/50'
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    />
                  ))
                : (images as ImageInfo[]).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectIndex(idx)}
                      className={`w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                        idx === currentIndex
                          ? 'border-white opacity-100'
                          : 'border-transparent opacity-50 hover:opacity-75'
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
