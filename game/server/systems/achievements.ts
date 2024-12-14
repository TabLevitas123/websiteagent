import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Achievement {
    id: string;
    name: string;
    description: string;
    category: string;
    difficulty: number;
    points: number;
    hidden: boolean;
    requirements: {
        type: string;
        target: string;
        amount: number;
    }[];
    rewards?: {
        credits?: number;
        items?: string[];
        title?: string;
        cosmetic?: string;
    };
}

export class AchievementSystem {
    private static readonly CATEGORIES = {
        COMBAT: 'combat',
        HACKING: 'hacking',
        EXPLORATION: 'exploration',
        SOCIAL: 'social',
        CRAFTING: 'crafting',
        PROGRESSION: 'progression',
        COLLECTION: 'collection',
        CHALLENGE: 'challenge'
    };

    private static readonly ACHIEVEMENTS: Achievement[] = [
        // Combat Achievements
        {
            id: 'first_blood',
            name: 'First Blood',
            description: 'Win your first combat encounter',
            category: 'combat',
            difficulty: 1,
            points: 10,
            hidden: false,
            requirements: [{
                type: 'combat_wins',
                target: 'any',
                amount: 1
            }],
            rewards: {
                credits: 1000,
                title: 'Initiate'
            }
        },
        {
            id: 'master_hacker',
            name: 'Master Hacker',
            description: 'Successfully complete 100 hacking attempts',
            category: 'hacking',
            difficulty: 3,
            points: 50,
            hidden: false,
            requirements: [{
                type: 'successful_hacks',
                target: 'any',
                amount: 100
            }],
            rewards: {
                credits: 10000,
                items: ['elite_cyberdeck'],
                title: 'Master Hacker'
            }
        },
        {
            id: 'social_butterfly',
            name: 'Social Butterfly',
            description: 'Join a guild and reach Veteran rank',
            category: 'social',
            difficulty: 2,
            points: 30,
            hidden: false,
            requirements: [{
                type: 'guild_rank',
                target: 'any',
                amount: 3
            }],
            rewards: {
                credits: 5000,
                title: 'Networker'
            }
        },
        {
            id: 'master_craftsman',
            name: 'Master Craftsman',
            description: 'Craft 50 items with Superior quality or better',
            category: 'crafting',
            difficulty: 4,
            points: 75,
            hidden: false,
            requirements: [{
                type: 'craft_quality_items',
                target: 'superior_plus',
                amount: 50
            }],
            rewards: {
                credits: 15000,
                items: ['master_crafting_kit'],
                title: 'Master Artificer'
            }
        }
        // Add more achievements as needed
    ];

    static async initializePlayerAchievements(playerId: string) {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        // Initialize achievement tracking for all achievements
        for (const achievement of this.ACHIEVEMENTS) {
            await prisma.achievementProgress.create({
                data: {
                    playerId: player.tokenId,
                    achievementId: achievement.id,
                    progress: 0,
                    completed: false,
                    completionDate: null
                }
            });
        }
    }

    static async updateProgress(
        playerId: string,
        type: string,
        target: string,
        amount: number = 1
    ) {
        const relevantAchievements = this.ACHIEVEMENTS.filter(achievement =>
            achievement.requirements.some(req =>
                req.type === type &&
                (req.target === target || req.target === 'any')
            )
        );

        for (const achievement of relevantAchievements) {
            const progress = await prisma.achievementProgress.findFirst({
                where: {
                    playerId: parseInt(playerId),
                    achievementId: achievement.id
                }
            });

            if (progress && !progress.completed) {
                const requirement = achievement.requirements.find(req =>
                    req.type === type &&
                    (req.target === target || req.target === 'any')
                );

                if (requirement) {
                    const newProgress = Math.min(
                        progress.progress + amount,
                        requirement.amount
                    );

                    if (newProgress >= requirement.amount) {
                        // Achievement completed
                        await this.completeAchievement(playerId, achievement.id);
                    } else {
                        // Update progress
                        await prisma.achievementProgress.update({
                            where: { id: progress.id },
                            data: { progress: newProgress }
                        });
                    }
                }
            }
        }
    }

    private static async completeAchievement(
        playerId: string,
        achievementId: string
    ) {
        const achievement = this.ACHIEVEMENTS.find(a => a.id === achievementId);
        if (!achievement) return;

        await prisma.$transaction(async (prisma) => {
            // Mark achievement as completed
            await prisma.achievementProgress.updateMany({
                where: {
                    playerId: parseInt(playerId),
                    achievementId
                },
                data: {
                    completed: true,
                    completionDate: new Date()
                }
            });

            // Grant rewards
            if (achievement.rewards) {
                const player = await prisma.playerState.findUnique({
                    where: { tokenId: parseInt(playerId) }
                });

                if (player) {
                    // Grant credits
                    if (achievement.rewards.credits) {
                        await prisma.playerState.update({
                            where: { tokenId: player.tokenId },
                            data: {
                                credits: player.credits + achievement.rewards.credits
                            }
                        });
                    }

                    // Grant items
                    if (achievement.rewards.items) {
                        for (const itemId of achievement.rewards.items) {
                            await prisma.inventory.create({
                                data: {
                                    playerId: player.tokenId,
                                    itemId,
                                    quantity: 1
                                }
                            });
                        }
                    }

                    // Grant title
                    if (achievement.rewards.title) {
                        await prisma.playerTitles.create({
                            data: {
                                playerId: player.tokenId,
                                title: achievement.rewards.title,
                                source: `Achievement: ${achievement.name}`
                            }
                        });
                    }

                    // Grant cosmetic
                    if (achievement.rewards.cosmetic) {
                        await prisma.playerCosmetics.create({
                            data: {
                                playerId: player.tokenId,
                                cosmeticId: achievement.rewards.cosmetic,
                                source: `Achievement: ${achievement.name}`
                            }
                        });
                    }
                }
            }
        });

        // Broadcast achievement completion
        // Implementation depends on your notification system
    }

    static async getPlayerAchievements(playerId: string) {
        const progress = await prisma.achievementProgress.findMany({
            where: { playerId: parseInt(playerId) }
        });

        return this.ACHIEVEMENTS.map(achievement => {
            const playerProgress = progress.find(p => p.achievementId === achievement.id);
            return {
                ...achievement,
                progress: playerProgress?.progress || 0,
                completed: playerProgress?.completed || false,
                completionDate: playerProgress?.completionDate,
                hidden: achievement.hidden && !playerProgress?.completed
            };
        });
    }

    static async getGlobalAchievementStats() {
        const stats = await prisma.achievementProgress.groupBy({
            by: ['achievementId'],
            _count: {
                completed: true
            },
            where: {
                completed: true
            }
        });

        return stats.map(stat => ({
            achievement: this.ACHIEVEMENTS.find(a => a.id === stat.achievementId),
            completions: stat._count.completed
        }));
    }

    static async getRecentAchievements(limit: number = 10) {
        const recent = await prisma.achievementProgress.findMany({
            where: { completed: true },
            orderBy: { completionDate: 'desc' },
            take: limit,
            include: {
                player: {
                    select: {
                        name: true
                    }
                }
            }
        });

        return recent.map(progress => ({
            achievement: this.ACHIEVEMENTS.find(a => a.id === progress.achievementId),
            playerName: progress.player.name,
            completionDate: progress.completionDate
        }));
    }
}
