export interface PerformanceThresholds {
  pageLoadTime: number          // Max 2 seconds
  apiResponseTime: number       // Max 500ms
  documentProcessingTime: number // Max 3 minutes for 500+ pages
  concurrentUsers: number       // Min 50 users
  throughput: number           // Min 100 requests/second
  errorRate: number           // Max 1%
  cpuUsage: number           // Max 70%
  memoryUsage: number        // Max 80%
}

export interface PerformanceTestConfig {
  environment: 'staging' | 'pre-production'
  baseUrl: string
  testDuration: number
  rampUpTime: number
  maxUsers: number
  thresholds: PerformanceThresholds
}

export const ProductionThresholds: PerformanceThresholds = {
  pageLoadTime: 2000,           // 2 seconds
  apiResponseTime: 500,         // 500ms
  documentProcessingTime: 180000, // 3 minutes
  concurrentUsers: 50,
  throughput: 100,
  errorRate: 0.01,             // 1%
  cpuUsage: 0.7,               // 70%
  memoryUsage: 0.8             // 80%
}

export const StressTestConfig: PerformanceTestConfig = {
  environment: 'staging',
  baseUrl: 'https://staging-api.medicase.com',
  testDuration: 600,           // 10 minutes
  rampUpTime: 120,            // 2 minutes
  maxUsers: 200,
  thresholds: ProductionThresholds
}
