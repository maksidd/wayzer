import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { 
  insertRouteSchema, 
  insertRouteMemberSchema, 
  insertMessageSchema, 
  insertReviewSchema 
} from "@shared/schema";
import { z } from "zod";

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // ROUTES API
  // Get all routes
  app.get("/api/routes", async (req, res) => {
    try {
      const routeType = req.query.type as string;
      
      let routes;
      if (routeType) {
        routes = await storage.getRoutesByType(routeType);
      } else {
        routes = await storage.getAllRoutes();
      }
      
      // Fetch participant counts for each route
      const routesWithParticipants = await Promise.all(
        routes.map(async (route) => {
          const participantCount = await storage.getParticipantCount(route.id);
          const creator = await storage.getUser(route.userId);
          
          return {
            ...route,
            participantCount,
            creator: creator ? {
              id: creator.id,
              username: creator.username,
              avatar: creator.avatar,
              rating: creator.rating
            } : null
          };
        })
      );
      
      res.json(routesWithParticipants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  // Get a single route
  app.get("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const route = await storage.getRoute(routeId);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      const participantCount = await storage.getParticipantCount(route.id);
      const creator = await storage.getUser(route.userId);
      const members = await storage.getRouteMembers(route.id);
      
      // Fetch member details
      const membersWithDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: user ? {
              id: user.id,
              username: user.username,
              avatar: user.avatar,
              rating: user.rating
            } : null
          };
        })
      );
      
      res.json({
        ...route,
        participantCount,
        creator: creator ? {
          id: creator.id,
          username: creator.username,
          avatar: creator.avatar,
          rating: creator.rating
        } : null,
        members: membersWithDetails
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch route" });
    }
  });

  // Create a new route
  app.post("/api/routes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRouteSchema.parse(req.body);
      const route = await storage.createRoute(validatedData);
      
      // Add creator as a participant
      await storage.addRouteMember({
        routeId: route.id,
        userId: route.userId,
        status: "accepted"
      });
      
      res.status(201).json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create route" });
    }
  });

  // Update a route
  app.patch("/api/routes/:id", isAuthenticated, async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const route = await storage.getRoute(routeId);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Only allow the creator to update the route
      if (route.userId !== req.user?.id) {
        return res.status(403).json({ message: "Not authorized to update this route" });
      }
      
      const updatedRoute = await storage.updateRoute(routeId, req.body);
      res.json(updatedRoute);
    } catch (error) {
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  // Delete a route
  app.delete("/api/routes/:id", isAuthenticated, async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const route = await storage.getRoute(routeId);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Only allow the creator to delete the route
      if (route.userId !== req.user?.id) {
        return res.status(403).json({ message: "Not authorized to delete this route" });
      }
      
      await storage.deleteRoute(routeId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  // ROUTE MEMBERS API
  // Join a route
  app.post("/api/routes/:id/join", isAuthenticated, async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const userId = req.user?.id as number;
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Check if user is already a member
      const members = await storage.getRouteMembers(routeId);
      const existingMember = members.find(m => m.userId === userId);
      
      if (existingMember) {
        return res.status(400).json({ message: "Already joined or requested to join this route" });
      }
      
      // Check if the route is full
      const participantCount = await storage.getParticipantCount(routeId);
      if (participantCount >= route.maxParticipants) {
        return res.status(400).json({ message: "This route is already full" });
      }
      
      const validatedData = insertRouteMemberSchema.parse({
        routeId,
        userId,
        status: "pending" // Default to pending, route creator can accept
      });
      
      const member = await storage.addRouteMember(validatedData);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to join route" });
    }
  });

  // Update member status (accept/reject)
  app.patch("/api/routes/:routeId/members/:userId", isAuthenticated, async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      const memberId = parseInt(req.params.userId);
      const { status } = req.body;
      
      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Only the route creator can update member status
      if (route.userId !== req.user?.id) {
        return res.status(403).json({ message: "Not authorized to update member status" });
      }
      
      const updatedMember = await storage.updateRouteMemberStatus(routeId, memberId, status);
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.json(updatedMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to update member status" });
    }
  });

  // Leave a route
  app.delete("/api/routes/:id/leave", isAuthenticated, async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const userId = req.user?.id as number;
      
      await storage.removeRouteMember(routeId, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to leave route" });
    }
  });

  // MESSAGES API
  // Get messages for a route
  app.get("/api/routes/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const messages = await storage.getMessages(routeId);
      
      // Fetch user info for each message
      const messagesWithUserInfo = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return {
            ...message,
            user: user ? {
              id: user.id,
              username: user.username,
              avatar: user.avatar
            } : null
          };
        })
      );
      
      res.json(messagesWithUserInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Create a message
  app.post("/api/routes/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const userId = req.user?.id as number;
      
      const validatedData = insertMessageSchema.parse({
        routeId,
        userId,
        content: req.body.content
      });
      
      const message = await storage.createMessage(validatedData);
      
      // Get user info
      const user = await storage.getUser(userId);
      
      res.status(201).json({
        ...message,
        user: user ? {
          id: user.id,
          username: user.username,
          avatar: user.avatar
        } : null
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // REVIEWS API
  // Get reviews for a user
  app.get("/api/users/:id/reviews", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const reviews = await storage.getReviews(userId);
      
      // Fetch author info for each review
      const reviewsWithAuthorInfo = await Promise.all(
        reviews.map(async (review) => {
          const author = await storage.getUser(review.authorId);
          return {
            ...review,
            author: author ? {
              id: author.id,
              username: author.username,
              avatar: author.avatar
            } : null
          };
        })
      );
      
      res.json(reviewsWithAuthorInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Create a review
  app.post("/api/users/:id/reviews", isAuthenticated, async (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const authorId = req.user?.id as number;
      
      if (targetId === authorId) {
        return res.status(400).json({ message: "Cannot review yourself" });
      }
      
      const validatedData = insertReviewSchema.parse({
        authorId,
        targetId,
        routeId: req.body.routeId,
        rating: req.body.rating,
        comment: req.body.comment
      });
      
      const review = await storage.createReview(validatedData);
      
      // Get author info
      const author = await storage.getUser(authorId);
      
      res.status(201).json({
        ...review,
        author: author ? {
          id: author.id,
          username: author.username,
          avatar: author.avatar
        } : null
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time chat
  setupWebSocket(httpServer);

  return httpServer;
}
