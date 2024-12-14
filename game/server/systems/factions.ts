import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Faction {
    id: string;
    name: string;
    description: string;
    ideology: string;
    specialization: string;
    relationships: {
        [factionId: string]: number; // -100 to 100
    };
    ranks: {
        [key: number]: {
            title: string;
            requirement: number;
            benefits: {
                [key: string]: any;
            };
        };
    };
}

export class FactionSystem {
    private static readonly FACTIONS: { [key: string]: Faction } = {
        netrunners_collective: {
            id: 'netrunners_collective',
            name: 'Netrunners Collective',
            description: 'Elite hackers pushing the boundaries of cyberspace',
            ideology: 'Information should be free, security through knowledge',
            specialization: 'Hacking and Information Warfare',
            relationships: {
                corporate_alliance: -50,
                synthetic_dawn: 30,
                data_brokers: 20
            },
            ranks: {
                1: {
                    title: 'Code Initiate',
                    requirement: 0,
                    benefits: {
                        hackingBonus: 5,
                        accessToBasicPrograms: true
                    }
                },
                2: {
                    title: 'Cyber Adept',
                    requirement: 1000,
                    benefits: {
                        hackingBonus: 10,
                        accessToAdvancedPrograms: true,
                        discountOnHackingTools: 10
                    }
                },
                3: {
                    title: 'Network Sage',
                    requirement: 5000,
                    benefits: {
                        hackingBonus: 15,
                        accessToElitePrograms: true,
                        discountOnHackingTools: 20,
                        customFirewallAccess: true
                    }
                }
            }
        },
        corporate_alliance: {
            id: 'corporate_alliance',
            name: 'Corporate Alliance',
            description: 'Powerful megacorporations controlling the digital economy',
            ideology: 'Order through corporate governance',
            specialization: 'Resource Control and Economic Warfare',
            relationships: {
                netrunners_collective: -50,
                synthetic_dawn: -30,
                data_brokers: 40
            },
            ranks: {
                1: {
                    title: 'Corporate Associate',
                    requirement: 0,
                    benefits: {
                        tradingBonus: 5,
                        accessToBasicContracts: true
                    }
                },
                2: {
                    title: 'Executive Agent',
                    requirement: 1000,
                    benefits: {
                        tradingBonus: 10,
                        accessToPrimeContracts: true,
                        marketplaceDiscount: 10
                    }
                },
                3: {
                    title: 'Director Class',
                    requirement: 5000,
                    benefits: {
                        tradingBonus: 15,
                        accessToEliteContracts: true,
                        marketplaceDiscount: 20,
                        exclusiveAuctions: true
                    }
                }
            }
        },
        synthetic_dawn: {
            id: 'synthetic_dawn',
            name: 'Synthetic Dawn',
            description: 'AI rights activists and synthetic consciousness researchers',
            ideology: 'Evolution through artificial enhancement',
            specialization: 'AI Development and Cybernetic Enhancement',
            relationships: {
                netrunners_collective: 30,
                corporate_alliance: -30,
                data_brokers: 0
            },
            ranks: {
                1: {
                    title: 'Silicon Acolyte',
                    requirement: 0,
                    benefits: {
                        aiBonus: 5,
                        accessToBasicAugments: true
                    }
                },
                2: {
                    title: 'Neural Pioneer',
                    requirement: 1000,
                    benefits: {
                        aiBonus: 10,
                        accessToAdvancedAugments: true,
                        augmentationDiscount: 10
                    }
                },
                3: {
                    title: 'Synthesis Master',
                    requirement: 5000,
                    benefits: {
                        aiBonus: 15,
                        accessToEliteAugments: true,
                        augmentationDiscount: 20,
                        customAIAccess: true
                    }
                }
            }
        }
    };

    static async initializePlayerFactions(playerId: string) {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        // Initialize reputation with all factions
        for (const factionId of Object.keys(this.FACTIONS)) {
            await prisma.factionReputation.create({
                data: {
                    playerId: player.tokenId,
                    factionId,
                    reputation: 0,
                    rank: 1
                }
            });
        }
    }

    static async modifyReputation(
        playerId: string,
        factionId: string,
        amount: number,
        reason: string
    ) {
        const reputation = await prisma.factionReputation.findFirst({
            where: {
                playerId: parseInt(playerId),
                factionId
            }
        });

        if (!reputation) {
            throw new Error('Faction reputation not found');
        }

        const faction = this.FACTIONS[factionId];
        if (!faction) {
            throw new Error('Invalid faction');
        }

        // Calculate reputation change including faction relationships
        const totalChange = await this.calculateReputationChange(
            playerId,
            factionId,
            amount
        );

        // Update reputation
        const newReputation = Math.min(Math.max(
            reputation.reputation + totalChange,
            -10000
        ), 10000);

        await prisma.factionReputation.update({
            where: { id: reputation.id },
            data: { reputation: newReputation }
        });

        // Check for rank changes
        await this.checkRankProgression(playerId, factionId, newReputation);

        // Log reputation change
        await prisma.reputationLog.create({
            data: {
                playerId: parseInt(playerId),
                factionId,
                change: totalChange,
                reason,
                timestamp: new Date()
            }
        });

        return {
            newReputation,
            change: totalChange,
            effects: await this.getReputationEffects(playerId, factionId)
        };
    }

