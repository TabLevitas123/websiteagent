import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Shield,
  MoreVertical,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Search,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Alert {
  id: string;
  type: 'security' | 'authentication' | 'system' | 'network';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  source: string;
  timestamp: string;
  status: 'new' | 'investigating' | 'resolved' | 'closed';
  assignedTo?: string;
}

const AlertsList = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Alert>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated data - would be fetched from API in production
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'security',
        severity: 'critical',
        message: 'Multiple failed login attempts detected',
        source: 'Authentication Service',
        timestamp: new Date().toISOString(),
        status: 'new'
      },
      // Add more mock alerts...
    ];

    setAlerts(mockAlerts);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let filtered = [...alerts];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(alert =>
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.source.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      }
      return 0;
    });

    setFilteredAlerts(filtered);
  }, [alerts, searchQuery, statusFilter, severityFilter, sortField, sortDirection]);

  const handleSort = (field: keyof Alert) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleUpdateStatus = (alertId: string, newStatus: Alert['status']) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, status: newStatus } : alert
    ));
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-500/10';
      case 'high':
        return 'text-orange-500 bg-orange-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'text-green-500 bg-green-500/10';
    }
  };

  const getStatusColor = (status: Alert['status']) => {
    switch (status) {
      case 'new':
        return 'text-blue-500 bg-blue-500/10';
      case 'investigating':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'resolved':
        return 'text-green-500 bg-green-500/10';
      case 'closed':
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Alerts
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
                icon={<Search className="w-4 h-4" />}
              />
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={severityFilter}
                onValueChange={setSeverityFilter}
              >
                <SelectTrigger className="w-32">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Source</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center gap-2">
                    Time
                    {sortField === 'timestamp' ? (
                      sortDirection === 'asc' ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      )
                    ) : null}
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredAlerts.map((alert) => (
                  <motion.tr
                    key={alert.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                  >
                    <TableCell>
                      <Badge
                        className={getSeverityColor(alert.severity)}
                      >
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {alert.message}
                    </TableCell>
                    <TableCell>{alert.source}</TableCell>
                    <TableCell>
                      {new Date(alert.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getStatusColor(alert.status)}
                      >
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(alert.id, 'investigating')}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Investigate</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            <span>Mark Resolved</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertsList;