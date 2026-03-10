import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

// Global rate limiter for general API routes (optional, but good practice)
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (_, __, ___, options) => {
        throw new ApiError(
            options.statusCode || 500,
            `Too many requests. ${options.message}`
        );
    },
});

// Strict rate limiter specifically designed for authentication endpoints (login, forgot-pass, register)
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 failed requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many authentication attempts, please try again after 15 minutes",
    handler: (_, __, ___, options) => {
        throw new ApiError(
            options.statusCode || 429,
            options.message
        );
    },
});
