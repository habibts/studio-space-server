import express from "express";
import { MongoClient } from 'mongodb';
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

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});