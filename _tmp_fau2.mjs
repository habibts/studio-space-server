import "dotenv/config";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db("studiospace");
const col = db.collection("_tmp_test2");
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
  { studioId: "test", bookingDate: "2026-11-23", status: { $in: ["Pending","Confirmed"] }, startTime: { $lt: "11:00" }, endTime: { $gt: "10:00" } },
  { $setOnInsert: newBooking },
  { upsert: true, returnDocument: "after" }
);
console.log("CASE1 raw:", JSON.stringify(r1));
console.log("CASE1 type:", typeof r1, "isNull:", r1 === null);

const r2 = await col.findOneAndUpdate(
  { studioId: "test", bookingDate: "2026-11-23", status: { $in: ["Pending","Confirmed"] }, startTime: { $lt: "11:00" }, endTime: { $gt: "10:00" } },
  { $setOnInsert: { ...newBooking, createdAt: new Date() } },
  { upsert: true, returnDocument: "after" }
);
console.log("CASE2 raw:", JSON.stringify(r2));
console.log("CASE2 type:", typeof r2, "isNull:", r2 === null);

const count = await col.countDocuments({});
console.log("count (expect 1):", count);

// Also test includeResultMetadata
const r3 = await col.findOneAndUpdate(
  { studioId: "test", bookingDate: "2026-11-23", status: { $in: ["Pending","Confirmed"] }, startTime: { $lt: "11:00" }, endTime: { $gt: "10:00" } },
  { $setOnInsert: { ...newBooking, createdAt: new Date() } },
  { upsert: true, returnDocument: "after", includeResultMetadata: true }
);
console.log("CASE3 (includeResultMetadata) raw:", JSON.stringify(r3));

await col.drop();
await client.close();
