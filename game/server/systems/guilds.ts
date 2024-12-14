import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface GuildRank {
    id: number;
    name: string;
    permissions: string[];
    minimumContribution: number;
}

interface GuildUpgrade {
    id: string;
    name: string;
    description: string;
    cost: number;
    requirements: {
        level: number;
        memberCount?: number;
        previousUpgrades?: string[];
    };
    effects: {
        [key: string]: number;
    };
}

export class GuildSystem {
    private static readonly DEFAULT_RANKS: GuildRank[] = [
        {
            id: 1,
            name: 'Initiate',
            permissions: ['VIEW_GUILD', 'CHAT'],
            minimumContribution: 0
        },
        {
            id: 2,
            name: 'Member',
            permissions: ['VIEW_GUILD', 'CHAT', 'PARTICIPATE_RAIDS'],
            minimumContribution: 1000
        },
        {
            id: 3,
            name: 'Veteran',
            permissions: ['VIEW_GUILD', 'CHAT', 'PARTICIPATE_RAIDS', 'RECRUIT_MEMBERS'],
            minimumContribution: 5000
        },
        {
            id: 4,
            name: 'Officer',
            permissions: ['VIEW_GUILD', 'CHAT', 'PARTICIPATE_RAIDS', 'RECRUIT_MEMBERS', 'MANAGE_MEMBERS', 'MANAGE_RAIDS'],
            minimumContribution: 10000
        },
        {
            id: 5,
            name: 'Guild Master',
            permissions: ['ALL'],
            minimumContribution: 20000
        }
    ];

    private static readonly GUILD_UPGRADES: GuildUpgrade[] = [
        {
            id: 'hq_level_1',
            name: 'Guild HQ Level 1',
            description: 'Establish a basic headquarters for your guild',
            cost: 10000,
            requirements: {
                level: 1,
                memberCount: 5
            },
            effects: {
                storageSpace: 100,
                maxMembers: 20
            }
        },
        {
            id: 'research_lab',
            name: 'Research Laboratory',
            description: 'Enable collaborative research projects',
            cost: 25000,
            requirements: {
                level: 5,
                memberCount: 10,
                previousUpgrades: ['hq_level_1']
            },
            effects: {
                researchSpeed: 10,
                craftingQuality: 5
            }
        },
        {
            id: 'training_facility',
            name: 'Neural Training Facility',
            description: 'Boost experience gains for guild members',
            cost: 50000,
            requirements: {
                level: 10,
                memberCount: 15,
                previousUpgrades: ['hq_level_1']
            },
            effects: {
                experienceGain: 15,
                skillLearningRate: 10
            }
        }
    ];

    static async createGuild(
        founderPlayerId: string,
        name: string,
        description: string,
        tag: string
    ) {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(founderPlayerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        // Verify guild creation requirements
        if (player.level < 10) {
            throw new Error('Must be at least level 10 to create a guild');
        }

        if (player.credits < 50000) {
            throw new Error('Insufficient credits to create guild');
        }

        // Create guild
        const guild = await prisma.guild.create({
            data: {
                name,
                description,
                tag,
                founderId: player.tokenId,
                level: 1,
                experience: 0,
                credits: 0,
                maxMembers: 20,
                ranks: this.DEFAULT_RANKS,
                upgrades: []
            }
        });

        // Add founder as Guild Master
        await prisma.guildMember.create({
            data: {
                guildId: guild.id,
                playerId: player.tokenId,
                rank: 5, // Guild Master rank
                joinDate: new Date(),
                contribution: 0
            }
        });

        // Deduct creation cost
        await prisma.playerState.update({
            where: { tokenId: player.tokenId },
            data: {
                credits: player.credits - 50000
            }
        });

        return guild;
    }

    static async joinGuild(
        playerId: string,
        guildId: string,
        inviteCode?: string
    ) {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        const guild = await prisma.guild.findUnique({
            where: { id: guildId }
        });

        if (!guild) {
            throw new Error('Guild not found');
        }

        // Check if guild is full
        const memberCount = await prisma.guildMember.count({
            where: { guildId }
        });

        if (memberCount >= guild.maxMembers) {
            throw new Error('Guild is full');
        }

        // Verify invite code if required
        if (guild.requiresInvite && inviteCode) {
            const invite = await prisma.guildInvite.findFirst({
                where: {
                    guildId,
                    code: inviteCode,
                    expiryDate: {
                        gt: new Date()
                    }
                }
            });

            if (!invite) {
                throw new Error('Invalid or expired invite code');
            }
        }

        // Add player to guild
        await prisma.guildMember.create({
            data: {
                guildId,
                playerId: player.tokenId,
                rank: 1, // Initiate rank
                joinDate: new Date(),
                contribution: 0
            }
        });

        return {
            success: true,
            message: `Welcome to ${guild.name}!`
        };
    }

    static async contributeToGuild(
        playerId: string,
        guildId: string,
        credits: number
    ) {
        const member = await prisma.guildMember.findFirst({
            where: {
                playerId: parseInt(playerId),
                guildId
            }
        });

        if (!member) {
            throw new Error('Not a guild member');
        }

        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player || player.credits < credits) {
            throw new Error('Insufficient credits');
        }

        // Update guild treasury and member contribution
        await prisma.$transaction([
            prisma.guild.update({
                where: { id: guildId },
                data: {
                    credits: {
                        increment: credits
                    }
                }
            }),
            prisma.guildMember.update({
                where: { id: member.id },
                data: {
                    contribution: {
                        increment: credits
                    }
                }
            }),
            prisma.playerState.update({
                where: { tokenId: player.tokenId },
                data: {
                    credits: player.credits - credits
                }
            })
        ]);

        // Check for rank progression
        await this.checkRankProgression(member.id);

        return {
            success: true,
            message: `Contributed ${credits} credits to guild treasury`
        };
    }

