import "dotenv/config";
import jwt from "jsonwebtoken";

const BASE = "http://localhost:3001";
const STUDIO = "6ae8183f72ee36ae9c86fa62";
const TOKEN = jwt.sign({ email: "tester@test.com", name: "Tester" }, process.env.JWT_SECRET);

async function postBooking(studioId, date, start, end) {
  const r = await fetch(`${BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `studio_jwt=${TOKEN}` },
    body: JSON.stringify({
      studioId, studioTitle: "T", customerName: "T", customerEmail: "tester@test.com",
      bookingDate: date, startTime: start, endTime: end, totalHours: 1, hourlyRate: 10,
      securityDeposit: 0, totalPrice: 10,
    }),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const date = "2026-11-22";
const reqs = [];
for (let i = 0; i < 5; i++) {
  reqs.push(postBooking(STUDIO, date, "10:00", "11:00"));
}
const results = await Promise.all(reqs);
console.log(JSON.stringify(results.map(r => ({ status: r.status, id: r.body.bookingId || null })), null, 2));
const ok = results.filter(r => r.status === 201).length;
const conflicts = results.filter(r => r.status === 409).length;
console.log(`\nSummary: ${ok} succeeded, ${conflicts} rejected (expect 1 success, 4 rejected)`);
