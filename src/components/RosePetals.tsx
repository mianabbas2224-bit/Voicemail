import React, { useEffect, useRef } from 'react';

interface Petal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  angle: number;
  spinSpeed: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
  color: string;
}

export const RosePetals: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let petals: Petal[] = [];
    const maxPetals = 22; // Keep it subtle and graceful

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const colors = [
      'rgba(229, 9, 20, 0.45)',    // glowing netflix red
      'rgba(185, 28, 28, 0.4)',     // rich ruby red
      'rgba(248, 113, 113, 0.35)',  // soft blush red
      'rgba(239, 68, 68, 0.3)',     // light rose coral
    ];

    const createPetal = (isInitial = false): Petal => {
      return {
        x: Math.random() * canvas.width,
        y: isInitial ? Math.random() * canvas.height : -20,
        size: 8 + Math.random() * 12,
        speedY: 0.5 + Math.random() * 1.2,
        speedX: -0.5 + Math.random() * 1.0,
        angle: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.4 + Math.random() * 0.4,
        wobble: Math.random() * 100,
        wobbleSpeed: 0.005 + Math.random() * 0.015,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    };

    // Populate initial petals
    for (let i = 0; i < maxPetals; i++) {
      petals.push(createPetal(true));
    }

    // Drawing a realistic single organic petal path
    const drawPetalPath = (c: CanvasRenderingContext2D, size: number) => {
      c.beginPath();
      // Organic teardrop/heart petal shape
      c.moveTo(0, -size / 2);
      c.bezierCurveTo(size / 2, -size, size, -size / 3, size / 4, size / 2);
      c.bezierCurveTo(0, size, -size, size, -size / 4, size / 2);
      c.bezierCurveTo(-size, -size / 3, -size / 2, -size, 0, -size / 2);
      c.closePath();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      petals.forEach((petal, idx) => {
        // Update positions
        petal.y += petal.speedY;
        // Sway left and right based on sine wave wobble
        petal.wobble += petal.wobbleSpeed;
        petal.x += petal.speedX + Math.sin(petal.wobble) * 0.3;
        petal.angle += petal.spinSpeed;

        // If off screen, recycle petal to top
        if (petal.y > canvas.height + 20 || petal.x < -20 || petal.x > canvas.width + 20) {
          petals[idx] = createPetal(false);
          return;
        }

        // Draw petal
        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.angle);
        ctx.scale(1, 0.7); // flatten it slightly for depth rotation effect

        ctx.fillStyle = petal.color;
        ctx.globalAlpha = petal.opacity;

        drawPetalPath(ctx, petal.size);
        ctx.fill();

        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
