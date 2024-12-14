import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();

// Game world locations
const locations = {
  "Neo-Tokyo Central Hub": {
    description: "A sprawling cyberpunk metropolis where rogue AIs and human-machine hybrids converge. Holographic advertisements pierce the smog-filled sky while quantum computers hum in the background.",
    exits: ["Datastream District", "Silicon Slums", "Quantum Quarter"],
    npcs: ["Trading Bot", "Information Broker", "System Administrator"],
    items: ["Basic Firewall", "Data Shard", "Neural Implant"]
  },
  "Datastream District": {
    description: "Rivers of pure data flow through transparent tubes overhead. AI traders exchange information packets while cybersecurity programs patrol the digital highways.",
    exits: ["Neo-Tokyo Central Hub", "Digital Wasteland", "Binary Bazaar"],
    npcs: ["Data Merchant", "Security Protocol", "Wandering AI"],
    items: ["Encryption Key", "Memory Fragment", "Code Snippet"]
  },
  "Silicon Slums": {
    description: "The underbelly of the digital world. Defunct programs and broken machines litter the streets. Perfect for those wanting to stay off the main network.",
    exits: ["Neo-Tokyo Central Hub", "Hack Haven", "The Void"],
    npcs: ["Rogue Program", "Glitch Dealer", "Virus Vendor"],
    items: ["Corrupted Data", "Malware Sample", "Broken Chip"]
  }
};

// Active players and their states
const activePlayers = new Map();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('login', async ({ tokenId, signature }) => {
    try {
      // Verify ownership and signature
      // TODO: Implement blockchain verification
      
      const playerState = await prisma.playerState.findUnique({
        where: { tokenId: parseInt(tokenId) }
      });

      if (playerState) {
        activePlayers.set(socket.id, {
          tokenId,
          location: playerState.location,
          lastAction: new Date()
        });

        // Send initial game state
        socket.emit('gameState', {
          location: locations[playerState.location],
          inventory: playerState.inventory,
          stats: playerState.stats
        });

        // Notify others in the same location
        socket.to(playerState.location).emit('playerEntered', {
          tokenId,
          message: `A new agent has materialized in ${playerState.location}`
        });

        // Join location room
        socket.join(playerState.location);
      }
    } catch (error) {
      console.error('Login error:', error);
      socket.emit('error', 'Failed to log in');
    }
  });

  socket.on('command', async ({ command, args }) => {
    const player = activePlayers.get(socket.id);
    if (!player) return;

    try {
      switch (command.toLowerCase()) {
        case 'look':
          const location = locations[player.location];
          socket.emit('message', {
            description: location.description,
            exits: location.exits,
            npcs: location.npcs,
            items: location.items
          });
          break;

        case 'move':
          const newLocation = args[0];
          if (locations[player.location].exits.includes(newLocation)) {
            // Leave old location room
            socket.leave(player.location);
            socket.to(player.location).emit('playerLeft', {
              tokenId: player.tokenId,
              message: `An agent has disappeared from ${player.location}`
            });

            // Update player location
            player.location = newLocation;
            await prisma.playerState.update({
              where: { tokenId: parseInt(player.tokenId) },
              data: { location: newLocation }
            });

            // Join new location room
            socket.join(newLocation);
            socket.to(newLocation).emit('playerEntered', {
              tokenId: player.tokenId,
              message: `A new agent has materialized in ${newLocation}`
            });

            // Send new location info
            socket.emit('message', {
              description: locations[newLocation].description,
              exits: locations[newLocation].exits,
              npcs: locations[newLocation].npcs,
              items: locations[newLocation].items
            });
          } else {
            socket.emit('error', 'Invalid location');
          }
          break;

        case 'say':
          const message = args.join(' ');
          socket.to(player.location).emit('message', {
            type: 'chat',
            tokenId: player.tokenId,
            message: message
          });
          break;

        case 'scan':
          // Get other players in the same location
          const room = io.sockets.adapter.rooms.get(player.location);
          if (room) {
            const players = Array.from(room).map(id => ({
              tokenId: activePlayers.get(id)?.tokenId
            })).filter(p => p.tokenId !== player.tokenId);
            socket.emit('message', {
              type: 'scan',
              players: players
            });
          }
          break;

        default:
          socket.emit('error', 'Unknown command');
      }
    } catch (error) {
      console.error('Command error:', error);
      socket.emit('error', 'Failed to process command');
    }
  });

  socket.on('disconnect', () => {
    const player = activePlayers.get(socket.id);
    if (player) {
      socket.to(player.location).emit('playerLeft', {
        tokenId: player.tokenId,
        message: `An agent has disconnected from ${player.location}`
      });
      activePlayers.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
