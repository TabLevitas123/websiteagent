# AI Agent Token Creation dApp - Installation Guide

## System Requirements
- Node.js >= 16.0.0
- NPM >= 8.0.0
- Git
- Python >= 3.8 (for some build tools)
- Docker (optional, for containerization)

## Development Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/ai-agent-token-dapp.git
cd ai-agent-token-dapp
```

### 2. Install Dependencies

#### Frontend Setup
```bash
cd frontend
npm install
```

#### Smart Contract Setup
```bash
cd smart-contracts
npm install
```

#### Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Configuration
Create `.env` files in each directory:

#### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_CHAIN_ID=1
REACT_APP_INFURA_ID=your_infura_id
```

#### Backend (.env)
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/ai-agent-tokens
JWT_SECRET=your_jwt_secret
INFURA_PROJECT_ID=your_infura_id
INFURA_PROJECT_SECRET=your_infura_secret
```

#### Smart Contracts (.env)
```
PRIVATE_KEY=your_private_key
INFURA_PROJECT_ID=your_infura_id
ETHERSCAN_API_KEY=your_etherscan_key
```

### 4. Database Setup
```bash
# Install MongoDB (Ubuntu)
sudo apt-get update
sudo apt-get install -y mongodb

# Start MongoDB service
sudo systemctl start mongodb
```

### 5. Running the Development Environment

#### Start Frontend
```bash
cd frontend
npm run dev
```

#### Start Backend
```bash
cd backend
npm run dev
```

#### Deploy Contracts (Local Network)
```bash
cd smart-contracts
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

## Production Deployment

### Building for Production

#### Frontend Build
```bash
cd frontend
npm run build
```

#### Backend Build
```bash
cd backend
npm run build
```

### Docker Deployment
```bash
# Build containers
docker-compose build

# Run the stack
docker-compose up -d
```

## Common Issues and Solutions

### Network Configuration
Ensure your network configuration matches the smart contract deployment network:

- Ethereum Mainnet: Chain ID 1
- Goerli Testnet: Chain ID 5
- Local Hardhat: Chain ID 31337

### Troubleshooting
1. Clear node modules and reinstall if facing dependency issues:
```bash
rm -rf node_modules
npm install
```

2. Reset Hardhat network if facing contract deployment issues:
```bash
npx hardhat clean
npx hardhat node --reset
```