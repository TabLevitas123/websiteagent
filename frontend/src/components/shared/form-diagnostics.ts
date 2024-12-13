import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from '@/hooks/useForm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Activity,
  AlertCircle,
  Clock,
  Zap,
  BarChart2,
  Trash2,
} from 'lucide-react';

interface DiagnosticsData {
  interactionCount: number;
  validationTime: number[];
  errorCount: number;
  touchedFields: string[];
  submissionAttempts: number;
  performance: {
    renderTime: number;
    validationLatency: number;
  };
}

const FormDiagnostics: React.FC = () => {
  const { state } = useForm();
  const diagnosticsRef = useRef<DiagnosticsData>({
    interactionCount: 0,
    validationTime: [],
    errorCount: 0,
    touchedFields: [],
    submissionAttempts: 0,
    performance: {
      renderTime: 0,
      validationLatency: 0,
    },
  });

  const startTime = useRef(performance.now());

  useEffect(() => {
    // Track render time
    const renderTime = performance.now() - startTime.current;
    diagnosticsRef.current.performance.renderTime = renderTime;

    // Track field interactions
    const touchedCount = Object.values(state.fields).filter(
      field => field.touched
    ).length;
    diagnosticsRef.current.interactionCount = touchedCount;

    // Track errors
    const errorCount = Object.values(state.fields).filter(
      field => field.error
    ).length;
    diagnosticsRef.current.errorCount = errorCount;

    // Track touched fields
    diagnosticsRef.current.touchedFields = Object.values(state.fields)
      .filter(field => field.touched)
      .map(field => field.name);

    // Track validation latency
    const validationStart = performance.now();
    Promise.resolve().then(() => {
      const validationLatency = performance.now() - validationStart;
      diagnosticsRef.current.performance.validationLatency = validationLatency;
      diagnosticsRef.current.validationTime.push(validationLatency);
    });
  }, [state]);

  const getAverageValidationTime = () => {
    const times = diagnosticsRef.current.validationTime;
    return times.length
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  };

  const getCompletionPercentage = () => {
    const totalFields = Object.keys(state.fields).length;
    const validFields = Object.values(state.fields).filter(
      field => field.isValid && field.touched
    ).length;
    return totalFields ? (validFields / totalFields) * 100 : 0;
  };

  const metrics = [
    {
      label: 'Completion',
      value: `${Math.round(getCompletionPercentage())}%`,
      icon: <Activity className="w-4 h-4 text-blue-500" />,
    },
    {
      label: 'Errors',
      value: diagnosticsRef.current.errorCount,
      icon: <AlertCircle className="w-4 h-4 text-red-500" />,
    },
    {
      label: 'Avg. Validation',
      value: `${Math.round(getAverageValidationTime())}ms`,
      icon: <Clock className="w-4 h-4 text-green-500" />,
    },
    {
      label: 'Performance',
      value: `${Math.round(diagnosticsRef.current.performance.renderTime)}ms`,
      icon: <Zap className="w-4 h-4 text-yellow-500" />,
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5" />
          Form Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-secondary"
            >
              <div className="flex items-center gap-2 mb-2">
                {metric.icon}
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
              <div className="text-2xl font-bold">{metric.value}</div>
            </motion.div>
          ))}
        </div>

        {diagnosticsRef.current.errorCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20"
          >
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Validation Issues Detected</span>
            </div>
            <ul className="mt-2 space-y-1">
              {Object.values(state.fields)
                .filter(field => field.error)
                .map(field => (
                  <li
                    key={field.name}
                    className="text-sm text-red-400 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    {field.name}: {field.error}
                  </li>
                ))}
            </ul>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default FormDiagnostics;