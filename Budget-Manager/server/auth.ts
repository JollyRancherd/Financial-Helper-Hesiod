import crypto from "crypto";
import session from "express-session";
import MemoryStoreFactory from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, RequestHandler } from "express";
import type { AuthUserResponse, AuthCredentialsRequest } from "@shared/schema";
import { storage } from "./storage";

const MemoryStore = MemoryStoreFactory(session);

const SCRYPT_KEYLEN = 64;

export async function createToken(user: { id: number; username: string }): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await storage.setUserToken(user.id, token);
  return token;
}

export async function revokeToken(token: string): Promise<void> {
  const user = await storage.getUserByToken(token);
  if (user) await storage.setUserToken(user.id, null);
}

function timingSafeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  return timingSafeEqualHex(derivedKey.toString("hex"), keyHex);
}

export function toSafeUser(user: { id: number; username: string }): AuthUserResponse {
  return { id: user.id, username: user.username };
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(session({
    secret: process.env.SESSION_SECRET || "budget-manager-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({ checkPeriod: 1000 * 60 * 60 * 24 }),
    cookie: {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(async (req, _res, next) => {
    if (!req.isAuthenticated()) {
      const token = req.headers["x-auth-token"] as string | undefined;
      if (token) {
        try {
          const user = await storage.getUserByToken(token);
          if (user) {
            req.user = toSafeUser(user);
          }
        } catch {
        }
      }
    }
    next();
  });

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) return done(null, false, { message: "Invalid username or password" });
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) return done(null, false, { message: "Invalid username or password" });
      return done(null, toSafeUser(user));
    } catch (error) {
      return done(error as Error);
    }
  }));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user: Express.User, done) => done(null, user));
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() || req.user) return next();
  return res.status(401).json({ message: "You need to log in first." });
};

export async function registerUserAndSeed(input: AuthCredentialsRequest) {
  const passwordHash = await hashPassword(input.password);
  const user = await storage.createUser({ username: input.username, passwordHash });
  await storage.seedDefaultsForUser(user.id);
  return toSafeUser(user);
}
