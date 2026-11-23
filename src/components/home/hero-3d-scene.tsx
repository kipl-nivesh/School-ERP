'use client';

import React from 'react';
import Image from 'next/image';
import styles from './hero-3d-scene.module.css';

/**
 * Hero3dScene — High-fidelity 3D Pixar-style School Campus visual
 * 
 * Accurately matches the approved BRIGHTCAMP 3D homepage design:
 *  - Classical brick-red schoolhouse with white columns & clock tower
 *  - Cheerful boy student with backpack giving a thumbs up
 *  - Smiling girl student with books & headband
 *  - Classic yellow American school bus
 *  - Purple blooming jacaranda tree & lush green foliage
 *  - Floating clouds, birds, and cyan light ribbons
 *  - Subtle, high-performance CSS animations (entrance glow, flag flutter, floating drift)
 */
export function Hero3dScene() {
  return (
    <div className={styles.sceneWrapper} aria-hidden="true">
      {/* Ambient background glow behind 3D campus */}
      <div className={styles.ambientGlow} />

      {/* Main 3D Campus Composition */}
      <div className={styles.sceneContainer}>
        <Image
          src="/images/home/brightcamp-3d-campus@2x.png"
          alt="Brightcamp 3D School Campus with students and school bus"
          width={1092}
          height={604}
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 58vw, 880px"
          className={styles.campusImage}
        />

        {/* Subtle animated overlays */}
        {/* 1. Flag wave effect over the clock tower flagpole */}
        <div className={styles.flagGlowOverlay} />

        {/* 2. Warm pulsing light from schoolhouse entrance */}
        <div className={styles.entrancePulseGlow} />

        {/* 3. Cyan ribbon light trail shimmer */}
        <div className={styles.ribbonShimmerOverlay} />
      </div>
    </div>
  );
}
