# Enterprise Monitoring System - File Tree

```
enterprise-monitoring/
├── frontend/
│   ├── public/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── icons/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── PerformanceDashboard.tsx ✓
│   │   │   │   ├── ResourceUsage.tsx ✓
│   │   │   │   ├── NetworkMetrics.tsx ✓
│   │   │   │   └── SystemHealth.tsx ✓
│   │   │   │
│   │   │   ├── monitoring/
│   │   │   │   ├── TimeSeriesView.tsx →
│   │   │   │   ├── AlertsPanel.tsx →
│   │   │   │   ├── MetricsGrid.tsx ✓
│   │   │   │   └── StatusIndicators.tsx ✓
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── ErrorBoundary.tsx ✓
│   │   │       ├── LoadingStates.tsx ✓
│   │   │       └── Toast.tsx ✓
│   │   │
│   │   ├── services/
│   │   │   ├── metrics/
│   │   │   │   ├── MetricsService.ts ✓
│   │   │   │   ├── TimeSeriesService.ts →
│   │   │   │   └── AlertService.ts →
│   │   │   │
│   │   │   ├── websocket/
│   │   │   │   ├── WebSocketManager.ts ✓
│   │   │   │   ├── EventHandler.ts ✓
│   │   │   │   └── MetricsPublisher.ts ✓
│   │   │   │
│   │   │   └── auth/
│   │   │       ├── AuthService.ts ✓
│   │   │       └── TokenManager.ts ✓
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts ✓
│   │   │   ├── useMetrics.ts ✓
│   │   │   └── useAuth.ts ✓
│   │   │
│   │   └── utils/
│   │       ├── formatters.ts ✓
│   │       ├── validators.ts ✓
│   │       └── errorHandlers.ts ✓
│   │
│   └── tests/
│       ├── unit/
│       │   └── components/ ✓
│       ├── integration/ ✓
│       └── e2e/ ⋯
│
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── metrics.ts ✓
│   │   │   │   ├── alerts.ts →
│   │   │   │   └── auth.ts ✓
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts ✓
│   │   │   │   ├── validation.ts ✓
│   │   │   │   └── errorHandler.ts ✓
│   │   │   │
│   │   │   └── controllers/
│   │   │       ├── MetricsController.ts ✓
│   │   │       └── AlertsController.ts →
│   │   │
│   │   ├── services/
│   │   │   ├── MetricsService.ts ✓
│   │   │   ├── CacheService.ts ✓
│   │   │   ├── TimeSeriesService.ts →
│   │   │   └── AlertService.ts →
│   │   │
│   │   └── utils/
│   │       ├── logger.ts ✓
│   │       └── validators.ts ✓
│   │
│   └── tests/
│       ├── unit/ ✓
│       ├── integration/ ✓
│       └── performance/ ⋯
│
├── docs/
│   ├── api/ ✓
│   ├── deployment/ ⋯
│   └── guides/ ⋯
│
└── config/
    ├── webpack.config.js ✓
    ├── jest.config.js ✓
    └── tsconfig.json ✓

Legend:
✓ - Completed
→ - In Progress
⋯ - Pending
```