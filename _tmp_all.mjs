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
const date = "2026-11-23";

// 1. Base booking 10:00-12:00 -> 201
let b1 = await postBooking(STUDIO, date, "10:00", "12:00");
results.push({ step: "base 10-12", expect: 201, ...b1 });

// 2. Overlap 11:00-13:00 -> 409
let b2 = await postBooking(STUDIO, date, "11:00", "13:00");
results.push({ step: "overlap 11-13", expect: 409, ...b2 });

// 3. Adjacent 12:00-14:00 -> 201
let b3 = await postBooking(STUDIO, date, "12:00", "14:00");
results.push({ step: "adjacent 12-14", expect: 201, ...b3 });

// 4. Cancelled releases: create 09:00-10:00, cancel, then overlap 09:30-10:30 -> 201
let c1 = await postBooking(STUDIO, date, "09:00", "10:00");
if (c1.status === 201) await patchStatus(c1.body.bookingId, "cancel");
let c2 = await postBooking(STUDIO, date, "09:30", "10:30");
results.push({ step: "after cancel overlap 09:30-10:30", expect: 201, ...c2 });

// 5. Completed releases: create 15:00-16:00, confirm, complete, then overlap 15:30-16:30 -> 201
let d1 = await postBooking(STUDIO, date, "15:00", "16:00");
if (d1.status === 201) { await patchStatus(d1.body.bookingId, "confirm"); await patchStatus(d1.body.bookingId, "complete"); }
let d2 = await postBooking(STUDIO, date, "15:30", "16:30");
results.push({ step: "after complete overlap 15:30-16:30", expect: 201, ...d2 });

// 6. Pending blocks
let e1 = await postBooking(STUDIO, date, "17:00", "18:00");
let e2 = await postBooking(STUDIO, date, "17:30", "18:30");
results.push({ step: "pending overlap", expect: 409, ...e2 });

// 7. Confirmed blocks
let f1 = await postBooking(STUDIO, date, "19:00", "20:00");
if (f1.status === 201) await patchStatus(f1.body.bookingId, "confirm");
let f2 = await postBooking(STUDIO, date, "19:30", "20:30");
results.push({ step: "confirmed overlap", expect: 409, ...f2 });

// 8. Concurrency: 5 simultaneous overlapping requests
const reqs = [];
for (let i = 0; i < 5; i++) reqs.push(postBooking(STUDIO, date, "21:00", "22:00"));
const conc = await Promise.all(reqs);
const ok = conc.filter(r => r.status === 201).length;
const conf = conc.filter(r => r.status === 409).length;
results.push({ step: "concurrency 5x overlap 21-22", expect: "1 success", got: `${ok} success, ${conf} rejected`, statuses: conc.map(r => r.status) });

console.log(JSON.stringify(results, null, 2));
