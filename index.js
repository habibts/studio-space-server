import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
// Add New Studio
// ========================================

app.post("/add-studio", async (req, res) => {
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
      hostName: req.body.hostName,
      hostEmail: req.body.hostEmail,
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

app.post("/bookings", async (req, res) => {
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
      customerName,
      customerEmail: customerEmail.trim().toLowerCase(),
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
        hostName: req.body.hostName,
        hostEmail: req.body.hostEmail,
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
// Home Route
// ========================================

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});