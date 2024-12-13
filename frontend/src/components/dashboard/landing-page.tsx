import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, ChevronRight, Cpu, Shield, Zap } from 'lucide-react';
import LoadingAnimation from './LoadingAnimation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const LandingPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  const features = [
    {
      icon: <Brain className="w-8 h-8 text-blue-500 transition-all duration-300 group-hover:scale-110" />,
      title: "Advanced AI Agents",
      description: "Create sophisticated AI agents with customizable parameters and behaviors",
      ariaLabel: "Learn about Advanced AI Agents feature"
    },
    {
      icon: <Shield className="w-8 h-8 text-blue-500" />,
      title: "Secure Implementation",
      description: "Enterprise-grade security with multi-layer authentication and encryption"
    },
    {
      icon: <Cpu className="w-8 h-8 text-blue-500" />,
      title: "Smart Processing",
      description: "Efficient token creation with optimized gas consumption"
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-500" />,
      title: "Instant Deployment",
      description: "Deploy your AI agents instantly on the blockchain"
    }
  ];

  return (
    <>
      <LoadingAnimation isLoading={isLoading} error={error} />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white"
        role="main"
        aria-label="AI Agent Token Creation Platform"
      >
        {/* Hero Section */}
        <motion.div 
          className="container mx-auto px-4 py-16"
          variants={itemVariants}
        >
          <div className="text-center">
            <motion.h1 
              className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600"
              variants={itemVariants}
            >
              Create Your AI Agent
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-300 mb-8"
              variants={itemVariants}
            >
              Launch your own AI-powered token with just a few clicks
            </motion.p>
            <motion.div variants={itemVariants}>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center"
                onClick={() => {/* Handle create token */}}
              >
                Create Token <ChevronRight className="ml-2" />
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="container mx-auto px-4 py-16"
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
              >
                <Card 
                  className="bg-gray-800 border-gray-700 transition-all duration-300 hover:bg-gray-750 hover:border-blue-500 group"
                  role="article"
                  aria-labelledby={`feature-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="mb-4">
                      {feature.icon}
                    </div>
                    <h3 
                      id={`feature-${index}`}
                      className="text-xl font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"
                    >
                      {feature.title}
                    </h3>
                    <p className="text-gray-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="container mx-auto px-4 py-16"
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 text-center">
            <motion.div variants={itemVariants} className="p-6">
              <div className="text-4xl font-bold text-blue-500 mb-2">100+</div>
              <div className="text-gray-400">Active AI Agents</div>
            </motion.div>
            <motion.div variants={itemVariants} className="p-6">
              <div className="text-4xl font-bold text-blue-500 mb-2">$1M+</div>
              <div className="text-gray-400">Total Value Locked</div>
            </motion.div>
            <motion.div variants={itemVariants} className="p-6">
              <div className="text-4xl font-bold text-blue-500 mb-2">10k+</div>
              <div className="text-gray-400">Community Members</div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default LandingPage;