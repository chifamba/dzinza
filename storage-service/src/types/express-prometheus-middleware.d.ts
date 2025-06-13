declare module 'express-prometheus-middleware' {
  import { Request, Response, NextFunction } from 'express';
  
  interface PrometheusMiddlewareOptions {
    metricsPath?: string;
    collectDefaultMetrics?: boolean;
    requestDurationBuckets?: number[];
    collectGCMetrics?: boolean;
    prefix?: string;
    includeMethod?: boolean;
    includePath?: boolean;
    includeStatusCode?: boolean;
    includeUp?: boolean;
    customLabels?: string[];
    normalizePath?: (req: Request) => string;
    extractPath?: (req: Request) => string;
  }

  function promMiddleware(options?: PrometheusMiddlewareOptions): (req: Request, res: Response, next: NextFunction) => void;
  
  export = promMiddleware;
}
