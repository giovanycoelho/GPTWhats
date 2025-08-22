import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW) || 900, // Per 15 minutes
});

export const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 1000;

    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000) || 1,
      'X-RateLimit-Limit': rateLimiter.points,
      'X-RateLimit-Remaining': remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });

    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
};

export { rateLimiter as rateLimiter };