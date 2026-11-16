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

async function patchStatus(id, action) {
  const r = await fetch(`${BASE}/bookings/${id}/${action}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: `studio_jwt=${TOKEN}` },
    body: JSON.stringify({}),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const results = [];
const date = "2026-11-21";

let a = await postBooking(STUDIO, date, "09:00", "10:00");
results.push({ step: "A create pending 9-10", ...a });
if (a.status === 201) {
  await patchStatus(a.body.bookingId, "cancel");
  let a2 = await postBooking(STUDIO, date, "09:30", "10:30");
  results.push({ step: "A overlap after cancel (expect 201)", ...a2 });
}

let b = await postBooking(STUDIO, date, "11:00", "12:00");
results.push({ step: "B create pending 11-12", ...b });
if (b.status === 201) {
  await patchStatus(b.body.bookingId, "confirm");
  await patchStatus(b.body.bookingId, "complete");
  let b2 = await postBooking(STUDIO, date, "11:30", "12:30");
  results.push({ step: "B overlap after complete (expect 201)", ...b2 });
}

let c = await postBooking(STUDIO, date, "14:00", "15:00");
results.push({ step: "C create pending 14-15", ...c });
let c2 = await postBooking(STUDIO, date, "14:30", "15:30");
results.push({ step: "C overlap against pending (expect 409)", ...c2 });

let d = await postBooking(STUDIO, date, "16:00", "17:00");
results.push({ step: "D create pending 16-17", ...d });
if (d.status === 201) await patchStatus(d.body.bookingId, "confirm");
let d2 = await postBooking(STUDIO, date, "16:30", "17:30");
results.push({ step: "D overlap against confirmed (expect 409)", ...d2 });

console.log(JSON.stringify(results, null, 2));
