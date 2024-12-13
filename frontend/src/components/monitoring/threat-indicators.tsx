import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Server,
  Users,
} from 'lucide-react';

interface ThreatData {
  timestamp: string;
  threatLevel: number;
  activeThreats: number;
  mitigatedThreats: number;
}

interface ThreatDistribution {
  name: string;
  value: number;
  color: string;
}

interface RiskScore {
  category: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

const ThreatIndicators = () => {
  const [threatData, setThreatData] = useState<ThreatData[]>([]);
  const [threatDistribution, setThreatDistribution] = useState<ThreatDistribution[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated data - would be fetched from API in production
    const mockThreatData: ThreatData[] = Array.from({ length: 24 }, (_, i) => ({
      timestamp: `${i}:00`,
      threatLevel: Math.floor(Math.random() * 100),
      activeThreats: Math.floor(Math.random() * 20),
      mitigatedThreats: Math.floor(Math.random() * 15),
    }));

    const mockDistribution: ThreatDistribution[] = [
      { name: 'Network', value: 35, color: '#0088FE' },
      { name: 'Application', value: 25, color: '#00C49F' },
      { name: 'Infrastructure', value: 20, color: '#FFBB28' },
      { name: 'Data', value: 20, color: '#FF8042' },
    ];

    const mockRiskScores: RiskScore[] = [
      {
        category: 'Overall',
        score: 75,
        trend: 'down',
        change: 5.2,
      },
      {
        category: 'Network',
        score: 82,
        trend: 'up',
        change: 3.1,
      },
      {
        category: 'Application',
        score: 68,
        trend: 'stable',
        change: 0.5,
      },
      {
        category: 'Data',
        score: 71,
        trend: 'down',
        change: 2.8,
      },
    ];

    setThreatData(mockThreatData);
    setThreatDistribution(mockDistribution);
    setRiskScores(mockRiskScores);
    setIsLoading(false);
  }, []);

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    } else if (trend === 'down') {
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    }
    return <Activity className="w-4 h-4 text-yellow-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Risk Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {riskScores.map((risk, index) => (
          <motion.div
            key={risk.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-500">{risk.category} Risk</div>
                  {getTrendIcon(risk.trend, risk.change)}
                </div>
                <div className="flex items-end justify-between">
                  <div className={`text-3xl font-bold ${getScoreColor(risk.score)}`}>
                    {risk.score}
                  </div>
                  <div className={`text-sm ${
                    risk.trend === 'up' ? 'text-red-500' : 
                    risk.trend === 'down' ? 'text-green-500' : 
                    'text-yellow-500'
                  }`}>
                    {risk.trend === 'up' ? '+' : risk.trend === 'down' ? '-' : ''}
                    {risk.change}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Threat Level Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Threat Level Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={threatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="threatLevel"
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="Threat Level"
                />
                <Line
                  type="monotone"
                  dataKey="activeThreats"
                  stroke="#FF8042"
                  strokeWidth={2}
                  name="Active Threats"
                />
                <Line
                  type="monotone"
                  dataKey="mitigatedThreats"
                  stroke="#00C49F"
                  strokeWidth={2}
                  name="Mitigated Threats"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Threat Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Threat Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={threatDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {threatDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {threatDistribution.map((threat, index) => (
                <div
                  key={threat.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: threat.color }}
                    />
                    <span>{threat.name}</span>
                  </div>
                  <Badge variant="outline">{threat.value}%</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreatIndicators;