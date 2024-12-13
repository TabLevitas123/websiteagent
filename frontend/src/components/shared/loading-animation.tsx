import React from 'react';
import { motion } from 'framer-motion';

const LoadingAnimation = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
      <div className="relative w-64 h-64">
        {/* Main morphing blob */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mix-blend-screen filter blur-xl"
          style={{
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            scale: [1, 1.2, 1.5, 1.2, 1],
            rotate: [0, 90, 180, 270, 360],
            borderRadius: ['50%', '30%', '50%', '30%', '50%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Secondary pulsing blobs */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-screen filter blur-lg"
            style={{
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: [1, 1.5, 1],
              x: [0, 30 * Math.cos((i * 2 * Math.PI) / 3), 0],
              y: [0, 30 * Math.sin((i * 2 * Math.PI) / 3), 0],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-4 h-4 bg-white rounded-full mix-blend-screen"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 45}deg) translateY(-40px)`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.8, 0.3],
              rotate: [0, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}

        {/* Energy field */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-full h-full rounded-full"
          style={{
            transform: 'translate(-50%, -50%)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 360],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );
};

export default LoadingAnimation;