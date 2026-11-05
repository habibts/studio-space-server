import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 3001;

// Build the list of allowed origins from environment configuration.
// Defaults cover both local development and the known production frontend.
const allowedOrigins = new Set(
  (
    process.env.FRONTEND_URL ||
    "http://localhost:3000,https://studio-space-client-steel.vercel.app"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / server-to-server requests (no Origin header)
      // and any request whose Origin is in the allowed list.
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);
app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studiospace");

// ========================================
// JWT Verification Middleware
// ========================================

function verifyJwt(req, res, next) {
  const token = req.cookies?.studio_jwt;
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

app.post("/add-studio", verifyJwt, async (req, res) => {
  console.log("Received data:", req.body);

  try {
    const collection = db.collection("studios");

    const newStudio = {
      title: req.body.title,
      category: req.body.category,
      hourlyRate: Number(req.body.hourlyRate),
      securityDeposit: Number(req.body.securityDeposit),
      maxCapacity: Number(req.body.maxCapacity),
      location: req.body.location,
      imageUrl: req.body.imageUrl,
      description: req.body.description,
      amenities: req.body.amenities || [],
      hostName: req.user?.name || req.body.hostName,
      hostEmail: req.user?.email || req.body.hostEmail,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newStudio);

    console.log("Studio saved successfully:", result.insertedId);

    res.status(201).json({
      success: true,
      message: "Studio added successfully!",
      studioId: result.insertedId,
    });
  } catch (err) {
    console.error("Error adding studio:", err);

    res.status(500).json({
      success: false,
      message: "Error adding studio",
    });
  }
});

// ========================================
// Get All Studios
// ========================================

app.get("/studios", async (req, res) => {
  try {
    const collection = db.collection("studios");
    const studios = await collection.find({}).toArray();

    res.status(200).json({
      success: true,
      studios,
    });
  } catch (err) {
    console.error("Error fetching studios:", err);

    res.status(500).json({
      success: false,
      message: "Error fetching studios",
    });
  }
});

// ========================================
// Get Featured Studios
// ========================================

app.get("/featured-studios", async (req, res) => {
  try {
    const collection = db.collection("studios");

    const studios = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.status(200).json({
      success: true,
      studios,
    });
  } catch (error) {
    console.error("Error fetching featured studios:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch featured studios",
    });
  }
});

// ========================================
// Get Single Studio Details
// ========================================

app.get("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
    }

    const studio = await db.collection("studios").findOne({
      _id: new ObjectId(id),
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found",
      });
    }

    res.status(200).json({
      success: true,
      studio,
    });
  } catch (error) {
    console.error("Error fetching studio details:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studio details",
    });
  }
});

// ========================================
// Create New Booking
// ========================================

app.post("/bookings", verifyJwt, async (req, res) => {
  try {
    const {
      studioId,
      studioTitle,
      customerName,
      customerEmail,
      bookingDate,
      startTime,
      endTime,
      totalHours,
      hourlyRate,
      securityDeposit,
      totalPrice,
    } = req.body;

    if (
      !studioId ||
      !studioTitle ||
      !customerName ||
      !customerEmail ||
      !bookingDate ||
      !startTime ||
      !endTime ||
      !totalHours ||
      !hourlyRate ||
      securityDeposit === undefined ||
      totalPrice === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All booking fields are required",
      });
    }

    const newBooking = {
      studioId,
      studioTitle,
      customerName: req.user?.name || customerName,
      customerEmail: (req.user?.email || customerEmail).trim().toLowerCase(),
      bookingDate,
      startTime,
      endTime,
      totalHours: Number(totalHours),
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit),
      totalPrice: Number(totalPrice),
      status: "Pending",
      createdAt: new Date(),
    };

    const bookingsCollection = db.collection("bookings");

    const { ObjectId } = await import("mongodb");
    const studioIdQuery = ObjectId.isValid(studioId)
      ? { $in: [studioId, new ObjectId(studioId)] }
      : studioId;

    const overlapping = await bookingsCollection.findOne({
      studioId: studioIdQuery,
      bookingDate,
      status: "Confirmed",
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: "This studio is already booked for the selected time. Please choose another time slot.",
      });
    }

    const result = await bookingsCollection.insertOne(newBooking);

    res.status(201).json({
      success: true,
      message: "Booking created successfully!",
      bookingId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating booking:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
});

// ========================================
// Get All Bookings
// ========================================

app.get("/bookings", async (req, res) => {
  try {
    const bookingsCollection = db.collection("bookings");

    const bookings = await bookingsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      totalBookings: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

// ========================================
// Get Bookings by User Email
// ========================================

app.get("/my-bookings", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "User email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const bookingsCollection = db.collection("bookings");
    const studiosCollection = db.collection("studios");

    const bookings = await bookingsCollection
      .find({
        customerEmail: normalizedEmail,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich each booking with the associated studio's imageUrl and location.
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        let studio = null;

        if (booking.studioId) {
          const query = ObjectId.isValid(booking.studioId)
            ? { _id: new ObjectId(booking.studioId) }
            : { _id: booking.studioId };

          studio = await studiosCollection.findOne(query);
        }

        return {
          ...booking,
          imageUrl: studio?.imageUrl ?? null,
          location: studio?.location ?? null,
        };
      })
    );

    res.status(200).json({
      success: true,
      totalBookings: enrichedBookings.length,
      bookings: enrichedBookings,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user bookings",
    });
  }
});

