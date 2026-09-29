'use client';

import { useEffect, useRef } from 'react';
import type { CategoryVideo } from '@/lib/catalog/category-videos';

type CategorySectionVideoProps = {
  categoryName: string;
  video: CategoryVideo;
};

export function CategorySectionVideo({ categoryName, video }: CategorySectionVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let sourceAttached = false;
    let shouldPlay = false;

    const attachSource = () => {
      if (sourceAttached || reducedMotion.matches) return;
      sourceAttached = true;
      element.src = video.src;
      element.load();
    };

    const syncPlayback = () => {
      if (reducedMotion.matches || document.visibilityState !== 'visible' || !shouldPlay) {
        element.pause();
        return;
      }

      attachSource();
      element.muted = true;
      void element.play().catch(() => {
        // The poster remains visible if a browser rejects autoplay.
      });
    };

    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) attachSource();
      },
      { rootMargin: '240px 0px', threshold: 0 },
    );
    const playbackObserver = new IntersectionObserver(
      ([entry]) => {
        shouldPlay = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.42);
        syncPlayback();
      },
      { threshold: [0, 0.42, 0.75] },
    );

    const handleVisibility = () => syncPlayback();
    const handleMotionPreference = () => syncPlayback();

    loadObserver.observe(element);
    playbackObserver.observe(element);
    document.addEventListener('visibilitychange', handleVisibility);
    reducedMotion.addEventListener('change', handleMotionPreference);

    return () => {
      element.pause();
      loadObserver.disconnect();
      playbackObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      reducedMotion.removeEventListener('change', handleMotionPreference);
    };
  }, [video.src]);

  return (
    <figure className="category-section-video" data-category-video={video.slug}>
      <div className="category-section-video-frame">
        <video
          ref={videoRef}
          poster={video.poster}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noplaybackrate"
          aria-label={`${video.label}. Трёхмерный обзор оборудования раздела ${categoryName}.`}
        >
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
        <span className="category-section-video-kicker">3D-обзор</span>
        <figcaption className="category-section-video-caption">
          <strong>{video.label}</strong>
          <span>{categoryName}</span>
        </figcaption>
      </div>
    </figure>
  );
}