    static async purchaseGuildUpgrade(
        playerId: string,
        guildId: string,
        upgradeId: string
    ) {
        const member = await prisma.guildMember.findFirst({
            where: {
                playerId: parseInt(playerId),
                guildId
            }
        });

        if (!member || !this.hasPermission(member.rank, 'MANAGE_UPGRADES')) {
            throw new Error('Insufficient permissions');
        }

        const guild = await prisma.guild.findUnique({
            where: { id: guildId }
        });

        if (!guild) {
            throw new Error('Guild not found');
        }

        const upgrade = this.GUILD_UPGRADES.find(u => u.id === upgradeId);
        if (!upgrade) {
            throw new Error('Invalid upgrade');
        }

        // Verify requirements
        if (guild.level < upgrade.requirements.level) {
            throw new Error('Guild level too low');
        }

        if (upgrade.requirements.memberCount) {
            const memberCount = await prisma.guildMember.count({
                where: { guildId }
            });
            if (memberCount < upgrade.requirements.memberCount) {
                throw new Error('Insufficient guild members');
            }
        }

        if (upgrade.requirements.previousUpgrades) {
            const hasPrereqs = upgrade.requirements.previousUpgrades.every(
                prereq => guild.upgrades.includes(prereq)
            );
            if (!hasPrereqs) {
                throw new Error('Missing prerequisite upgrades');
            }
        }

        if (guild.credits < upgrade.cost) {
            throw new Error('Insufficient guild credits');
        }

        // Purchase upgrade
        await prisma.guild.update({
            where: { id: guildId },
            data: {
                credits: guild.credits - upgrade.cost,
                upgrades: {
                    push: upgradeId
                }
            }
        });

        // Apply upgrade effects
        await this.applyUpgradeEffects(guildId, upgrade);

        return {
            success: true,
            message: `Successfully purchased ${upgrade.name}`,
            effects: upgrade.effects
        };
    }

    private static async checkRankProgression(memberId: string) {
        const member = await prisma.guildMember.findUnique({
            where: { id: memberId }
        });

        if (!member) return;

        // Find appropriate rank based on contribution
        const newRank = this.DEFAULT_RANKS
            .filter(rank => rank.minimumContribution <= member.contribution)
            .reduce((highest, current) => 
                current.id > highest.id ? current : highest
            );

        if (newRank.id > member.rank) {
            await prisma.guildMember.update({
                where: { id: memberId },
                data: { rank: newRank.id }
            });

            // Notify member of promotion
            // Implementation depends on your notification system
        }
    }

    private static hasPermission(rank: number, permission: string): boolean {
        const rankData = this.DEFAULT_RANKS.find(r => r.id === rank);
        return rankData?.permissions.includes('ALL') || 
               rankData?.permissions.includes(permission) || 
               false;
    }

    private static async applyUpgradeEffects(
        guildId: string,
        upgrade: GuildUpgrade
    ) {
        // Apply effects to guild and its members
        if (upgrade.effects.maxMembers) {
            await prisma.guild.update({
                where: { id: guildId },
                data: {
                    maxMembers: {
                        increment: upgrade.effects.maxMembers
                    }
                }
            });
        }

        // Apply other effects as needed
        // This would be implemented based on your specific upgrade effects
    }

    static async startGuildRaid(
        playerId: string,
        guildId: string,
        raidType: string
    ) {
        // Implementation for guild raids
        // This would tie into your combat system
    }

    static async getGuildLeaderboard() {
        return await prisma.guild.findMany({
            select: {
                id: true,
                name: true,
                tag: true,
                level: true,
                experience: true,
                _count: {
                    select: { members: true }
                }
            },
            orderBy: { experience: 'desc' },
            take: 100
        });
    }
}
