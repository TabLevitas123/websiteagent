import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface CraftingRecipe {
    id: string;
    name: string;
    description: string;
    category: string;
    difficulty: number;
    materials: {
        itemId: string;
        quantity: number;
    }[];
    result: {
        itemId: string;
        quantity: number;
        baseQuality: number;
    };
    requirements: {
        level?: number;
        skills?: {
            skillId: string;
            minLevel: number;
        }[];
    };
}

interface CraftingResult {
    success: boolean;
    quality: number;
    message: string;
    item?: {
        id: string;
        name: string;
        quality: number;
    };
}

export class CraftingSystem {
    private static readonly CRAFTING_CATEGORIES = {
        PROGRAMS: 'programs',
        HARDWARE: 'hardware',
        CYBERNETICS: 'cybernetics',
        CONSUMABLES: 'consumables',
        TOOLS: 'tools'
    };

    private static readonly QUALITY_LEVELS = {
        POOR: { range: [0, 30], modifier: 0.7 },
        STANDARD: { range: [31, 70], modifier: 1.0 },
        SUPERIOR: { range: [71, 90], modifier: 1.3 },
        EXCEPTIONAL: { range: [91, 99], modifier: 1.6 },
        MASTERWORK: { range: [100, Infinity], modifier: 2.0 }
    };

    private static readonly RECIPES: CraftingRecipe[] = [
        {
            id: 'advanced-firewall',
            name: 'Advanced Firewall',
            description: 'A sophisticated firewall program with adaptive defense mechanisms',
            category: 'programs',
            difficulty: 3,
            materials: [
                { itemId: 'base-firewall', quantity: 1 },
                { itemId: 'encryption-module', quantity: 2 },
                { itemId: 'adaptive-code', quantity: 1 }
            ],
            result: {
                itemId: 'advanced-firewall',
                quantity: 1,
                baseQuality: 70
            },
            requirements: {
                level: 5,
                skills: [
                    { skillId: 'basic_breach', minLevel: 3 },
                    { skillId: 'encryption_specialist', minLevel: 1 }
                ]
            }
        },
        {
            id: 'neural-enhancer',
            name: 'Neural Enhancer',
            description: 'Cybernetic enhancement that boosts cognitive processing',
            category: 'cybernetics',
            difficulty: 5,
            materials: [
                { itemId: 'neural-processor', quantity: 1 },
                { itemId: 'quantum-circuit', quantity: 2 },
                { itemId: 'bio-interface', quantity: 1 },
                { itemId: 'rare-metals', quantity: 3 }
            ],
            result: {
                itemId: 'neural-enhancer',
                quantity: 1,
                baseQuality: 80
            },
            requirements: {
                level: 10,
                skills: [
                    { skillId: 'neural_interface', minLevel: 1 }
                ]
            }
        }
        // Add more recipes as needed
    ];

    static async craftItem(
        playerId: string,
        recipeId: string,
        experimentalMode: boolean = false
    ): Promise<CraftingResult> {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        const recipe = this.RECIPES.find(r => r.id === recipeId);
        if (!recipe) {
            throw new Error('Recipe not found');
        }

        // Verify requirements
        await this.verifyRequirements(player, recipe);

        // Check and consume materials
        await this.consumeMaterials(player, recipe);

        // Calculate crafting success and quality
        const craftingResult = await this.calculateCraftingResult(
            player,
            recipe,
            experimentalMode
        );

        if (craftingResult.success) {
            // Add crafted item to inventory
            await this.addCraftedItem(
                player,
                recipe.result.itemId,
                recipe.result.quantity,
                craftingResult.quality
            );

            // Grant crafting experience
            await this.grantCraftingExperience(player, recipe);
        }

        return craftingResult;
    }

    private static async verifyRequirements(
        player: any,
        recipe: CraftingRecipe
    ) {
        // Check level requirement
        if (recipe.requirements.level && player.level < recipe.requirements.level) {
            throw new Error('Insufficient level to craft this item');
        }

        // Check skill requirements
        if (recipe.requirements.skills) {
            for (const skillReq of recipe.requirements.skills) {
                const playerSkill = await prisma.playerSkill.findFirst({
                    where: {
                        playerId: player.tokenId,
                        skillId: skillReq.skillId
                    }
                });

                if (!playerSkill || playerSkill.level < skillReq.minLevel) {
                    throw new Error(`Required skill ${skillReq.skillId} not met`);
                }
            }
        }
    }

    private static async consumeMaterials(
        player: any,
        recipe: CraftingRecipe
    ) {
        for (const material of recipe.materials) {
            const inventory = await prisma.inventory.findFirst({
                where: {
                    playerId: player.tokenId,
                    itemId: material.itemId,
                    quantity: {
                        gte: material.quantity
                    }
                }
            });

            if (!inventory) {
                throw new Error(`Insufficient ${material.itemId}`);
            }

            await prisma.inventory.update({
                where: { id: inventory.id },
                data: {
                    quantity: inventory.quantity - material.quantity
                }
            });
        }
    }

