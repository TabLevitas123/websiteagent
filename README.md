# Agent Launchpad

A decentralized application (dApp) that enables users to launch their own Agents on the Solana blockchain.

## Overview

This platform provides a simple and efficient way to create and deploy Solana Agents. Users can launch their agents with just a few clicks, making agent creation accessible to everyone.

## Features

- One-click agent deployment on Solana
- User-friendly interface
- Secure agent creation process
- Fixed pricing structure: 0.006 ETH per agent launch
- Real-time transaction status
- Automated agent verification

## Getting Started

### Prerequisites

- Solana wallet (Phantom, Solflare, etc.)
- ETH wallet for payment
- Node.js >= 16.0.0

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd websiteagent
```

2. Install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Start the application
```bash
# Start backend
cd backend
npm start

# Start frontend (in a new terminal)
cd frontend
npm start
```

## Usage

1. Connect your ETH wallet (for payment)
2. Connect your Solana wallet (for agent deployment)
3. Configure your agent parameters
4. Pay the launch fee (0.006 ETH)
5. Confirm the transaction
6. Your agent will be deployed on the Solana blockchain

## Technical Architecture

- Frontend: React with TypeScript
- Backend: Node.js with Express
- Blockchain: Solana
- Payment: ETH for gas fees

## Security

- All transactions are verified on-chain
- Smart contract audited for security
- Automated security checks for agent deployment

## Support

For support, please open an issue in the repository or contact our support team.

## License

[License Type] - see LICENSE.md for details
