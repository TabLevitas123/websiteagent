import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SkillNode {
    id: string;
    name: string;
    description: string;
    type: string;
    tier: number;
    maxLevel: number;
    effects: {
        [key: string]: number;
    };
    requirements: {
        level?: number;
        skillPoints?: number;
        prerequisites?: string[];
    };
}

export class SkillSystem {
    private static readonly SKILL_TREES = {
        HACKING: 'hacking',
        COMBAT: 'combat',
        STEALTH: 'stealth',
        ENGINEERING: 'engineering',
        INFLUENCE: 'influence'
    };

    private static readonly SKILL_NODES: { [key: string]: SkillNode[] } = {
        hacking: [
            {
                id: 'basic_breach',
                name: 'Basic Breach',
                description: 'Fundamental hacking techniques for bypassing simple security systems',
                type: 'hacking',
                tier: 1,
                maxLevel: 5,
                effects: {
                    hackingSpeed: 5,
                    successRate: 3
                },
                requirements: {
                    level: 1,
                    skillPoints: 1
                }
            },
            {
                id: 'encryption_specialist',
                name: 'Encryption Specialist',
                description: 'Advanced knowledge of encryption and decryption protocols',
                type: 'hacking',
                tier: 2,
                maxLevel: 3,
                effects: {
                    decryptionSpeed: 10,
                    securityBypass: 5
                },
                requirements: {
                    level: 5,
                    skillPoints: 2,
                    prerequisites: ['basic_breach']
                }
            },
            {
                id: 'neural_interface',
                name: 'Neural Interface',
                description: 'Direct neural connection for enhanced system control',
                type: 'hacking',
                tier: 3,
                maxLevel: 1,
                effects: {
                    hackingSpeed: 25,
                    multiTasking: 2
                },
                requirements: {
                    level: 10,
                    skillPoints: 4,
                    prerequisites: ['encryption_specialist']
                }
            }
        ],
        combat: [
            {
                id: 'system_strike',
                name: 'System Strike',
                description: 'Basic combat protocols for digital warfare',
                type: 'combat',
                tier: 1,
                maxLevel: 5,
                effects: {
                    damage: 5,
                    accuracy: 3
                },
                requirements: {
                    level: 1,
                    skillPoints: 1
                }
            },
            {
                id: 'viral_warfare',
                name: 'Viral Warfare',
                description: 'Deploy combat viruses for sustained damage',
                type: 'combat',
                tier: 2,
                maxLevel: 3,
                effects: {
                    virusDamage: 8,
                    infectionRate: 5
                },
                requirements: {
                    level: 5,
                    skillPoints: 2,
                    prerequisites: ['system_strike']
                }
            }
        ],
        // Add more skill trees as needed
    };

    static async initializeSkillTree(playerId: string) {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        // Create initial skill tree for player
        for (const treeType in this.SKILL_NODES) {
            for (const node of this.SKILL_NODES[treeType]) {
                await prisma.playerSkill.create({
                    data: {
                        playerId: parseInt(playerId),
                        skillId: node.id,
                        level: 0,
                        unlocked: node.tier === 1 // First tier skills start unlocked
                    }
                });
            }
        }
    }

    static async upgradeSkill(
        playerId: string,
        skillId: string
    ) {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        const skill = await prisma.playerSkill.findFirst({
            where: {
                playerId: parseInt(playerId),
                skillId
            }
        });

        if (!skill) {
            throw new Error('Skill not found');
        }

        const skillNode = this.findSkillNode(skillId);
        if (!skillNode) {
            throw new Error('Invalid skill ID');
        }

        // Verify requirements
        await this.verifySkillRequirements(player, skill, skillNode);

        // Upgrade skill
        await prisma.playerSkill.update({
            where: { id: skill.id },
            data: {
                level: skill.level + 1
            }
        });

        // Update player stats based on skill effects
        await this.applySkillEffects(player, skillNode);

        // Unlock dependent skills if applicable
        await this.unlockDependentSkills(player.tokenId, skillId);

        return {
            success: true,
            newLevel: skill.level + 1,
            effects: skillNode.effects
        };
    }

    private static findSkillNode(skillId: string): SkillNode | undefined {
        for (const treeType in this.SKILL_NODES) {
            const node = this.SKILL_NODES[treeType].find(n => n.id === skillId);
            if (node) return node;
        }
        return undefined;
    }

    private static async verifySkillRequirements(
        player: any,
        skill: any,
        skillNode: SkillNode
    ) {
        // Check if skill is already at max level
        if (skill.level >= skillNode.maxLevel) {
            throw new Error('Skill already at maximum level');
        }

        // Check if player meets level requirement
        if (player.level < skillNode.requirements.level!) {
            throw new Error('Player level too low');
        }

        // Check if player has enough skill points
        if (player.skillPoints < skillNode.requirements.skillPoints!) {
            throw new Error('Insufficient skill points');
        }

        // Check prerequisites
        if (skillNode.requirements.prerequisites) {
            for (const prereqId of skillNode.requirements.prerequisites) {
                const prereq = await prisma.playerSkill.findFirst({
                    where: {
                        playerId: player.tokenId,
                        skillId: prereqId
                    }
                });

                if (!prereq || prereq.level === 0) {
                    throw new Error('Prerequisite skills not met');
                }
            }
        }
    }

    private static async applySkillEffects(
        player: any,
        skillNode: SkillNode
    ) {
        const stats = { ...player.stats };
        
        // Apply skill effects to player stats
        for (const [stat, value] of Object.entries(skillNode.effects)) {
            if (stats[stat]) {
                stats[stat] += value;
            } else {
                stats[stat] = value;
            }
        }

        // Update player stats
        await prisma.playerState.update({
            where: { tokenId: player.tokenId },
            data: {
                stats,
                skillPoints: player.skillPoints - skillNode.requirements.skillPoints!
            }
        });
    }

    private static async unlockDependentSkills(
        playerId: number,
        skillId: string
    ) {
        // Find all skills that have this skill as a prerequisite
        for (const treeType in this.SKILL_NODES) {
            const dependentSkills = this.SKILL_NODES[treeType].filter(
                node => node.requirements.prerequisites?.includes(skillId)
            );

            for (const depSkill of dependentSkills) {
                await prisma.playerSkill.updateMany({
                    where: {
                        playerId,
                        skillId: depSkill.id
                    },
                    data: {
                        unlocked: true
                    }
                });
            }
        }
    }

    static async getSkillTree(playerId: string) {
        const playerSkills = await prisma.playerSkill.findMany({
            where: { playerId: parseInt(playerId) }
        });

        const skillTree: { [key: string]: any[] } = {};

        for (const treeType in this.SKILL_NODES) {
            skillTree[treeType] = this.SKILL_NODES[treeType].map(node => {
                const playerSkill = playerSkills.find(ps => ps.skillId === node.id);
                return {
                    ...node,
                    currentLevel: playerSkill?.level || 0,
                    unlocked: playerSkill?.unlocked || false
                };
            });
        }

        return skillTree;
    }
}
