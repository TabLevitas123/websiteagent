import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface MissionObjective {
    type: string;
    target: string;
    amount: number;
    completed: number;
    description: string;
}

interface MissionReward {
    experience: number;
    credits: number;
    items?: string[];
    reputation?: {
        faction: string;
        amount: number;
    };
}

export class MissionSystem {
    private static readonly MISSION_TYPES = {
        HACK: 'hack',
        COMBAT: 'combat',
        INFILTRATION: 'infiltration',
        DATA_COLLECTION: 'data_collection',
        PROTECTION: 'protection'
    };

    private static readonly MISSION_POOL = [
        {
            title: "Corporate Data Heist",
            type: "hack",
            description: "Infiltrate MegaCorp's secure servers and extract sensitive data without detection.",
            difficulty: 3,
            objectives: [
                {
                    type: "hack",
                    target: "security_system",
                    amount: 1,
                    description: "Bypass main security system"
                },
                {
                    type: "collect",
                    target: "corporate_data",
                    amount: 3,
                    description: "Extract encrypted data packages"
                }
            ],
            rewards: {
                experience: 500,
                credits: 1000,
                items: ["Advanced Encryption Key", "Corporate Access Token"]
            }
        },
        {
            title: "Rogue AI Containment",
            type: "combat",
            description: "Track and neutralize a rogue AI that's causing chaos in the network.",
            difficulty: 4,
            objectives: [
                {
                    type: "combat",
                    target: "ai_fragments",
                    amount: 5,
                    description: "Eliminate AI fragments"
                },
                {
                    type: "hack",
                    target: "ai_core",
                    amount: 1,
                    description: "Disable AI core systems"
                }
            ],
            rewards: {
                experience: 800,
                credits: 1500,
                items: ["AI Core Fragment", "Neural Disruptor"]
            }
        },
        {
            title: "Digital Underground",
            type: "infiltration",
            description: "Establish a hidden network of information brokers in the darknet.",
            difficulty: 2,
            objectives: [
                {
                    type: "hack",
                    target: "network_nodes",
                    amount: 3,
                    description: "Set up secure network nodes"
                },
                {
                    type: "recruit",
                    target: "info_brokers",
                    amount: 2,
                    description: "Recruit information brokers"
                }
            ],
            rewards: {
                experience: 300,
                credits: 800,
                reputation: {
                    faction: "Underground Network",
                    amount: 100
                }
            }
        }
    ];

    static async generateMission(playerId: string) {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        // Select mission based on player level and previous missions
        const availableMissions = this.MISSION_POOL.filter(mission => 
            mission.difficulty <= Math.ceil(player.stats.level / 2)
        );

        const selectedMission = availableMissions[
            Math.floor(Math.random() * availableMissions.length)
        ];

        // Create mission instance
        const mission = await prisma.mission.create({
            data: {
                playerId: player.tokenId,
                title: selectedMission.title,
                type: selectedMission.type,
                description: selectedMission.description,
                difficulty: selectedMission.difficulty,
                objectives: selectedMission.objectives,
                rewards: selectedMission.rewards,
                status: 'active',
                startTime: new Date(),
                expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }
        });

        return mission;
    }

    static async updateMissionProgress(
        playerId: string,
        missionId: string,
        objectiveType: string,
        target: string,
        progress: number
    ) {
        const mission = await prisma.mission.findFirst({
            where: {
                id: missionId,
                playerId: parseInt(playerId),
                status: 'active'
            }
        });

        if (!mission) {
            throw new Error('Active mission not found');
        }

        // Update objective progress
        const objectives = mission.objectives.map(obj => {
            if (obj.type === objectiveType && obj.target === target) {
                return {
                    ...obj,
                    completed: Math.min(obj.amount, (obj.completed || 0) + progress)
                };
            }
            return obj;
        });

        // Check if all objectives are completed
        const isCompleted = objectives.every(obj => (obj.completed || 0) >= obj.amount);

        if (isCompleted) {
            await this.completeMission(mission);
            return {
                status: 'completed',
                message: this.generateCompletionMessage(mission.title),
                rewards: mission.rewards
            };
        }

        // Update mission with new progress
        await prisma.mission.update({
            where: { id: missionId },
            data: { objectives }
        });

        return {
            status: 'in_progress',
            objectives,
            message: this.generateProgressMessage(objectiveType, progress)
        };
    }

    private static async completeMission(mission: any) {
        // Update mission status
        await prisma.mission.update({
            where: { id: mission.id },
            data: {
                status: 'completed',
                completionTime: new Date()
            }
        });

        // Award rewards to player
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(mission.playerId) }
        });

        if (player) {
            await prisma.playerState.update({
                where: { tokenId: parseInt(mission.playerId) },
                data: {
                    experience: player.experience + mission.rewards.experience,
                    credits: player.credits + mission.rewards.credits,
                    // Add items to inventory
                    inventory: {
                        push: mission.rewards.items || []
                    }
                }
            });

            // Update faction reputation if applicable
            if (mission.rewards.reputation) {
                await this.updateFactionReputation(
                    mission.playerId,
                    mission.rewards.reputation.faction,
                    mission.rewards.reputation.amount
                );
            }
        }
    }

    private static generateCompletionMessage(missionTitle: string): string {
        const messages = [
            `Mission Complete: ${missionTitle} - Excellent work, agent.`,
            `${missionTitle} successfully concluded. Rewards transferred to your account.`,
            `Mission objectives achieved. ${missionTitle} completed with optimal results.`,
            `${missionTitle} accomplished. Your efficiency has been noted.`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    private static generateProgressMessage(objectiveType: string, progress: number): string {
        const messages = {
            hack: [
                `System breach progress: ${progress} steps completed`,
                `Hacking attempt successful: ${progress} security layers bypassed`
            ],
            combat: [
                `Combat engagement successful: ${progress} targets neutralized`,
                `Battle report: ${progress} hostile programs eliminated`
            ],
            collect: [
                `Data collection progress: ${progress} packages secured`,
                `Resource gathering update: ${progress} items collected`
            ]
        };

        const typeMessages = messages[objectiveType as keyof typeof messages] || [
            `Progress update: ${progress} objectives completed`,
            `Mission advancement: ${progress} tasks finished`
        ];

        return typeMessages[Math.floor(Math.random() * typeMessages.length)];
    }

    private static async updateFactionReputation(
        playerId: string,
        faction: string,
        amount: number
    ) {
        // This would be implemented based on your game's faction system
        // For now, we'll just log it
        console.log(`Updated ${faction} reputation for player ${playerId} by ${amount}`);
    }
}
