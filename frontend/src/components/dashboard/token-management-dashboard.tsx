import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { motion } from 'framer-motion';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { 
  BarChart3,
  Coins,
  History,
  Settings,
  Users,
  Activity
} from 'lucide-react';
import TokenList from './TokenList';
import TokenAnalytics from './TokenAnalytics';
import TransactionHistory from './TransactionHistory';
import TokenSettings from './TokenSettings';

const TokenDashboard = () => {
  const { account } = useWeb3();
  const { getTokensByOwner } = useTokenFactory();
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchTokens = async () => {
      if (account) {
        try {
          const userTokens = await getTokensByOwner(account);
          setTokens(userTokens);
        } catch (error) {
          console.error('Failed to fetch tokens:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchTokens();
  }, [account, getTokensByOwner]);

  const dashboardSections = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Activity className="w-4 h-4" />
    },
    {
      id: 'tokens',
      label: 'Tokens',
      icon: <Coins className="w-4 h-4" />
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'history',
      label: 'History',
      icon: <History className="w-4 h-4" />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Token Management</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>Connected: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}</span>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-5 gap-4">
            {dashboardSections.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="flex items-center space-x-2"
              >
                {section.icon}
                <span>{section.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TokenOverviewCard
                title="Total Tokens"
                value={tokens.length}
                icon={<Coins className="w-6 h-6" />}
              />
              <TokenOverviewCard
                title="Total Value Locked"
                value="$1.2M"
                icon={<BarChart3 className="w-6 h-6" />}
              />
              <TokenOverviewCard
                title="Active Users"
                value="1.5k"
                icon={<Users className="w-6 h-6" />}
              />
            </div>
          </TabsContent>

          <TabsContent value="tokens">
            <TokenList tokens={tokens} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="analytics">
            <TokenAnalytics tokens={tokens} />
          </TabsContent>

          <TabsContent value="history">
            <TransactionHistory />
          </TabsContent>

          <TabsContent value="settings">
            <TokenSettings />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

const TokenOverviewCard = ({ title, value, icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        {title}
      </CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

export default TokenDashboard;