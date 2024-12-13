import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Filter,
  Calendar as CalendarIcon,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EventFiltersProps {
  onFiltersChange?: (filters: EventFilters) => void;
}

interface EventFilters {
  timeRange: string;
  eventType: string[];
  severity: string[];
  startDate?: Date;
  endDate?: Date;
}

const EventFilters: React.FC<EventFiltersProps> = ({ onFiltersChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<EventFilters>({
    timeRange: '24h',
    eventType: [],
    severity: [],
  });
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const timeRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const eventTypes = [
    { value: 'security', label: 'Security Events' },
    { value: 'authentication', label: 'Authentication Events' },
    { value: 'system', label: 'System Events' },
    { value: 'network', label: 'Network Events' },
  ];

  const severityLevels = [
    { value: 'critical', label: 'Critical', color: 'text-red-500 bg-red-500/10' },
    { value: 'high', label: 'High', color: 'text-orange-500 bg-orange-500/10' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-500 bg-yellow-500/10' },
    { value: 'low', label: 'Low', color: 'text-green-500 bg-green-500/10' },
  ];

  const handleFilterChange = (
    type: keyof EventFilters,
    value: any
  ) => {
    const newFilters = { ...filters, [type]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    if (range.from && range.to) {
      handleFilterChange('startDate', range.from);
      handleFilterChange('endDate', range.to);
    }
  };

  const resetFilters = () => {
    setFilters({
      timeRange: '24h',
      eventType: [],
      severity: [],
    });
    setDateRange({});
    onFiltersChange?.({
      timeRange: '24h',
      eventType: [],
      severity: [],
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.timeRange !== '24h') count++;
    if (filters.eventType.length > 0) count++;
    if (filters.severity.length > 0) count++;
    if (filters.startDate && filters.endDate) count++;
    return count;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          <span>Filter Events</span>
          {getActiveFilterCount() > 0 && (
            <Badge
              variant="secondary"
              className="ml-2"
            >
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Time Range Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Time Range</label>
            <Select
              value={filters.timeRange}
              onValueChange={(value) => handleFilterChange('timeRange', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {filters.timeRange === 'custom' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Range</label>
              <div className="grid gap-2">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </div>
            </div>
          )}

          {/* Event Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Types</label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((type) => (
                <Badge
                  key={type.value}
                  variant={filters.eventType.includes(type.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const newTypes = filters.eventType.includes(type.value)
                      ? filters.eventType.filter(t => t !== type.value)
                      : [...filters.eventType, type.value];
                    handleFilterChange('eventType', newTypes);
                  }}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Severity Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Severity Levels</label>
            <div className="flex flex-wrap gap-2">
              {severityLevels.map((level) => (
                <Badge
                  key={level.value}
                  variant="outline"
                  className={`cursor-pointer ${
                    filters.severity.includes(level.value) ? level.color : ''
                  }`}
                  onClick={() => {
                    const newLevels = filters.severity.includes(level.value)
                      ? filters.severity.filter(l => l !== level.value)
                      : [...filters.severity, level.value];
                    handleFilterChange('severity', newLevels);
                  }}
                >
                  {level.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply Filters
            </Button>
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
};

export default EventFilters;