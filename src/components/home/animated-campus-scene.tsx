'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/home.module.css';

interface PetalSpec {
  readonly id: number;
  readonly left: string;
  readonly top: string;
  readonly size: number;
  readonly delay: string;
  readonly duration: string;
  readonly fill: string;
  readonly rotate: number;
}

interface LeafSpec {
  readonly id: number;
  readonly left: string;
  readonly top: string;
  readonly size: number;
  readonly delay: string;
  readonly duration: string;
  readonly fill: string;
}

const FLOATING_PETALS: readonly PetalSpec[] = [
  { id: 1, left: '14%', top: '16%', size: 14, delay: '0s', duration: '15s', fill: '#f472b6', rotate: 18 },
  { id: 2, left: '28%', top: '12%', size: 13, delay: '-4.2s', duration: '17s', fill: '#fb7185', rotate: -24 },
  { id: 3, left: '42%', top: '22%', size: 15, delay: '-8.5s', duration: '14s', fill: '#c084fc', rotate: 32 },
  { id: 4, left: '56%', top: '14%', size: 12, delay: '-2.6s', duration: '16s', fill: '#facc15', rotate: -14 },
  { id: 5, left: '68%', top: '26%', size: 14, delay: '-10.1s', duration: '18s', fill: '#f472b6', rotate: 45 },
  { id: 6, left: '82%', top: '18%', size: 13, delay: '-6.4s', duration: '15.5s', fill: '#fb7185', rotate: -38 },
  { id: 7, left: '20%', top: '42%', size: 12, delay: '-12.3s', duration: '16.5s', fill: '#c084fc', rotate: 12 },
  { id: 8, left: '48%', top: '38%', size: 14, delay: '-5.8s', duration: '14.5s', fill: '#f472b6', rotate: -20 },
  { id: 9, left: '75%', top: '40%', size: 13, delay: '-9.2s', duration: '17.5s', fill: '#facc15', rotate: 28 },
  { id: 10, left: '34%', top: '54%', size: 12, delay: '-3.1s', duration: '15s', fill: '#fb7185', rotate: -10 },
];

const FLUTTER_LEAVES: readonly LeafSpec[] = [
  { id: 1, left: '16%', top: '11%', size: 16, delay: '0s', duration: '5.6s', fill: '#84cc16' },
  { id: 2, left: '25%', top: '8%', size: 14, delay: '-1.4s', duration: '4.9s', fill: '#4ade80' },
  { id: 3, left: '33%', top: '14%', size: 15, delay: '-2.9s', duration: '6.1s', fill: '#a3e635' },
  { id: 4, left: '41%', top: '7%', size: 13, delay: '-0.8s', duration: '5.3s', fill: '#65a30d' },
  { id: 5, left: '47%', top: '11%', size: 14, delay: '-3.5s', duration: '5.8s', fill: '#84cc16' },
  { id: 6, left: '91%', top: '41%', size: 14, delay: '-2.1s', duration: '6.3s', fill: '#4ade80' },
  { id: 7, left: '95%', top: '48%', size: 13, delay: '-4.0s', duration: '5.4s', fill: '#84cc16' },
];

interface IstAngles {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly label: string;
}

const IST_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function getIstAngles(nowMs: number): IstAngles {
  const parts = IST_FORMATTER.formatToParts(new Date(nowMs));
  const hour24 = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const second = Number(parts.find((p) => p.type === 'second')?.value ?? '0');
  const millis = nowMs % 1000;

  const smoothSecond = second + millis / 1000;
  const smoothMinute = minute + smoothSecond / 60;
  const smoothHour = (hour24 % 12) + smoothMinute / 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    hour: smoothHour * 30,
    minute: smoothMinute * 6,
    second: smoothSecond * 6,
    label: `${pad(hour24)}:${pad(minute)}:${pad(second)} IST`,
  };
}

