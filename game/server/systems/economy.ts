import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

interface MarketItem {
    id: string;
    name: string;
    type: string;
    rarity: string;
    basePrice: number;
    currentPrice: number;
    description: string;
    effects: {
        [key: string]: number;
    };
    requirements?: {
        level?: number;
        skills?: string[];
    };
}

interface TradeOffer {
    id: string;
    sellerId: string;
    itemId: string;
    quantity: number;
    pricePerUnit: number;
    expiryTime: Date;
}

export class EconomySystem {
    private static readonly ITEM_TYPES = {
        WEAPON: 'weapon',
        ARMOR: 'armor',
        CONSUMABLE: 'consumable',
        PROGRAM: 'program',
        COMPONENT: 'component',
        DATA: 'data'
    };

    private static readonly RARITY_LEVELS = {
        COMMON: { modifier: 1, color: '#FFFFFF' },
        UNCOMMON: { modifier: 1.5, color: '#00FF00' },
        RARE: { modifier: 2.5, color: '#0000FF' },
        EPIC: { modifier: 4, color: '#800080' },
        LEGENDARY: { modifier: 7, color: '#FFA500' }
    };

    private static readonly MARKET_ITEMS: MarketItem[] = [
        {
            id: 'quantum-processor',
            name: 'Quantum Processor',
            type: 'component',
            rarity: 'rare',
            basePrice: 1000,
            currentPrice: 1000,
            description: 'Advanced processing unit that enhances hacking capabilities',
            effects: {
                hackingSpeed: 15,
                processingPower: 25
            },
            requirements: {
                level: 10,
                skills: ['advanced_computing']
            }
        },
        {
            id: 'neural-implant',
            name: 'Neural Implant',
            type: 'armor',
            rarity: 'epic',
            basePrice: 2500,
            currentPrice: 2500,
            description: 'Cybernetic enhancement that improves cognitive functions',
            effects: {
                intelligence: 30,
                memoryCapacity: 20,
                reactionTime: 15
            },
            requirements: {
                level: 15,
                skills: ['cybernetics']
            }
        },
        // Add more items as needed
    ];

    static async initializeMarket() {
        // Initialize market with base items
        for (const item of this.MARKET_ITEMS) {
            await prisma.marketItem.upsert({
                where: { id: item.id },
                update: {},
                create: {
                    ...item,
                    lastUpdate: new Date()
                }
            });
        }
    }

    static async updatePrices() {
        const items = await prisma.marketItem.findMany();
        const trades = await prisma.trade.findMany({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            }
        });

        for (const item of items) {
            const itemTrades = trades.filter(t => t.itemId === item.id);
            if (itemTrades.length > 0) {
                const avgPrice = itemTrades.reduce((sum, trade) => 
                    sum + trade.pricePerUnit, 0) / itemTrades.length;
                
                // Adjust price based on supply and demand
                const priceChange = this.calculatePriceChange(item, itemTrades.length);
                const newPrice = Math.max(
                    item.basePrice * 0.5,
                    Math.min(item.basePrice * 2, avgPrice + priceChange)
                );

                await prisma.marketItem.update({
                    where: { id: item.id },
                    data: {
                        currentPrice: newPrice,
                        lastUpdate: new Date()
                    }
                });
            }
        }
    }

    static async createTradeOffer(
        sellerId: string,
        itemId: string,
        quantity: number,
        pricePerUnit: number
    ) {
        const player = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(sellerId) }
        });

        if (!player) {
            throw new Error('Player not found');
        }

        // Verify player has the item
        const inventory = await prisma.inventory.findFirst({
            where: {
                playerId: parseInt(sellerId),
                itemId: itemId,
                quantity: {
                    gte: quantity
                }
            }
        });

        if (!inventory) {
            throw new Error('Insufficient items in inventory');
        }

        // Create trade offer
        const offer = await prisma.tradeOffer.create({
            data: {
                sellerId: parseInt(sellerId),
                itemId,
                quantity,
                pricePerUnit,
                expiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                status: 'active'
            }
        });

        // Lock the items
        await prisma.inventory.update({
            where: { id: inventory.id },
            data: {
                quantity: inventory.quantity - quantity,
                lockedQuantity: (inventory.lockedQuantity || 0) + quantity
            }
        });

        return offer;
    }

    static async acceptTradeOffer(
        buyerId: string,
        offerId: string
    ) {
        const offer = await prisma.tradeOffer.findUnique({
            where: { id: offerId }
        });

        if (!offer || offer.status !== 'active') {
            throw new Error('Invalid or expired offer');
        }

        const buyer = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(buyerId) }
        });

        if (!buyer) {
            throw new Error('Buyer not found');
        }

        const totalCost = offer.quantity * offer.pricePerUnit;

        if (buyer.credits < totalCost) {
            throw new Error('Insufficient credits');
        }

        // Execute trade
        await prisma.$transaction(async (prisma) => {
            // Update buyer's inventory and credits
            await prisma.playerState.update({
                where: { tokenId: parseInt(buyerId) },
                data: { credits: buyer.credits - totalCost }
            });

            await this.addToInventory(buyerId, offer.itemId, offer.quantity);

            // Update seller's credits
            await prisma.playerState.update({
                where: { tokenId: offer.sellerId },
                data: {
                    credits: {
                        increment: totalCost
                    }
                }
            });

            // Update offer status
            await prisma.tradeOffer.update({
                where: { id: offerId },
                data: { status: 'completed' }
            });

            // Record trade
            await prisma.trade.create({
                data: {
                    sellerId: offer.sellerId,
                    buyerId: parseInt(buyerId),
                    itemId: offer.itemId,
                    quantity: offer.quantity,
                    pricePerUnit: offer.pricePerUnit
                }
            });
        });

        return {
            success: true,
            message: 'Trade completed successfully',
            cost: totalCost
        };
    }

    private static calculatePriceChange(item: MarketItem, tradeVolume: number): number {
        const volatility = 0.1; // 10% base volatility
        const volumeImpact = Math.log10(tradeVolume + 1) * 0.05; // 5% impact per order of magnitude
        const randomFactor = (Math.random() - 0.5) * 0.1; // ±5% random variation

        return item.basePrice * (volatility + volumeImpact + randomFactor);
    }

    private static async addToInventory(
        playerId: string,
        itemId: string,
        quantity: number
    ) {
        const inventory = await prisma.inventory.findFirst({
            where: {
                playerId: parseInt(playerId),
                itemId
            }
        });

        if (inventory) {
            await prisma.inventory.update({
                where: { id: inventory.id },
                data: { quantity: inventory.quantity + quantity }
            });
        } else {
            await prisma.inventory.create({
                data: {
                    playerId: parseInt(playerId),
                    itemId,
                    quantity
                }
            });
        }
    }

    static async getMarketPrices() {
        const items = await prisma.marketItem.findMany({
            orderBy: { currentPrice: 'desc' }
        });

        return items.map(item => ({
            ...item,
            priceChange: ((item.currentPrice - item.basePrice) / item.basePrice * 100).toFixed(2)
        }));
    }

    static async getPlayerTrades(playerId: string) {
        return await prisma.trade.findMany({
            where: {
                OR: [
                    { sellerId: parseInt(playerId) },
                    { buyerId: parseInt(playerId) }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Last 50 trades
        });
    }
}
