import { useState, useMemo, useCallback } from 'react';

// Define types
export interface LogEntry {
  id: number;
  time: string;
  ip_address: string;
  method: string;
  path: string;
  status: number;
  user_agent: string;
  crawler_name: string;
  referer: string;
  request_id: string;
  log_file_id: string;
}

export interface LogFilters {
  crawler?: string;
  method?: string[];
  status?: number[];
  path?: string;
}

export type ColumnKey = 'time' | 'ip_address' | 'method' | 'path' | 'status' | 'crawler_name';

export const ALL_COLUMNS = [
  { key: 'time', label: 'Time' },
  { key: 'ip_address', label: 'IP Address' },
  { key: 'method', label: 'Method' },
  { key: 'path', label: 'Path' },
  { key: 'status', label: 'Status' },
  { key: 'crawler_name', label: 'Crawler' },
] as const;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'];
export const STATUS_CODES = [200, 301, 302, 304, 400, 403, 404, 500];

export const useLogsFilters = (logFileId: string | null) => {
  // State for filters, sorting, and pagination
  const [filters, setFilters] = useState<LogFilters>({});
  const [sort, setSort] = useState<{ column: keyof LogEntry | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'desc' });
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(ALL_COLUMNS.map(c => c.key as ColumnKey));
  const [advancedSearch, setAdvancedSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle filter changes
  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page on filter change
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    setDateRange({ start: '', end: '' });
    setPage(0);
  };

  // Handle sort
  const handleSort = (column: keyof LogEntry) => {
    setSort(prev => {
      if (prev.column === column) {
        // Toggle direction
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        // Default to ascending when changing column
        return { column, direction: 'asc' };
      }
    });
    setPage(0); // Reset to first page on sort
  };

  // Handle column visibility
  const handleColToggle = (key: ColumnKey) => {
    if (visibleColumns.includes(key)) {
      if (visibleColumns.length === 1) return; // Always keep at least one column
      setVisibleColumns(visibleColumns.filter(k => k !== key));
    } else {
      setVisibleColumns([...visibleColumns, key]);
    }
  };

  // Advanced search parser
  const parseAdvancedSearch = useCallback((query: string) => {
    // Supported: AND, OR, =, contains, field names (status, method, path, crawler, date)
    // Example: status=404 OR 500 AND path contains /api AND method=POST
    // Returns: { filters, dateRange }
    let filters: LogFilters = {};
    let dateRange: { start: string; end: string } = { start: '', end: '' };
    if (!query.trim()) return { filters, dateRange };
    // Split by AND
    const andParts = query.split(/\s+AND\s+/i);
    for (let part of andParts) {
      // OR support (only for status, method, crawler, path)
      let orParts = part.split(/\s+OR\s+/i).map(s => s.trim());
      // Status
      if (/^status/i.test(part)) {
        let values = orParts.map(s => s.match(/\d+/g)).flat().filter(Boolean).map(Number);
        if (values.length) filters.status = values;
      }
      // Method
      else if (/^method/i.test(part)) {
        let values = orParts.map(s => s.match(/(GET|POST|PUT|DELETE|HEAD)/i)).flat().filter(Boolean).map(v => v?.toUpperCase());
        if (values.length) filters.method = values as string[];
      }
      // Path
      else if (/^path/i.test(part)) {
        // path contains ...
        let match = part.match(/contains\s+([^\s]+)/i);
        if (match) filters.path = match[1];
        else {
          // path = ...
          let eq = part.match(/=\s*([^\s]+)/i);
          if (eq) filters.path = eq[1];
        }
      }
      // Crawler
      else if (/^crawler/i.test(part)) {
        let match = part.match(/=\s*([^\s]+)/i);
        if (match) filters.crawler = match[1];
        else {
          let match2 = part.match(/contains\s+([^\s]+)/i);
          if (match2) filters.crawler = match2[1];
        }
      }
      // Date
      else if (/^date/i.test(part)) {
        // date=2024-04-01 or date=2024-04-01:2024-04-02
        let match = part.match(/=\s*([\dT:-]+)(?::([\dT:-]+))?/i);
        if (match) {
          dateRange.start = match[1];
          if (match[2]) dateRange.end = match[2];
        }
      }
    }
    return { filters, dateRange };
  }, []);

  // Advanced search handler
  const handleAdvancedSearch = (q: string) => {
    setAdvancedSearch(q);
    const { filters: advFilters, dateRange: advDateRange } = parseAdvancedSearch(q);
    setFilters(advFilters);
    setDateRange(advDateRange);
    setPage(0);
  };

  // Build SQL query based on filters
  const buildQuery = useCallback(() => {
    let query = `
      SELECT *
      FROM access_logs
      WHERE log_file_id = ?
    `;
    const queryParams: any[] = [logFileId];
    
    // Multi-select for method
    if (filters.method && Array.isArray(filters.method) && filters.method.length > 0) {
      query += ` AND method IN (${filters.method.map(() => '?').join(',')})`;
      queryParams.push(...filters.method);
    }
    
    // Multi-select for status
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      query += ` AND status IN (${filters.status.map(() => '?').join(',')})`;
      queryParams.push(...filters.status);
    }
    
    // Autocomplete for crawler
    if (filters.crawler) {
      query += ' AND crawler_name LIKE ?';
      queryParams.push(`%${filters.crawler}%`);
    }
    
    // Autocomplete for path
    if (filters.path) {
      query += ' AND path LIKE ?';
      queryParams.push(`%${filters.path}%`);
    }
    
    // Date range
    if (dateRange.start) {
      query += ' AND time >= ?';
      queryParams.push(dateRange.start);
    }
    if (dateRange.end) {
      query += ' AND time <= ?';
      queryParams.push(dateRange.end);
    }
    
    // Add ORDER BY for sorting
    if (sort.column) {
      // Prevent SQL injection by only allowing known columns
      const allowedColumns: (keyof LogEntry)[] = [
        'time', 'ip_address', 'method', 'path', 'status', 'crawler_name'
      ];
      if (allowedColumns.includes(sort.column)) {
        query += ` ORDER BY ${sort.column} ${sort.direction.toUpperCase()}`;
      } else {
        query += ' ORDER BY time DESC';
      }
    } else {
      query += ' ORDER BY time DESC';
    }
    
    return { query, params: queryParams };
  }, [logFileId, filters, sort, dateRange]);

  // Generate filter chips for UI
  const filterChips = useMemo(() => {
    const chips: { label: string; key: string }[] = [];
    if (filters.crawler) chips.push({ label: `Crawler: ${filters.crawler}`, key: 'crawler' });
    if (filters.path) chips.push({ label: `Path: ${filters.path}`, key: 'path' });
    if (filters.method && filters.method.length)
      chips.push({ label: `Method: ${filters.method.join(', ')}`, key: 'method' });
    if (filters.status && filters.status.length)
      chips.push({ label: `Status: ${filters.status.join(', ')}`, key: 'status' });
    if (dateRange.start || dateRange.end)
      chips.push({ label: `Date: ${dateRange.start || '...'} → ${dateRange.end || '...'}`, key: 'dateRange' });
    return chips;
  }, [filters, dateRange]);

  // Remove filter chip
  const removeFilterChip = (key: string) => {
    if (key === 'dateRange') setDateRange({ start: '', end: '' });
    else setFilters(prev => ({ ...prev, [key]: undefined }));
  };

  return {
    filters,
    setFilters,
    sort,
    setSort,
    page,
    setPage,
    dateRange,
    setDateRange,
    visibleColumns,
    setVisibleColumns,
    advancedSearch,
    setAdvancedSearch,
    showAdvanced,
    setShowAdvanced,
    handleFilterChange,
    resetFilters,
    handleSort,
    handleColToggle,
    buildQuery,
    filterChips,
    removeFilterChip,
    handleAdvancedSearch,
  };
}; 