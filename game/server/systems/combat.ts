import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface CombatStats {
    intelligence: number;
    resilience: number;
    influence: number;
    stealth: number;
    level: number;
}

interface CombatResult {
    success: boolean;
    damage: number;
    criticalHit: boolean;
    message: string;
    rewards?: {
        experience: number;
        items?: string[];
    };
}

export class CombatSystem {
    private static readonly BASE_DAMAGE = 10;
    private static readonly CRIT_MULTIPLIER = 2;
    private static readonly DEFENSE_FACTOR = 0.2;

    static async initiateCombat(
        attackerId: string,
        defenderId: string,
        attackType: 'direct' | 'stealth' | 'virus'
    ): Promise<CombatResult> {
        const attacker = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(attackerId) }
        });

        const defender = await prisma.playerState.findUnique({
            where: { tokenId: parseInt(defenderId) }
        });

        if (!attacker || !defender) {
            throw new Error('Combat participants not found');
        }

        // Calculate combat modifiers based on attack type
        const modifiers = this.getCombatModifiers(attackType, attacker.stats, defender.stats);

        // Generate entropy for critical hits using blockchain data
        const entropy = randomBytes(1)[0] / 255; // Random number between 0 and 1
        const criticalHit = entropy > 0.9; // 10% chance of critical hit

        // Calculate base damage
        let damage = this.BASE_DAMAGE * modifiers.attackMod;
        damage *= (1 - (defender.stats.resilience * this.DEFENSE_FACTOR));

        if (criticalHit) {
            damage *= this.CRIT_MULTIPLIER;
        }

        // Round damage to nearest integer
        damage = Math.round(damage);

        // Determine if attack was successful
        const success = modifiers.successChance > (entropy * 100);

        // Generate combat message
        const message = this.generateCombatMessage(
            attackType,
            success,
            criticalHit,
            damage,
            attacker.name,
            defender.name
        );

        // Calculate rewards if attack was successful
        const rewards = success ? {
            experience: Math.round(25 * defender.stats.level * modifiers.attackMod),
            items: this.generateLoot(defender.stats.level, entropy)
        } : undefined;

        return {
            success,
            damage: success ? damage : 0,
            criticalHit,
            message,
            rewards
        };
    }

    private static getCombatModifiers(
        attackType: string,
        attackerStats: CombatStats,
        defenderStats: CombatStats
    ) {
        let attackMod = 1;
        let successChance = 70; // Base 70% chance

        switch (attackType) {
            case 'direct':
                // Direct attacks favor influence and resilience
                attackMod *= (attackerStats.influence / 100) + 1;
                successChance += (attackerStats.resilience - defenderStats.resilience) * 2;
                break;

            case 'stealth':
                // Stealth attacks favor stealth and intelligence
                attackMod *= (attackerStats.stealth / 100) + 1;
                successChance += (attackerStats.intelligence - defenderStats.intelligence) * 2;
                break;

            case 'virus':
                // Virus attacks favor intelligence and influence
                attackMod *= (attackerStats.intelligence / 100) + 1;
                successChance += (attackerStats.influence - defenderStats.influence) * 2;
                break;
        }

        // Cap success chance between 10% and 90%
        successChance = Math.min(Math.max(successChance, 10), 90);

        return { attackMod, successChance };
    }

    private static generateCombatMessage(
        attackType: string,
        success: boolean,
        criticalHit: boolean,
        damage: number,
        attackerName: string,
        defenderName: string
    ): string {
        const attackDescriptions = {
            direct: {
                success: [
                    "launches a brutal cyber-assault",
                    "executes a direct memory breach",
                    "deploys aggressive security protocols"
                ],
                failure: [
                    "attempts a frontal assault but meets strong resistance",
                    "fails to breach the primary defenses",
                    "encounters an unexpected firewall"
                ]
            },
            stealth: {
                success: [
                    "bypasses security through a hidden backdoor",
                    "executes a silent system infiltration",
                    "performs a ghost protocol breach"
                ],
                failure: [
                    "is detected by advanced security systems",
                    "triggers a silent alarm during infiltration",
                    "leaves traces in the security logs"
                ]
            },
            virus: {
                success: [
                    "deploys a devastating polymorphic virus",
                    "infects core systems with malicious code",
                    "releases a cascade of data corruption"
                ],
                failure: [
                    "virus is quarantined by antivirus protocols",
                    "malicious code fails to compile",
                    "infection attempt is neutralized"
                ]
            }
        };

        const descriptions = attackDescriptions[attackType as keyof typeof attackDescriptions];
        const actionPool = success ? descriptions.success : descriptions.failure;
        const action = actionPool[Math.floor(Math.random() * actionPool.length)];

        let message = `${attackerName} ${action}`;
        
        if (success) {
            message += ` against ${defenderName}`;
            if (criticalHit) {
                message += ` [CRITICAL HIT: ${damage} damage]`;
            } else {
                message += ` [${damage} damage]`;
            }
        }

        return message;
    }

    private static generateLoot(defenderLevel: number, entropy: number): string[] {
        const loot: string[] = [];
        const lootTable = [
            "Encrypted Data Fragment",
            "Neural Enhancement Module",
            "Quantum Encryption Key",
            "System Access Token",
            "Advanced Firewall Patch",
            "Memory Optimization Routine",
            "Virus Definition Update",
            "Security Clearance Badge",
            "Protocol Override Script",
            "Emergency Backup Drive"
        ];

        // Chance to get loot based on defender level and entropy
        const lootChance = (defenderLevel * 5 + entropy * 100) / 100;
        if (lootChance > 0.7) { // 70% threshold for loot
            const numItems = Math.floor(entropy * 3) + 1; // 1-3 items
            for (let i = 0; i < numItems; i++) {
                const itemIndex = Math.floor(entropy * lootTable.length);
                loot.push(lootTable[itemIndex]);
            }
        }

        return loot;
    }
}
