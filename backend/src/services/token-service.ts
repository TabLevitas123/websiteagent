import { ethers } from 'ethers';
import ApiService from './api.service';
import { logger } from '@/utils/logger';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';
import AIAgentTokenABI from '@/contracts/abis/AIAgentToken.json';
import { RetryConfig, TokenCreationParams, TokenInfo, TokenMetrics } from '@/types';
import { validateTokenParams } from '@/utils/validation';
import { calculateGasEstimate } from '@/utils/ethereum';

export class TokenService extends ApiService {
  private provider: ethers.providers.Web3Provider;
  private factoryAddress: string;

  constructor(
    provider: ethers.providers.Web3Provider,
    factoryAddress: string,
    config: {
      baseURL: string;
      timeout?: number;
      retryConfig?: RetryConfig;
    }
  ) {
    super(config);
    this.provider = provider;
    this.factoryAddress = factoryAddress;

    logger.info('TokenService initialized', {
      factoryAddress,
      network: provider.network.name,
    });
  }

  /**
   * Create a new AI Agent token
   * @param params Token creation parameters
   * @returns Created token information
   */
  public async createToken(params: TokenCreationParams): Promise<TokenInfo> {
    try {
      // Validate parameters
      validateTokenParams(params);

      // Get signer and factory contract
      const signer = this.provider.getSigner();
      const factory = new ethers.Contract(
        this.factoryAddress,
        TokenFactoryABI,
        signer
      );

      // Estimate gas and get optimal gas price
      const gasEstimate = await calculateGasEstimate(
        factory,
        'createToken',
        [
          params.name,
          params.symbol,
          ethers.utils.parseUnits(params.initialSupply.toString(), 18),
        ]
      );

      logger.info('Creating token', {
        params,
        gasEstimate,
      });

      // Create token with estimated gas
      const tx = await factory.createToken(
        params.name,
        params.symbol,
        ethers.utils.parseUnits(params.initialSupply.toString(), 18),
        {
          gasLimit: gasEstimate.gasLimit,
          gasPrice: gasEstimate.gasPrice,
        }
      );

      logger.debug('Token creation transaction sent', {
        hash: tx.hash,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      const event = receipt.events?.find(
        (e: any) => e.event === 'TokenCreated'
      );

      if (!event) {
        throw new Error('Token creation event not found in transaction receipt');
      }

      const [owner, tokenAddress, tokenName, tokenSymbol, tokenId] = event.args;
      const tokenInfo: TokenInfo = {
        address: tokenAddress,
        name: tokenName,
        symbol: tokenSymbol,
        id: tokenId.toString(),
        owner,
        createdAt: new Date().toISOString(),
        deploymentTx: tx.hash,
      };

      // Store token info in database via API
      await this.post('/api/tokens', tokenInfo);

      logger.info('Token created successfully', {
        tokenInfo,
        transactionHash: tx.hash,
      });

      return tokenInfo;
    } catch (error) {
      logger.error('Token creation failed', {
        error,
        params,
      });
      throw error;
    }
  }

  /**
   * Get token information by address
   * @param address Token contract address
   * @returns Token information and metrics
   */
  public async getTokenInfo(address: string): Promise<TokenInfo & TokenMetrics> {
    try {
      // Validate address
      if (!ethers.utils.isAddress(address)) {
        throw new Error('Invalid token address');
      }

      // Get token contract instance
      const token = new ethers.Contract(
        address,
        AIAgentTokenABI,
        this.provider
      );

      // Fetch on-chain data
      const [
        name,
        symbol,
        totalSupply,
        decimals,
        owner,
        isActive,
      ] = await Promise.all([
        token.name(),
        token.symbol(),
        token.totalSupply(),
        token.decimals(),
        token.owner(),
        token.isActive ? token.isActive() : Promise.resolve(true),
      ]);

      // Fetch token metrics from API
      const metrics = await this.get<TokenMetrics>(`/api/tokens/${address}/metrics`);

      logger.debug('Token info retrieved', {
        address,
        name,
        symbol,
        metrics,
      });

      return {
        address,
        name,
        symbol,
        owner,
        isActive,
        totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
        decimals: decimals.toString(),
        ...metrics,
      };
    } catch (error) {
      logger.error('Failed to get token info', {
        error,
        address,
      });
      throw error;
    }
  }

  /**
   * Get all tokens owned by an address
   * @param owner Owner address
   * @returns Array of owned tokens
   */
  public async getTokensByOwner(owner: string): Promise<TokenInfo[]> {
    try {
      // Validate address
      if (!ethers.utils.isAddress(owner)) {
        throw new Error('Invalid owner address');
      }

      // Get factory contract
      const factory = new ethers.Contract(
        this.factoryAddress,
        TokenFactoryABI,
        this.provider
      );

      // Get token IDs owned by address
      const tokenIds = await factory.getTokensByOwner(owner);

      // Get token info for each ID
      const tokens = await Promise.all(
        tokenIds.map(async (tokenId: string) => {
          const tokenAddress = await factory.tokenInfo(tokenId);
          return this.getTokenInfo(tokenAddress);
        })
      );

      logger.debug('Retrieved tokens by owner', {
        owner,
        tokenCount: tokens.length,
      });

      return tokens;
    } catch (error) {
      logger.error('Failed to get tokens by owner', {
        error,
        owner,
      });
      throw error;
    }
  }

  /**
   * Get token metrics and analytics
   * @param address Token contract address
   * @returns Token metrics and analytics
   */
  public async getTokenMetrics(address: string): Promise<TokenMetrics> {
    try {
      // Validate address
      if (!ethers.utils.isAddress(address)) {
        throw new Error('Invalid token address');
      }

      // Get token contract
      const token = new ethers.Contract(
        address,
        AIAgentTokenABI,
        this.provider
      );

      // Fetch token metrics from blockchain
      const [
        totalSupply,
        holders,
        transactions,
      ] = await Promise.all([
        token.totalSupply(),
        this.getHolderCount(address),
        this.getTransactionCount(address),
      ]);

      // Calculate additional metrics
      const metrics: TokenMetrics = {
        totalSupply: totalSupply.toString(),
        holderCount: holders,
        transactionCount: transactions,
        price: await this.getTokenPrice(address),
        volume24h: await this.get24hVolume(address),
        marketCap: await this.getMarketCap(address),
        updatedAt: new Date().toISOString(),
      };

      // Store metrics in database
      await this.post(`/api/tokens/${address}/metrics`, metrics);

      logger.debug('Token metrics updated', {
        address,
        metrics,
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to get token metrics', {
        error,
        address,
      });
      throw error;
    }
  }

  /**
   * Get token holder count
   * @param address Token contract address
   * @returns Number of unique token holders
   */
  private async getHolderCount(address: string): Promise<number> {
    // Query transfer events to get unique addresses
    const token = new ethers.Contract(
      address,
      AIAgentTokenABI,
      this.provider
    );

    const filter = token.filters.Transfer();
    const events = await token.queryFilter(filter);
    const uniqueAddresses = new Set<string>();

    events.forEach(event => {
      uniqueAddresses.add(event.args.from);
      uniqueAddresses.add(event.args.to);
    });

    // Remove zero address
    uniqueAddresses.delete(ethers.constants.AddressZero);

    return uniqueAddresses.size;
  }

  /**
   * Get total transaction count
   * @param address Token contract address
   * @returns Number of token transactions
   */
  private async getTransactionCount(address: string): Promise<number> {
    const token = new ethers.Contract(
      address,
      AIAgentTokenABI,
      this.provider
    );

    const filter = token.filters.Transfer();
    const events = await token.queryFilter(filter);
    return events.length;
  }

  /**
   * Get token price in ETH
   * @param address Token contract address
   * @returns Current token price
   */
  private async getTokenPrice(address: string): Promise<string> {
    // TODO: Implement price fetching from DEX or price feed
    return '0';
  }

  /**
   * Get 24h trading volume
   * @param address Token contract address
   * @returns 24h trading volume
   */
  private async get24hVolume(address: string): Promise<string> {
    // TODO: Implement volume calculation from DEX or analytics API
    return '0';
  }

  /**
   * Get token market cap
   * @param address Token contract address
   * @returns Current market cap
   */
  private async getMarketCap(address: string): Promise<string> {
    // TODO: Implement market cap calculation
    return '0';
  }
}