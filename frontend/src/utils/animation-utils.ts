// src/utils/animation.ts
import { theme } from '@/styles/theme';

export const ANIMATION_CONFIGS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: 0.3,
      ease: theme.animation.easing.easeOut
    }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: {
      duration: 0.4,
      ease: theme.animation.easing.easeInOut
    }
  },
  scale: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: {
      duration: 0.3,
      ease: theme.animation.easing.easeOut
    }
  },
  rotate: {
    initial: { rotate: 0 },
    animate: { rotate: 360 },
    transition: {
      duration: 2,
      ease: "linear",
      repeat: Infinity
    }
  }
};

export const staggerChildren = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const pulseAnimation = {
  initial: { scale: 1, opacity: 0.5 },
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const orbitAnimation = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export const particleAnimation = (index: number) => ({
  initial: { opacity: 0.2, y: 0 },
  animate: {
    opacity: [0.2, 1, 0.2],
    y: [0, -10, 0],
    x: [0, index % 2 === 0 ? 5 : -5, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
      delay: index * 0.2
    }
  }
});