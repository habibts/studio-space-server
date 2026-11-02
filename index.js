import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config';
import cors from 'cors';

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
    console.dir(err);
  }
}

 const mongoClient = await connectToMongoDB();
 const db = mongoClient.db("studiospace");

app.post("/add-studio", async (req, res) => {

  console.log("Received data:", req.body);

  try {
    const db = mongoClient.db("studiospace");
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

app.get("/studios", async (req, res) => {
  try {
    const db = mongoClient.db("studiospace");
    const collection = db.collection("studios");

    const studios = await collection.find({}).toArray();

    res.status(200).json({
      success: true,
      studios: studios,
    });

  } catch (err) {
    console.error("Error fetching studios:", err);

    res.status(500).json({
      success: false,
      message: "Error fetching studios",
    });
  }
});

app.get("/featured-studios", async (req, res) => {
  try {
    const db = mongoClient.db("studiospace");
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured studios",
    });
  }
});

// Get Single Studio Details
app.get("/studios/:id", async (req, res) => {
  try {
    const db = mongoClient.db("studiospace");
    const collection = db.collection("studios");

    const { id } = req.params;

    // Check valid MongoDB ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
    }

    // Find studio by ID
    const studio = await collection.findOne({
      _id: new ObjectId(id),
    });

    // Studio not found
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

// Create a New Booking
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

    // Validate required fields
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

    // Create booking object
    const newBooking = {
      studioId,
      studioTitle,
      customerName,
      customerEmail,
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

    // Get bookings collection
    const bookingsCollection = db.collection("bookings");

    // Save booking to MongoDB
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

// Get All Bookings
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


app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});