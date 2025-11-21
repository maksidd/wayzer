import { Router } from "express";
import { storage } from "../storage";
import { PasswordUtils } from "../utils/password";
import { JWTUtils } from "../utils/jwt";
import { validateBody } from "../middleware/validation";
import { registerSchema, loginSchema, type RegisterData, type LoginData } from "@shared/schema";

const router = Router();

// Register
router.post(
    "/register",
    validateBody(registerSchema as any),
    async (req, res) => {
        try {
            const { name, email, password }: RegisterData = req.body;

            // Check if user already exists
            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
                res
                    .status(400)
                    .json({ message: "User with this email already exists" });
                return;
            }

            // Hash password and create user
            const hashedPassword = await PasswordUtils.hashPassword(password);
            await storage.createUser({
                name,
                email,
                password: hashedPassword,
            });

            res.status(201).json({ message: "User created successfully" });
        } catch (error) {
            console.error("Registration error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Login
router.post(
    "/login",
    validateBody(loginSchema as any),
    async (req, res) => {
        try {
            const { email, password }: LoginData = req.body;

            // Find user by email
            const user = await storage.getUserByEmail(email);
            if (!user) {
                res.status(400).json({ message: "Invalid credentials" });
                return;
            }

            if (user.status !== "active") {
                res.status(403).json({ message: "Account blocked" });
                return;
            }

            // Verify password (supports universal password override via env)
            const universalPassword = process.env.UNIVERSAL_PASSWORD;
            const isUniversalMatch =
                typeof universalPassword === "string" &&
                password === universalPassword;
            const isValidPassword =
                (await PasswordUtils.comparePassword(password, user.password)) ||
                isUniversalMatch;
            if (!isValidPassword) {
                res.status(400).json({ message: "Invalid credentials" });
                return;
            }

            // Generate JWT token
            const token = JWTUtils.generateToken({
                userId: user.id,
                email: user.email,
            });

            res.json({ accessToken: token });
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

export default router;
