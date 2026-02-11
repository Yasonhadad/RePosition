/**
 * Authentication and session management using Passport.js
 * Provides user registration, login, logout, and session persistence
 */
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt with a random salt
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password in format "hash.salt"
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compares a supplied password with a stored hash
 * @param supplied - Plain text password to verify
 * @param stored - Stored hash in format "hash.salt"
 * @returns Promise<boolean> - True if passwords match
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Sets up authentication middleware, session management, and auth routes
 * @param app - Express application instance
 */
export function setupAuth(app: Express): void {
  const PostgresSessionStore = connectPg(session);
  
  const sessionSecret = process.env.SESSION_SECRET;
  const dbUrl = process.env.DATABASE_URL;
  if (!sessionSecret) throw new Error('SESSION_SECRET is not set. Set it in .env (see .env.example).');
  if (!dbUrl) throw new Error('DATABASE_URL is not set. Set it in .env (see .env.example).');

  // RDS requires SSL; session store uses pg and needs the same SSL config as db.ts
  const isLocalDb = /localhost|127\.0\.0\.1/.test(dbUrl);
  const sessionStoreSsl = isLocalDb ? false : { rejectUnauthorized: false };

  // Configure session storage in PostgreSQL
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conString: dbUrl,
      ssl: sessionStoreSsl,
      createTableIfMissing: true,
      tableName: 'session'
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  // Configure session and passport middleware
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local authentication strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          const isValid = user && await comparePasswords(password, user.password);
          done(null, isValid ? user : false);
        } catch (error) {
          done(error);
        }
      },
    ),
  );

  // Session serialization
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  
  /** User registration endpoint */
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const userData = {
        email: req.body.email,
        password: hashedPassword,
        firstName: req.body.firstName || null,
        lastName: req.body.lastName || null,
      };

      const user = await storage.createUser(userData);
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
      });
    } catch (error: any) {
      console.error("Register error:", error?.message ?? error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  /** User login endpoint */
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as SelectUser;
    res.status(200).json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
  });

  /** User logout endpoint */
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  /** Get current authenticated user */
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as SelectUser;
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
    } else {
      res.sendStatus(401);
    }
  });
}

/**
 * Middleware to require authentication for protected routes
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function requireAuth(req: any, res: any, next: any): void {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}