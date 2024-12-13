import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const TokenAnalytics = ({ tokens }) => {
  // Sample data - In production, this would come from your backend
  const holdersData = [
    { name: 'Jan', holders: 400 },
    { name: 'Feb', holders: 800 },
    { name: 'Mar', holders: 1200 },
    { name: 'Apr', holders: 1800 },
    { name: 'May', holders: 2400 },
    { name: 'Jun', holders: 3000 }
  ];

  const transfersData = [
    { name: 'Jan', transfers: 300 },
    { name: 'Feb', transfers: 450 },
    { name: 'Mar', transfers: 600 },
    { name: 'Apr', transfers: 800 },
    { name: 'May', transfers: 1000 },
    { name: 'Jun', transfers: 1200 }
  ];

  const distributionData = [
    { name: 'Team', value: 20 },
    { name: 'Public', value: 40 },
    { name: 'Reserve', value: 25 },
    { name: 'Partners', value: 15 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Holders"
          value="3,000"
          trend="+25%"
          isPositive={true}
        />
        <MetricCard
          title="Daily Transfers"
          value="1,200"
          trend="+15%"
          isPositive={true}
        />
        <MetricCard
          title="Average Hold Time"
          value="45 days"
          trend="+10%"
          isPositive={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Token Holders Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={holdersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="holders" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transfersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="transfers" 
                    fill="#00C49F"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const MetricCard = ({ title, value, trend, isPositive }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {trend}
      </p>
    </CardContent>
  </Card>
);

export default TokenAnalytics;