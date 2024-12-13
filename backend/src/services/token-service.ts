import { TokenConfig, TokenInfo, TokenMetrics } from '../types';
import { validateTokenData } from '../utils/validation';
import logger from '../utils/logger';
import { providers, Contract, Wallet, BigNumber } from 'ethers';

export class TokenService {
  private provider: providers.JsonRpcProvider;
  private wallet: Wallet;
  private contract: Contract;
  private config: Required<TokenConfig>;

  constructor(config: TokenConfig) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl,
      rpcUrl: config.rpcUrl,
      network: config.network,
      privateKey: config.privateKey,
      contractAddress: config.contractAddress,
      contractAbi: config.contractAbi,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.provider = new providers.JsonRpcProvider(this.config.rpcUrl);
    this.wallet = new Wallet(this.config.privateKey, this.provider);
    this.contract = new Contract(
      this.config.contractAddress,
      this.config.contractAbi,
      this.wallet
    );
  }

  async createToken(tokenInfo: Partial<TokenInfo>): Promise<TokenInfo> {
    try {
      validateTokenData(tokenInfo);

      const tx = await this.contract.createToken(
        tokenInfo.name,
        tokenInfo.symbol,
        tokenInfo.decimals,
        tokenInfo.totalSupply
      );
      const receipt = await tx.wait();

      const newToken: TokenInfo = {
        id: receipt.events[0].args.tokenId.toString(),
        name: tokenInfo.name!,
        symbol: tokenInfo.symbol!,
        decimals: tokenInfo.decimals!,
        totalSupply: tokenInfo.totalSupply!,
        owner: this.wallet.address,
        status: 'active',
        createdAt: new Date(),
        metadata: tokenInfo.metadata
      };

      logger.info(`Created token ${newToken.id}`);
      return newToken;
    } catch (error) {
      logger.error(`Error creating token: ${error}`);
      throw error;
    }
  }

  async getToken(tokenId: string): Promise<TokenInfo> {
    try {
      const tokenData = await this.contract.getToken(tokenId);
      return {
        id: tokenId,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals.toNumber(),
        totalSupply: tokenData.totalSupply.toString(),
        owner: tokenData.owner,
        status: tokenData.active ? 'active' : 'inactive',
        createdAt: new Date(tokenData.createdAt.toNumber() * 1000),
        metadata: tokenData.metadata || {}
      };
    } catch (error) {
      logger.error(`Error getting token ${tokenId}: ${error}`);
      throw error;
    }
  }

  async updateToken(tokenId: string, updates: Partial<TokenInfo>): Promise<TokenInfo> {
    try {
      validateTokenData(updates);
      const tx = await this.contract.updateToken(tokenId, updates);
      await tx.wait();

      const updatedToken = await this.getToken(tokenId);
      logger.info(`Updated token ${tokenId}`);
      return updatedToken;
    } catch (error) {
      logger.error(`Error updating token ${tokenId}: ${error}`);
      throw error;
    }
  }

  async getTokenMetrics(tokenId: string): Promise<TokenMetrics> {
    try {
      const [holders, transactions, volume24h, price] = await Promise.all([
        this.contract.getHolderCount(tokenId),
        this.contract.getTransactionCount(tokenId),
        this.getVolume24h(tokenId),
        this.getTokenPrice(tokenId)
      ]);

      return {
        holders: holders.toNumber(),
        transactions: transactions.toNumber(),
        volume24h: volume24h.toString(),
        price: price.toString()
      };
    } catch (error) {
      logger.error(`Error getting metrics for token ${tokenId}: ${error}`);
      throw error;
    }
  }

  private async getVolume24h(tokenId: string): Promise<BigNumber> {
    const filter = this.contract.filters.Transfer(null, null, null);
    const currentBlock = await this.provider.getBlock('latest');
    const oneDayAgo = currentBlock.timestamp - 24 * 60 * 60;
    
    const events = await this.contract.queryFilter(filter, oneDayAgo, 'latest');
    const volume = events.reduce((total, event) => {
      const args = event.args as { tokenId: BigNumber; value: BigNumber };
      if (args && args.tokenId.toString() === tokenId) {
        return total.add(args.value);
      }
      return total;
    }, BigNumber.from(0));

    return volume;
  }

  private async getTokenPrice(tokenId: string): Promise<BigNumber> {
    try {
      const price = await this.contract.getTokenPrice(tokenId);
      return price;
    } catch (error) {
      logger.error(`Error getting price for token ${tokenId}: ${error}`);
      return BigNumber.from(0);
    }
  }
}