// ========================================
// Get My Studios
// ========================================

app.get("/my-studios", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "User email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const studiosCollection = db.collection("studios");

    const studios = await studiosCollection
      .find({
        hostEmail: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      studios,
    });
  } catch (error) {
    console.error("Error fetching user studios:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user studios",
    });
  }
});

// ========================================
// Update Studio
// ========================================

app.put("/studios/:id", async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = db.collection("studios");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid studio ID" });
    }

    const update = {
      $set: {
        title: req.body.title,
        category: req.body.category,
        hourlyRate: Number(req.body.hourlyRate),
        securityDeposit: Number(req.body.securityDeposit),
        maxCapacity: Number(req.body.maxCapacity),
        location: req.body.location,
        imageUrl: req.body.imageUrl,
        description: req.body.description,
        amenities: req.body.amenities || [],
        hostName: req.user?.name || req.body.hostName,
        hostEmail: req.user?.email || req.body.hostEmail,
        updatedAt: new Date(),
      },
    };

    const result = await collection.updateOne({ _id: new ObjectId(id) }, update);

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Studio not found" });
    }

    res.status(200).json({ success: true, message: "Studio updated successfully" });
  } catch (err) {
    console.error("Error updating studio:", err);
    res.status(500).json({ success: false, message: "Error updating studio" });
  }
});

// ========================================
// Delete Studio
// ========================================

app.delete("/studios/:id", verifyJwt, async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = db.collection("studios");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid studio ID" });
    }

    const studio = await collection.findOne({ _id: new ObjectId(id) });
    if (!studio) {
      return res.status(404).json({ success: false, message: "Studio not found" });
    }
    const owner = (studio.hostEmail || studio.ownerEmail || "").toLowerCase();
    if (owner && owner !== (req.user?.email || "").toLowerCase()) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Studio not found" });
    }

    res.status(200).json({ success: true, message: "Studio deleted successfully" });
  } catch (err) {
    console.error("Error deleting studio:", err);
    res.status(500).json({ success: false, message: "Error deleting studio" });
  }
});

// ========================================
// Cancel Booking
// ========================================

app.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = db.collection("bookings");
    const { id } = req.params;
    const email = (req.body?.email || req.query?.email || "").toString().trim().toLowerCase();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await collection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (email && booking.customerEmail?.toLowerCase() !== email) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (booking.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be cancelled" });
    }

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { status: "Cancelled" } });

    res.status(200).json({ success: true, message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({ success: false, message: "Error cancelling booking" });
  }
});

// ========================================
// Delete Cancelled Booking
// ========================================

app.delete("/bookings/:id", verifyJwt, async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = db.collection("bookings");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await collection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    console.log("Delete debug:", { hasUser: !!req.user, userEmail: req.user?.email, bookingEmail: booking.customerEmail, id });
    if (booking.customerEmail?.toLowerCase() !== req.user.email?.toLowerCase()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (booking.status !== "Cancelled") {
      return res.status(400).json({ success: false, message: "Only cancelled bookings can be deleted" });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(500).json({ success: false, message: "Deletion failed" });
    }

    res.status(200).json({ success: true, message: "Booking deleted successfully" });
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.status(500).json({ success: false, message: "Error deleting booking" });
  }
});

// ========================================
// Confirm Booking
// ========================================

app.patch("/bookings/:id/confirm", verifyJwt, async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = db.collection("bookings");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await collection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    console.log("Confirm debug:", { hasUser: !!req.user, userEmail: req.user?.email, bookingEmail: booking.customerEmail });
    if (booking.customerEmail?.toLowerCase() !== req.user.email?.toLowerCase()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (booking.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be confirmed" });
    }

    const overlapping = await collection.findOne({
      studioId: booking.studioId,
      bookingDate: booking.bookingDate,
      status: "Confirmed",
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime },
      _id: { $ne: new ObjectId(id) },
    });

    if (overlapping) {
      return res.status(409).json({ success: false, message: "This studio is already booked for the selected time. Please choose another time slot." });
    }

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { status: "Confirmed" } });
    await collection.updateMany(
      {
        studioId: booking.studioId,
        bookingDate: booking.bookingDate,
        status: "Pending",
        _id: { $ne: new ObjectId(id) },
        startTime: { $lt: booking.endTime },
        endTime: { $gt: booking.startTime },
      },
      { $set: { status: "Cancelled" } }
    );
    res.status(200).json({ success: true, message: "Booking confirmed successfully" });
  } catch (err) {
    console.error("Error confirming booking:", err);
    res.status(500).json({ success: false, message: "Error confirming booking" });
  }
});

// ========================================
// Complete Booking
// ========================================

app.patch("/bookings/:id/complete", verifyJwt, async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = db.collection("bookings");
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await collection.findOne({ _id: new ObjectId(id) });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.customerEmail?.toLowerCase() !== req.user.email?.toLowerCase()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (booking.status !== "Confirmed") {
      return res.status(400).json({ success: false, message: "Only confirmed bookings can be completed" });
    }

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { status: "Completed" } });
    res.status(200).json({ success: true, message: "Booking completed successfully" });
  } catch (err) {
    console.error("Error completing booking:", err);
    res.status(500).json({ success: false, message: "Error completing booking" });
  }
});

// ========================================
// Home Route
// ========================================

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// ========================================
// Start Server
// ========================================

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}