    private static async calculateCraftingResult(
        player: any,
        recipe: CraftingRecipe,
        experimentalMode: boolean
    ): Promise<CraftingResult> {
        // Base success chance based on player skills and recipe difficulty
        let successChance = 0.7; // 70% base chance
        let qualityBonus = 0;

        // Add skill bonuses
        if (recipe.requirements.skills) {
            for (const skillReq of recipe.requirements.skills) {
                const playerSkill = await prisma.playerSkill.findFirst({
                    where: {
                        playerId: player.tokenId,
                        skillId: skillReq.skillId
                    }
                });

                if (playerSkill) {
                    successChance += (playerSkill.level - skillReq.minLevel) * 0.05;
                    qualityBonus += playerSkill.level * 2;
                }
            }
        }

        // Experimental mode increases both risk and reward
        if (experimentalMode) {
            successChance *= 0.8;
            qualityBonus *= 1.5;
        }

        // Generate random values for success and quality
        const entropy = randomBytes(2);
        const successRoll = entropy[0] / 255;
        const qualityRoll = entropy[1] / 255;

        const success = successRoll <= successChance;
        let quality = recipe.result.baseQuality;

        if (success) {
            // Calculate final quality
            quality += qualityBonus;
            quality += (qualityRoll * 20) - 10; // ±10 random variation
            quality = Math.min(Math.max(quality, 0), 100);

            return {
                success: true,
                quality,
                message: this.generateSuccessMessage(recipe.name, quality),
                item: {
                    id: recipe.result.itemId,
                    name: recipe.name,
                    quality
                }
            };
        }

        return {
            success: false,
            quality: 0,
            message: this.generateFailureMessage(recipe.name)
        };
    }

    private static async addCraftedItem(
        player: any,
        itemId: string,
        quantity: number,
        quality: number
    ) {
        await prisma.inventory.create({
            data: {
                playerId: player.tokenId,
                itemId,
                quantity,
                quality
            }
        });
    }

    private static async grantCraftingExperience(
        player: any,
        recipe: CraftingRecipe
    ) {
        const expGain = 10 * recipe.difficulty;
        
        await prisma.playerState.update({
            where: { tokenId: player.tokenId },
            data: {
                experience: player.experience + expGain
            }
        });

        // Also grant skill experience if applicable
        if (recipe.requirements.skills) {
            for (const skillReq of recipe.requirements.skills) {
                await prisma.playerSkill.updateMany({
                    where: {
                        playerId: player.tokenId,
                        skillId: skillReq.skillId
                    },
                    data: {
                        experience: {
                            increment: expGain / 2
                        }
                    }
                });
            }
        }
    }

    private static generateSuccessMessage(itemName: string, quality: number): string {
        let qualityTier = '';
        for (const [tier, { range }] of Object.entries(this.QUALITY_LEVELS)) {
            if (quality >= range[0] && quality <= range[1]) {
                qualityTier = tier;
                break;
            }
        }

        const successMessages = [
            `Successfully crafted ${itemName} with ${qualityTier.toLowerCase()} quality!`,
            `Your expertise yields a ${qualityTier.toLowerCase()} quality ${itemName}.`,
            `Crafting successful: Created ${itemName} (${qualityTier} Quality)`,
            `${itemName} crafted successfully. Quality: ${qualityTier}`
        ];

        return successMessages[Math.floor(Math.random() * successMessages.length)];
    }

    private static generateFailureMessage(itemName: string): string {
        const failureMessages = [
            `Crafting attempt failed: ${itemName} was not created.`,
            `The crafting process becomes unstable and fails.`,
            `A critical error occurs during crafting. Materials lost.`,
            `The components reject integration. Crafting failed.`
        ];

        return failureMessages[Math.floor(Math.random() * failureMessages.length)];
    }

    static async getAvailableRecipes(playerId: string): Promise<CraftingRecipe[]> {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(playerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        const playerSkills = await prisma.playerSkill.findMany({
            where: { playerId: player.tokenId }
        });

        return this.RECIPES.filter(recipe => {
            // Check level requirement
            if (recipe.requirements.level && player.level < recipe.requirements.level) {
                return false;
            }

            // Check skill requirements
            if (recipe.requirements.skills) {
                return recipe.requirements.skills.every(skillReq => {
                    const playerSkill = playerSkills.find(ps => ps.skillId === skillReq.skillId);
                    return playerSkill && playerSkill.level >= skillReq.minLevel;
                });
            }

            return true;
        });
    }
}
