/**
 * API utilities index file
 * Re-exports all API-related utilities for easy imports
 */

// Core API client
// export { 
//   apiFetch,
//   ApiClientError,
//   type ApiResponse 
// } from './apiClient';

// SQL utilities
export {
  executeSQLQuery,
  type SQLQueryRequest
} from './sqlClient';

// Cache utilities
export {
  createApiResource,
  createSQLQueryResource,
  clearCache
} from './cacheUtils';

// Prefetching utilities
export {
  prefetch,
  prefetchSQLQuery
} from './prefetchUtils'; 