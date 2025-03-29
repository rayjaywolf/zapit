"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React, { HTMLAttributes, useCallback, useMemo, useState, useEffect } from "react";

interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  perspective?: number;
  beamsPerSide?: number;
  beamSize?: number;
  beamDelayMax?: number;
  beamDelayMin?: number;
  beamDuration?: number;
  gridColor?: string;
}

// Generate deterministic pseudo-random number based on input
const pseudoRandom = (seed: number) => {
  return ((seed * 9301 + 49297) % 233280) / 233280;
};

const Beam = ({
  width,
  x,
  delay,
  duration,
  index,
  side,
}: {
  width: string | number;
  x: string | number;
  delay: number;
  duration: number;
  index: number;
  side: string;
}) => {
  // Use state with default values to ensure consistent hydration
  const [isClient, setIsClient] = useState(false);
  const [styles, setStyles] = useState({
    "--x": `${x}`,
    "--width": `${width}`,
    "--aspect-ratio": "1",
    "--background": "linear-gradient(hsl(0 80% 60%), transparent)"
  } as React.CSSProperties);

  // Calculate deterministic values for hue and aspect ratio
  useEffect(() => {
    setIsClient(true);

    // Create unique seed for this beam based on index and side
    const sideFactor = side === 'top' ? 0 : side === 'right' ? 1000 : side === 'bottom' ? 2000 : 3000;
    const seed = index + sideFactor;

    // Deterministic hue (0-360) and aspect ratio (1-10)
    const hue = Math.floor(pseudoRandom(seed) * 360);
    const ar = Math.floor(pseudoRandom(seed + 1000) * 10) + 1;

    setStyles({
      "--x": `${x}`,
      "--width": `${width}`,
      "--aspect-ratio": `${ar}`,
      "--background": `linear-gradient(hsl(${hue} 80% 60%), transparent)`
    } as React.CSSProperties);
  }, [x, width, index, side]);

  return (
    <motion.div
      style={styles}
      className={`absolute left-[var(--x)] top-0 [aspect-ratio:1/var(--aspect-ratio)] [background:var(--background)] [width:var(--width)]`}
      initial={{ y: "100cqmax", x: "-50%" }}
      animate={{ y: "-100%", x: "-50%" }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

export const WarpBackground: React.FC<WarpBackgroundProps> = ({
  children,
  perspective = 100,
  className,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
  gridColor = "hsl(var(--border))",
  ...props
}) => {
  // State to track client-side rendering
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const generateBeams = useCallback((seedOffset = 0) => {
    if (!isClient) return [];

    const beams = [];
    const cellsPerSide = Math.floor(100 / beamSize);
    const step = cellsPerSide / beamsPerSide;

    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step);
      // Use deterministic pseudo-random function instead of Math.random()
      const delay = pseudoRandom(i + seedOffset) * (beamDelayMax - beamDelayMin) + beamDelayMin;
      beams.push({ x, delay, index: i });
    }
    return beams;
  }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin, isClient]);

  // Generate beams only when client-side rendering is active
  const topBeams = useMemo(() => generateBeams(0), [generateBeams, isClient]);
  const rightBeams = useMemo(() => generateBeams(1000), [generateBeams, isClient]);
  const bottomBeams = useMemo(() => generateBeams(2000), [generateBeams, isClient]);
  const leftBeams = useMemo(() => generateBeams(3000), [generateBeams, isClient]);

  return (
    <div className={cn("relative rounded border p-20", className)} {...props}>
      <div
        style={
          {
            "--perspective": `${perspective}px`,
            "--grid-color": gridColor,
            "--beam-size": `${beamSize}%`,
          } as React.CSSProperties
        }
        className={
          "pointer-events-none absolute left-0 top-0 size-full overflow-hidden [clip-path:inset(0)] [container-type:size] [perspective:var(--perspective)] [transform-style:preserve-3d]"
        }
      >
        {isClient && (
          <>
            {/* top side */}
            <div className="absolute [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform:rotateX(-90deg)] [width:100cqi]">
              {topBeams.map((beam, index) => (
                <Beam
                  key={`top-${index}`}
                  width={`${beamSize}%`}
                  x={`${beam.x * beamSize}%`}
                  delay={beam.delay}
                  duration={beamDuration}
                  index={beam.index}
                  side="top"
                />
              ))}
            </div>
            {/* bottom side */}
            <div className="absolute top-full [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform:rotateX(-90deg)] [width:100cqi]">
              {bottomBeams.map((beam, index) => (
                <Beam
                  key={`bottom-${index}`}
                  width={`${beamSize}%`}
                  x={`${beam.x * beamSize}%`}
                  delay={beam.delay}
                  duration={beamDuration}
                  index={beam.index}
                  side="bottom"
                />
              ))}
            </div>
            {/* left side */}
            <div className="absolute left-0 top-0 [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:0%_0%] [transform:rotate(90deg)_rotateX(-90deg)] [width:100cqh]">
              {leftBeams.map((beam, index) => (
                <Beam
                  key={`left-${index}`}
                  width={`${beamSize}%`}
                  x={`${beam.x * beamSize}%`}
                  delay={beam.delay}
                  duration={beamDuration}
                  index={beam.index}
                  side="left"
                />
              ))}
            </div>
            {/* right side */}
            <div className="absolute right-0 top-0 [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [width:100cqh] [transform-origin:100%_0%] [transform:rotate(-90deg)_rotateX(-90deg)]">
              {rightBeams.map((beam, index) => (
                <Beam
                  key={`right-${index}`}
                  width={`${beamSize}%`}
                  x={`${beam.x * beamSize}%`}
                  delay={beam.delay}
                  duration={beamDuration}
                  index={beam.index}
                  side="right"
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
};