export function AnimatedCampusScene() {
  const [isPaused, setIsPaused] = useState(false);
  const [istAngles, setIstAngles] = useState<IstAngles | null>(null);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      const initId = window.setTimeout(() => {
        setIstAngles(getIstAngles(Date.now()));
      }, 0);
      const id = window.setInterval(() => {
        setIstAngles(getIstAngles(Date.now()));
      }, 15000);
      return () => {
        window.clearTimeout(initId);
        window.clearInterval(id);
      };
    }

    let rafId = 0;
    const tick = () => {
      setIstAngles(getIstAngles(Date.now()));
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPaused]);

  return (
    <div
      className={styles.sceneRoot}
      data-paused={isPaused ? 'true' : 'false'}
      aria-hidden="true"
    >
      {/* Aspect-locked 1376:768 stage matching object-fit:cover + center 45% */}
      <div className={styles.sceneStage}>
        {/* Base 16:9 anime campus illustration */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/home/campus-scene.webp"
          alt=""
          className={styles.campusImage}
          fetchPriority="high"
          decoding="async"
        />

        {/* Artwork-integrated swaying tree branches & foliage */}
        <div className={`${styles.maskedArtworkLayer} ${styles.treeCanopyPrimary}`} />
        <div className={`${styles.maskedArtworkLayer} ${styles.treeCanopyOuter}`} />
        <div className={`${styles.maskedArtworkLayer} ${styles.treeCanopyRight}`} />

        {/* Artwork-integrated swaying foreground flowers */}
        <div className={`${styles.maskedArtworkLayer} ${styles.flowersLeftHydrangea}`} />
        <div className={`${styles.maskedArtworkLayer} ${styles.flowersCenterMeadow}`} />
        <div className={`${styles.maskedArtworkLayer} ${styles.flowersRightCluster}`} />

        {/* Individual fluttering leaves near branch tips */}
        <div className={styles.leavesLayer}>
          {FLUTTER_LEAVES.map((leaf) => (
            <svg
              key={leaf.id}
              viewBox="0 0 24 24"
              className={styles.flutterLeaf}
              style={{
                left: leaf.left,
                top: leaf.top,
                width: `${leaf.size}px`,
                height: `${leaf.size}px`,
                animationDelay: leaf.delay,
                animationDuration: leaf.duration,
              }}
            >
              <path
                d="M12 2C7.5 6.2 5.2 11.2 6.8 16.5C8 20.4 10.7 22 12 22C13.3 22 16 20.4 17.2 16.5C18.8 11.2 16.5 6.2 12 2Z"
                fill={leaf.fill}
                fillOpacity="0.92"
              />
              <path d="M12 4.5V20.5" stroke="#ecfccb" strokeWidth="1.2" strokeOpacity="0.7" />
            </svg>
          ))}
        </div>

        {/* Natural illustrated white clouds drifting slowly in the upper sky */}
        <div className={styles.cloudsLayer}>
          <svg
            viewBox="0 0 260 90"
            className={`${styles.illustratedCloud} ${styles.cloudOne}`}
            fill="none"
          >
            <path
              d="M34 70H224C239 70 250 60 250 47C250 35 240 26 227 25C223 11 208 2 191 4C181 5 173 10 167 17C159 8 146 3 132 5C116 7 104 18 101 32C96 29 90 27 83 28C70 29 60 39 59 51C55 49 50 48 44 49C31 50 22 58 22 66C22 69 27 70 34 70Z"
              fill="#ffffff"
              fillOpacity="0.88"
            />
            <path
              d="M38 70H220C231 70 241 64 245 56C231 60 212 61 190 61C140 61 84 62 38 70Z"
              fill="#dbeafe"
              fillOpacity="0.65"
            />
          </svg>

          <svg
            viewBox="0 0 220 76"
            className={`${styles.illustratedCloud} ${styles.cloudTwo}`}
            fill="none"
          >
            <path
              d="M28 60H190C203 60 212 51 212 40C212 30 203 22 191 21C186 9 172 2 156 5C148 6 141 11 136 17C128 8 115 4 102 7C89 10 80 20 77 32C72 30 66 29 60 30C49 32 41 40 40 50C32 50 22 54 22 58C22 60 24 60 28 60Z"
              fill="#ffffff"
              fillOpacity="0.82"
            />
            <path
              d="M34 60H186C196 60 204 55 207 49C192 52 170 53 145 53C104 53 66 55 34 60Z"
              fill="#dbeafe"
              fillOpacity="0.58"
            />
          </svg>

          <svg
            viewBox="0 0 180 64"
            className={`${styles.illustratedCloud} ${styles.cloudThree}`}
            fill="none"
          >
            <path
              d="M24 52H154C165 52 173 45 173 36C173 27 165 20 154 20C149 9 136 3 122 6C115 8 109 12 105 18C97 11 86 8 75 12C66 15 60 23 58 32C50 31 41 36 39 44C30 44 19 47 19 50C19 51 21 52 24 52Z"
              fill="#ffffff"
              fillOpacity="0.76"
            />
          </svg>
        </div>

        {/* Clearly visible flying birds against the bright blue sky */}
        <div className={styles.birdsLayer}>
          <div className={`${styles.birdFlight} ${styles.birdOne}`}>
            <svg viewBox="0 0 42 20" className={styles.birdSvg} fill="none">
              <path
                d="M2 12C8 4 15 4 21 11C27 4 34 4 40 12"
                stroke="#ffffff"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={`${styles.birdFlight} ${styles.birdTwo}`}>
            <svg viewBox="0 0 36 18" className={styles.birdSvg} fill="none">
              <path
                d="M2 10C7 3.5 13 3.5 18 9.5C23 3.5 29 3.5 34 10"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={`${styles.birdFlight} ${styles.birdThree}`}>
            <svg viewBox="0 0 30 16" className={styles.birdSvg} fill="none">
              <path
                d="M2 9C6 3.5 11 3.5 15 8.5C19 3.5 24 3.5 28 9"
                stroke="#ffffff"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Lake water shimmer & ripples clipped strictly to the lake region */}
        <div className={styles.lakeMask}>
          <div className={styles.waterShimmerBand} />
          <div className={styles.waterRippleLine} style={{ top: '26%', left: '12%', width: '36%' }} />
          <div
            className={styles.waterRippleLine}
            style={{ top: '48%', left: '24%', width: '44%', animationDelay: '-2.3s' }}
          />
          <div
            className={styles.waterRippleLine}
            style={{ top: '68%', left: '16%', width: '34%', animationDelay: '-4.6s' }}
          />
          <div className={styles.waterSparkle} style={{ top: '34%', left: '28%', animationDelay: '0s' }} />
          <div className={styles.waterSparkle} style={{ top: '54%', left: '46%', animationDelay: '-1.6s' }} />
          <div className={styles.waterSparkle} style={{ top: '42%', left: '62%', animationDelay: '-3.1s' }} />
        </div>

        {/* Real Working School Clock (Asia/Kolkata IST) */}
        <div
          className={styles.schoolClockOverlay}
          data-testid="school-clock"
          data-ist-time={istAngles?.label ?? ''}
        >
          <svg viewBox="0 0 100 100" className={styles.schoolClockSvg}>
            <circle cx="50" cy="50" r="35" fill="#ffffff" fillOpacity="0.92" />
            {istAngles ? (
              <>
                <g transform={`rotate(${istAngles.hour} 50 50)`} data-hand="hour">
                  <line
                    x1="50"
                    y1="54"
                    x2="50"
                    y2="25"
                    stroke="#1e293b"
                    strokeWidth="5.4"
                    strokeLinecap="round"
                  />
                </g>
                <g transform={`rotate(${istAngles.minute} 50 50)`} data-hand="minute">
                  <line
                    x1="50"
                    y1="55"
                    x2="50"
                    y2="16"
                    stroke="#1e293b"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                  />
                </g>
                <g transform={`rotate(${istAngles.second} 50 50)`} data-hand="second">
                  <line
                    x1="50"
                    y1="58"
                    x2="50"
                    y2="14"
                    stroke="#dc2626"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                </g>
                <circle cx="50" cy="50" r="4.2" fill="#1e293b" />
                <circle cx="50" cy="50" r="1.8" fill="#dc2626" />
              </>
            ) : null}
          </svg>
        </div>

        {/* Visible floating petals in pink, rose, lavender, and warm yellow */}
        <div className={styles.petalsLayer}>
          {FLOATING_PETALS.map((petal) => (
            <svg
              key={petal.id}
              viewBox="0 0 24 24"
              className={styles.floatingPetal}
              style={{
                left: petal.left,
                top: petal.top,
                width: `${petal.size}px`,
                height: `${petal.size}px`,
                animationDelay: petal.delay,
                animationDuration: petal.duration,
              }}
            >
              <path
                d="M12 2C16.2 4.8 19 9.2 18.2 14C17.4 18.6 13.8 21.5 10.6 21.2C7.4 20.8 5.2 17.6 5.8 13.2C6.4 8.8 9 4.5 12 2Z"
                fill={petal.fill}
                fillOpacity="0.9"
                transform={`rotate(${petal.rotate} 12 12)`}
              />
            </svg>
          ))}
        </div>
      </div>

      {/* Subtle localized readability scrim strictly behind left hero text — zero full-screen glare */}
      <div className={styles.heroReadabilityScrim} />
    </div>
  );
}
