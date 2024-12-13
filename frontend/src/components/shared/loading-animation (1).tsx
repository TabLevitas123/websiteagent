import React from 'react';
import { motion } from 'framer-motion';

const LoadingAnimation = () => {
  // Create array of cube positions for the outer ring
  const cubes = Array.from({ length: 12 }, (_, i) => ({
    rotateY: (i * 30) + 'deg',
    translateZ: '120px'
  }));

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <div className="relative w-96 h-96" style={{ perspective: '1000px' }}>
        {/* Main rotating container */}
        <motion.div
          className="absolute w-full h-full"
          animate={{
            rotateX: [0, 360],
            rotateY: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Central core */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-32 h-32 -ml-16 -mt-16 bg-blue-500/30"
            style={{
              transformStyle: 'preserve-3d',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)',
            }}
            animate={{
              rotateX: [0, 360],
              rotateY: [360, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Outer rotating cubes */}
          {cubes.map((cube, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-8 h-8 -ml-4 -mt-4"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateY(${cube.rotateY}) translateZ(${cube.translateZ})`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                rotateX: [0, 360],
                rotateZ: [0, 360],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            >
              <div className="w-full h-full bg-purple-500/40 backdrop-blur-sm shadow-lg transform-gpu" />
            </motion.div>
          ))}

          {/* Inner rotating ring */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-48 h-48 -ml-24 -mt-24 rounded-full border-4 border-cyan-500/50"
            style={{
              transformStyle: 'preserve-3d',
            }}
            animate={{
              rotateX: [45, 405],
              rotateY: [45, 405],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Pulsing spheres */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-4 h-4 -ml-2 -mt-2 bg-white rounded-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateY(${i * 60}deg) translateZ(80px)`,
              }}
              animate={{
                scale: [1, 2, 1],
                opacity: [0.8, 0.3, 0.8],
                boxShadow: [
                  '0 0 20px rgba(255,255,255,0.8)',
                  '0 0 40px rgba(255,255,255,0.4)',
                  '0 0 20px rgba(255,255,255,0.8)',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
            />
          ))}

          {/* Energy beams */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-96 h-1 -ml-48 -mt-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateY(${i * 120}deg) rotateX(90deg)`,
              }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingAnimation;