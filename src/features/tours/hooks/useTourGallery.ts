'use client'

import { useState, useEffect, useRef } from 'react'

interface GalleryOptions {
  viewMode: 'desktop' | 'mobile'
}

function useTourGallery({ viewMode }: GalleryOptions) {
  const [showGallery, setShowGallery] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const galleryRef = useRef<HTMLElement>(null)

  // 移除自動開啟相簿功能，改為簡單展示卡片（與電腦版一致）
  // IntersectionObserver 已移除，不再自動觸發全屏黑色相簿

  const closeGallery = () => {
    setShowGallery(false)
    document.body.style.overflow = ''
  }

  return {
    showGallery,
    setShowGallery,
    currentImageIndex,
    setCurrentImageIndex,
    galleryRef,
    closeGallery,
  }
}
