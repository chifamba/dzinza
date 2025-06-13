declare module "express-prometheus-middleware" {
  import { Request, Response, NextFunction } from "express";

  interface PrometheusMiddlewareOptions {
    metricsPath?: string;
    collectDefaultMetrics?: boolean;
    requestDurationBuckets?: number[];
    requestLengthBuckets?: number[];
    responseLengthBuckets?: number[];
    [key: string]: any;
  }

  function promMiddleware(
    options?: PrometheusMiddlewareOptions
  ): (req: Request, res: Response, next: NextFunction) => void;

  export = promMiddleware;
}