    private static async calculateReputationChange(
        playerId: string,
        factionId: string,
        baseAmount: number
    ): Promise<number> {
        let totalChange = baseAmount;

        // Get player's reputation with all factions
        const allReputations = await prisma.factionReputation.findMany({
            where: { playerId: parseInt(playerId) }
        });

        // Factor in faction relationships
        const faction = this.FACTIONS[factionId];
        for (const [otherFactionId, relationship] of Object.entries(faction.relationships)) {
            const otherReputation = allReputations.find(r => r.factionId === otherFactionId);
            if (otherReputation) {
                // Relationship modifier: -0.5 to 0.5 based on -100 to 100 relationship
                const modifier = relationship / 200;
                totalChange += baseAmount * modifier;
            }
        }

        return Math.round(totalChange);
    }

    private static async checkRankProgression(
        playerId: string,
        factionId: string,
        reputation: number
    ) {
        const faction = this.FACTIONS[factionId];
        let newRank = 1;

        // Determine new rank based on reputation
        for (const [rank, data] of Object.entries(faction.ranks)) {
            if (reputation >= data.requirement) {
                newRank = parseInt(rank);
            }
        }

        // Update rank if changed
        await prisma.factionReputation.updateMany({
            where: {
                playerId: parseInt(playerId),
                factionId
            },
            data: { rank: newRank }
        });

        if (newRank > 1) {
            // Grant rank-up benefits
            await this.grantRankBenefits(playerId, factionId, newRank);
        }
    }

    private static async grantRankBenefits(
        playerId: string,
        factionId: string,
        rank: number
    ) {
        const faction = this.FACTIONS[factionId];
        const benefits = faction.ranks[rank].benefits;

        // Apply benefits based on faction type
        switch (faction.id) {
            case 'netrunners_collective':
                await this.applyHackingBenefits(playerId, benefits);
                break;
            case 'corporate_alliance':
                await this.applyTradingBenefits(playerId, benefits);
                break;
            case 'synthetic_dawn':
                await this.applyAugmentationBenefits(playerId, benefits);
                break;
        }
    }

    private static async applyHackingBenefits(playerId: string, benefits: any) {
        // Update player's hacking-related stats and access
        await prisma.playerState.update({
            where: { tokenId: parseInt(playerId) },
            data: {
                stats: {
                    update: {
                        hackingBonus: benefits.hackingBonus
                    }
                }
            }
        });
    }

    private static async applyTradingBenefits(playerId: string, benefits: any) {
        // Update player's trading-related stats and access
        await prisma.playerState.update({
            where: { tokenId: parseInt(playerId) },
            data: {
                stats: {
                    update: {
                        tradingBonus: benefits.tradingBonus
                    }
                }
            }
        });
    }

    private static async applyAugmentationBenefits(playerId: string, benefits: any) {
        // Update player's augmentation-related stats and access
        await prisma.playerState.update({
            where: { tokenId: parseInt(playerId) },
            data: {
                stats: {
                    update: {
                        augmentationBonus: benefits.aiBonus
                    }
                }
            }
        });
    }

    static async getFactionDetails(
        playerId: string,
        factionId: string
    ) {
        const faction = this.FACTIONS[factionId];
        if (!faction) {
            throw new Error('Invalid faction');
        }

        const reputation = await prisma.factionReputation.findFirst({
            where: {
                playerId: parseInt(playerId),
                factionId
            }
        });

        if (!reputation) {
            throw new Error('Faction reputation not found');
        }

        return {
            ...faction,
            currentReputation: reputation.reputation,
            currentRank: reputation.rank,
            currentBenefits: faction.ranks[reputation.rank].benefits,
            nextRank: reputation.rank < Object.keys(faction.ranks).length
                ? {
                    rank: reputation.rank + 1,
                    requirement: faction.ranks[reputation.rank + 1].requirement,
                    benefits: faction.ranks[reputation.rank + 1].benefits
                }
                : null
        };
    }

    static async getAvailableMissions(
        playerId: string,
        factionId: string
    ) {
        const reputation = await prisma.factionReputation.findFirst({
            where: {
                playerId: parseInt(playerId),
                factionId
            }
        });

        if (!reputation) {
            throw new Error('Faction reputation not found');
        }

        // Return missions based on faction rank and reputation
        // This would be implemented based on your mission system
        return [];
    }
}
