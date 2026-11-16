import "dotenv/config";
import jwt from "jsonwebtoken";

const BASE = "http://localhost:3001";
const STUDIO = "6ae8183f72ee36ae9c86fa62"; // Contemporary Art Workshop
const DATE = "2026-11-20";
const TOKEN = jwt.sign({ email: "tester@test.com", name: "Tester" }, process.env.JWT_SECRET);

function booking(studioId, date, start, end, label) {
  return fetch(`${BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `studio_jwt=${TOKEN}` },
    body: JSON.stringify({
      studioId, studioTitle: "Test", customerName: "Tester", customerEmail: "tester@test.com",
      bookingDate: date, startTime: start, endTime: end, totalHours: 2, hourlyRate: 10,
      securityDeposit: 0, totalPrice: 20,
    }),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), label }));
}

const results = [];
// 1. Base booking 10:00-12:00 -> should be 201
results.push(await booking(STUDIO, DATE, "10:00", "12:00", "base 10-12"));
// 2. Overlap 11:00-13:00 -> should be 409
results.push(await booking(STUDIO, DATE, "11:00", "13:00", "overlap 11-13"));
// 3. Adjacent 12:00-14:00 -> should be 201
results.push(await booking(STUDIO, DATE, "12:00", "14:00", "adjacent 12-14"));

console.log(JSON.stringify(results, null, 2));