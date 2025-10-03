import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import { createServer } from "http";
import { Server } from "socket.io";
import requestIp from "request-ip";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import path from "path";
import { fileURLToPath } from "url";

import morganMiddleware from "./logger/morgan.logger.js";
import { ApiError } from "./utils/ApiError.js";
import { errorHandler } from "./middlewares/error.middlewares.js";

// * App routes
import userRouter from "./routes/user.routes.js";
import companyRouter from "./routes/company.routes.js";
import projectRouter from "./routes/projects.routes.js";
import featureRouter from "./routes/features.routes.js";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct absolute path


const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
});

app.set("io", io);

// ------------------- GLOBAL MIDDLEWARES ------------------- //
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://project-management-client-amber.vercel.app",
    ],
    credentials: true,
  })
);

app.use(requestIp.mw());


// const swaggerDocument = YAML.load("../docs/swagger.yaml");

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


const swaggerDocument = YAML.load(path.join(__dirname, "docs", "swagger.yaml"));

// Mount route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.clientIp,
  handler: (_, __, ___, options) => {
    throw new ApiError(
      options.statusCode || 500,
      `Too many requests. Allowed ${options.max} per ${options.windowMs / 60000} minutes`
    );
  },
});
app.use(limiter);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Passport session
app.use(
  session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(morganMiddleware);

// ------------------- API ROUTES ------------------- //
app.use("/api/v1/users", userRouter);
app.use("/api/v1/companies", companyRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/features", featureRouter);

// Root test route
app.use("/", (req, res) => {
  res.status(200).send("<h1>Server is Running Successfully</h1>");
});

// ------------------- ERROR HANDLER ------------------- //
app.use(errorHandler);

export { httpServer };
