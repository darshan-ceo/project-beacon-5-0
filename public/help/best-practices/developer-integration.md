# Developer Integration Best Practices

## API Development Standards

### RESTful API Design

#### Endpoint Conventions
```
GET    /api/v1/cases              - List cases
GET    /api/v1/cases/{id}         - Get specific case
POST   /api/v1/cases              - Create new case
PUT    /api/v1/cases/{id}         - Update entire case
PATCH  /api/v1/cases/{id}         - Partial case update
DELETE /api/v1/cases/{id}         - Delete case
```

#### Response Standards
```json
{
  "success": true,
  "data": {
    "id": "case-123",
    "caseNumber": "GST/2024/001",
    "status": "active"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0",
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150
    }
  }
}
```

#### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid case data provided",
    "details": [
      {
        "field": "caseNumber",
        "message": "Case number already exists"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-abc123"
  }
}
```

### Authentication and Security

#### OAuth 2.0 Implementation
```typescript
// Token endpoint configuration
const tokenConfig = {
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  scope: ['cases:read', 'cases:write', 'documents:read'],
  tokenUrl: '/oauth/token',
  authUrl: '/oauth/authorize'
};

// JWT token validation
const validateToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};
```

#### Rate Limiting
```typescript
// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
};
```

### Database Integration

#### Connection Management
```typescript
// Database connection pool
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    min: 2,
    max: 10,
    createTimeoutMillis: 3000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  }
};
```

#### Query Optimization
```sql
-- Optimized case search query
SELECT 
  c.id,
  c.case_number,
  c.title,
  c.status,
  c.created_at,
  cl.name as client_name,
  u.name as assigned_to
FROM cases c
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN users u ON c.assigned_to = u.id
WHERE 
  (c.case_number ILIKE $1 OR c.title ILIKE $1)
  AND c.status = ANY($2)
  AND c.created_at >= $3
ORDER BY c.created_at DESC
LIMIT $4 OFFSET $5;

-- Index for performance
CREATE INDEX idx_cases_search ON cases 
  USING gin(to_tsvector('english', case_number || ' ' || title));
```

### Integration Patterns

#### Message Queue Integration
```typescript
// RabbitMQ integration for async processing
import amqp from 'amqplib';

class QueueService {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async connect() {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
  }

  async publishCaseUpdate(caseId: string, updateData: any) {
    const queue = 'case-updates';
    await this.channel.assertQueue(queue, { durable: true });
    
    const message = JSON.stringify({
      caseId,
      updateData,
      timestamp: new Date().toISOString()
    });
    
    this.channel.sendToQueue(queue, Buffer.from(message), {
      persistent: true
    });
  }
}
```

#### Webhook Implementation
```typescript
// Webhook handler for external integrations
app.post('/webhooks/gst-status', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-webhook-signature'];
    const isValid = verifyWebhookSignature(req.body, signature);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process GST status update
    const { gstin, status, updatedAt } = req.body;
    await updateClientGSTStatus(gstin, status, updatedAt);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

### Frontend Integration

#### State Management
```typescript
// Redux store configuration for legal app
import { configureStore } from '@reduxjs/toolkit';
import casesSlice from './slices/casesSlice';
import documentsSlice from './slices/documentsSlice';
import clientsSlice from './slices/clientsSlice';

export const store = configureStore({
  reducer: {
    cases: casesSlice,
    documents: documentsSlice,
    clients: clientsSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});
```

#### API Service Layer
```typescript
// API service with error handling and retry logic
class ApiService {
  private baseURL: string;
  private retryAttempts: number = 3;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw error;
        }
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Testing Strategies

#### Unit Testing
```typescript
// Jest test for case service
describe('CaseService', () => {
  let caseService: CaseService;
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    mockDb = createMockDb();
    caseService = new CaseService(mockDb);
  });

  describe('createCase', () => {
    it('should create a new case with valid data', async () => {
      const caseData = {
        caseNumber: 'GST/2024/001',
        title: 'Test Case',
        clientId: 'client-123'
      };

      mockDb.query.mockResolvedValue({ id: 'case-123' });

      const result = await caseService.createCase(caseData);

      expect(result).toEqual({ id: 'case-123' });
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cases'),
        expect.arrayContaining([caseData.caseNumber, caseData.title])
      );
    });
  });
});
```

#### Integration Testing
```typescript
// Integration test for API endpoints
describe('Cases API', () => {
  let app: Express;
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = createApp(db);
  });

  afterAll(async () => {
    await db.close();
  });

  describe('POST /api/v1/cases', () => {
    it('should create a new case', async () => {
      const caseData = {
        caseNumber: 'GST/2024/TEST',
        title: 'Integration Test Case',
        clientId: 'test-client'
      };

      const response = await request(app)
        .post('/api/v1/cases')
        .send(caseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.caseNumber).toBe(caseData.caseNumber);
    });
  });
});
```

### Performance Optimization

#### Caching Strategy
```typescript
// Redis caching implementation
import Redis from 'ioredis';

class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
}
```

#### Database Indexing
```sql
-- Performance indexes for legal case management
CREATE INDEX CONCURRENTLY idx_cases_client_status 
ON cases(client_id, status) WHERE status != 'archived';

CREATE INDEX CONCURRENTLY idx_documents_case_created 
ON documents(case_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_hearings_date_status 
ON hearings(hearing_date, status) WHERE status = 'scheduled';

-- Full-text search index
CREATE INDEX CONCURRENTLY idx_cases_fulltext 
ON cases USING gin(to_tsvector('english', title || ' ' || description));
```

### Monitoring and Logging

#### Application Monitoring
```typescript
// Winston logging configuration
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'legal-case-management' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Structured logging for legal operations
export const logCaseAction = (
  action: string,
  caseId: string,
  userId: string,
  metadata?: any
) => {
  logger.info('Case action performed', {
    action,
    caseId,
    userId,
    metadata,
    timestamp: new Date().toISOString()
  });
};
```

#### Performance Metrics
```typescript
// Prometheus metrics for monitoring
import promClient from 'prom-client';

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// Middleware to collect metrics
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path
    }, duration);
  });
  
  next();
});
```

---
*Last updated: January 2024*
*Follow these practices to build robust, scalable legal case management integrations*