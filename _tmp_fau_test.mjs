import "dotenv/config";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db("studiospace");
const col = db.collection("_tmp_test");

await col.deleteMany({});

const newBooking = {
  studioId: "test",
  bookingDate: "2026-11-23",
  startTime: "10:00",
  endTime: "11:00",
  status: "Pending",
  createdAt: new Date(),
};

const r1 = await col.findOneAndUpdate(
  {
    studioId: "test",
    bookingDate: "2026-11-23",
    status: { $in: ["Pending", "Confirmed"] },
    startTime: { $lt: "11:00" },
    endTime: { $gt: "10:00" },
  },
  { $setOnInsert: newBooking },
  { upsert: true, returnDocument: "after" }
);
console.log("CASE 1 (no prior match):");
console.log("  keys:", Object.keys(r1));
console.log("  value:", r1.value ? JSON.stringify({ _id: String(r1.value._id), status: r1.value.status, createdAt: r1.value.createdAt }) : null);
console.log("  lastErrorObject:", JSON.stringify(r1.lastErrorObject));

const r2 = await col.findOneAndUpdate(
  {
    studioId: "test",
    bookingDate: "2026-11-23",
    status: { $in: ["Pending", "Confirmed"] },
    startTime: { $lt: "11:00" },
    endTime: { $gt: "10:00" },
  },
  { $setOnInsert: { ...newBooking, createdAt: new Date() } },
  { upsert: true, returnDocument: "after" }
);
console.log("CASE 2 (prior match):");
console.log("  value:", r2.value ? JSON.stringify({ _id: String(r2.value._id), status: r2.value.status }) : null);
console.log("  lastErrorObject:", JSON.stringify(r2.lastErrorObject));

const count = await col.countDocuments({});
console.log("Total docs in collection (expect 1):", count);

await col.drop();
await client.close();
