import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ethers } from 'ethers';

const SOLANA_NETWORK = 'devnet'; // Change to 'mainnet-beta' for production
const SOLANA_ENDPOINT = `https://api.${SOLANA_NETWORK}.solana.com`;
const PAYMENT_AMOUNT = '0.006'; // ETH
const PAYMENT_ADDRESS = '0x...'; // Replace with actual payment address

export interface AgentData {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface PaymentVerification {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class AgentService {
  private connection: Connection;
  private provider: ethers.BrowserProvider | null = null;

  constructor() {
    this.connection = new Connection(SOLANA_ENDPOINT);
  }

  async initializeProvider(): Promise<void> {
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      throw new Error('Ethereum provider not found');
    }
  }

  async verifyPayment(payerAddress: string): Promise<PaymentVerification> {
    try {
      if (!this.provider) {
        await this.initializeProvider();
      }

      if (!this.provider) {
        throw new Error('Failed to initialize Ethereum provider');
      }

      const signer = await this.provider.getSigner();
      const amount = ethers.parseEther(PAYMENT_AMOUNT);

      // Create and send the transaction
      const tx = await signer.sendTransaction({
        to: PAYMENT_ADDRESS,
        value: amount,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction failed');
      }

      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('Payment verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed',
      };
    }
  }

  async createAgent(
    agentData: AgentData,
    payerAddress: string,
    solanaPublicKey: string
  ): Promise<{ agentAddress: string; signature: string }> {
    try {
      // First verify the payment
      const paymentStatus = await this.verifyPayment(payerAddress);
      if (!paymentStatus.success) {
        throw new Error(paymentStatus.error || 'Payment verification failed');
      }

      // Create Solana token (agent)
      const payer = new PublicKey(solanaPublicKey);
      const mintAuthority = new PublicKey(solanaPublicKey);
      const freezeAuthority = new PublicKey(solanaPublicKey);

      // Generate a new keypair for the agent
      const agentKeypair = Keypair.generate();

      // Create agent with specified decimals
      const agent = await Token.createMint(
        this.connection,
        payer,
        mintAuthority,
        freezeAuthority,
        agentData.decimals,
        TOKEN_PROGRAM_ID
      );

      // Create associated token account
      const agentAccount = await agent.createAssociatedTokenAccount(payer);

      // Mint initial supply
      const initialSupply = ethers.parseUnits(agentData.totalSupply, agentData.decimals);
      await agent.mintTo(
        agentAccount,
        mintAuthority,
        [],
        initialSupply.toString()
      );

      // Store metadata about the agent
      await this.storeAgentMetadata(agent.publicKey.toString(), {
        name: agentData.name,
        symbol: agentData.symbol,
        paymentTx: paymentStatus.transactionHash!,
        creator: solanaPublicKey,
        createdAt: new Date().toISOString(),
      });

      return {
        agentAddress: agent.publicKey.toString(),
        signature: 'Transaction successful'
      };
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  private async storeAgentMetadata(
    agentAddress: string,
    metadata: {
      name: string;
      symbol: string;
      paymentTx: string;
      creator: string;
      createdAt: string;
    }
  ) {
    try {
      const response = await fetch('/api/agents/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentAddress,
          ...metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to store agent metadata');
      }

      return await response.json();
    } catch (error) {
      console.error('Error storing agent metadata:', error);
      // Don't throw here - we don't want to fail the agent creation if metadata storage fails
    }
  }

  async getAgentInfo(agentAddress: string) {
    try {
      const agentPublicKey = new PublicKey(agentAddress);
      const agent = new Token(
        this.connection,
        agentPublicKey,
        TOKEN_PROGRAM_ID,
        Keypair.generate() // This should be the actual payer in production
      );

      const agentInfo = await agent.getMintInfo();
      
      // Fetch metadata
      const metadata = await this.getAgentMetadata(agentAddress);

      return {
        ...agentInfo,
        metadata,
      };
    } catch (error) {
      console.error('Error getting agent info:', error);
      throw error;
    }
  }

  private async getAgentMetadata(agentAddress: string) {
    try {
      const response = await fetch(`/api/agents/metadata/${agentAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent metadata');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching agent metadata:', error);
      return null;
    }
  }
}
