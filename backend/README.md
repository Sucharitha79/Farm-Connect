# FarmLink Backend

REST API for the FarmLink farmer-to-buyer price discovery platform. MongoDB, accessed through Mongoose, stores user accounts, verification challenges, listings, bids, orders, workers, equipment, and bookings across server restarts. The backend requires a valid `MONGODB_URI` before it starts.

## Setup

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set `MONGODB_URI` in `.env` to your MongoDB Atlas connection string (replace the username, password, and cluster host placeholders), set `JWT_SECRET` to a long, random private value, and configure the SMTP values. For Gmail, use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, and `SMTP_SECURE=false`; create an App Password after enabling 2-Step Verification and set it as `SMTP_PASSWORD` without spaces. Keep `SMTP_USER` and `SMTP_FROM` aligned with the sender account. In Atlas, create a database user and allow your current IP in Network Access. OTP email delivery will fail with a clear `503` until `SMTP_HOST` and `SMTP_FROM` are configured; SMTP authentication is optional, but `SMTP_USER` and `SMTP_PASSWORD` must be set together. Then run:

Product and equipment image uploads require a Cloudinary account. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `backend/.env`; never add these values to frontend environment variables. Uploads accept JPG, JPEG, PNG, or WEBP images up to 5 MB. Files are held in memory during validation and uploaded to Cloudinary; MongoDB stores each secure image URL and Cloudinary public ID. Without these values, image uploads return a clear `503` configuration error.

```powershell
npm run dev
```

If Node.js reports `querySrv ECONNREFUSED` while resolving your MongoDB Atlas hostname, configure `MONGODB_DNS_SERVERS` with a trusted DNS resolver (for example, `1.1.1.1`). This changes DNS resolution for the backend process.

The API listens on `http://localhost:5000` by default. Set `PORT` to use a different port if 5000 is already occupied. `CORS_ORIGIN` accepts a comma-separated list of allowed origins; the default and example allow Vite development origins at `http://localhost:5173` and `http://127.0.0.1:5173`.

## Conventions

- JSON request and response bodies; auth responses use `{ "success", "message", "data" }`, and errors use `{ "success": false, "message": "..." }`.
- Authentication uses `Authorization: Bearer <token>`.
- `authenticateToken` verifies the JWT; `authorizeRole('worker')` and other role arguments restrict routes to allowed roles. Existing `authenticate` and `authorize` exports remain available for the original routes.
- Roles are `farmer`, `buyer`, `worker`, `equipment_owner`, and `admin`. Public registration allows the first four; admin accounts remain restricted to the trusted seed configuration.
- OTPs are sent by email, stored as salted scrypt hashes, expire in 5 minutes, allow at most 5 verification attempts, and can be resent after 60 seconds. OTP values are never returned by the API.
- Set both `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` to provision an admin account at startup. Keep these values private.
- Bid `bidAmount` and analytics prices are per-unit prices; order `totalPrice` is per-unit price multiplied by bid quantity.
- Listing and bid searches are case-insensitive partial matches.

## API

### Authentication

| Method | Path | Access | Body |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `{ "name", "email", "mobileNumber", "password", "role", "location?" }` |
| POST | `/api/auth/register/verify` | Public | `{ "verificationId", "otp" }` |
| POST | `/api/auth/register/resend-otp` | Public | `{ "email" }` |
| POST | `/api/auth/login` | Public | `{ "email", "password" }`; returns JWT for a verified account |
| GET | `/api/auth/profile` | Any signed-in user | — |
| PUT | `/api/auth/profile` | Any signed-in user | Editable name, phone, and location/profile fields |

Passwords must be 8–72 characters and contain a letter and a number. Passwords are stored as bcrypt hashes. Register with roles `farmer`, `buyer`, `worker`, or `equipment_owner`. Admin users are not publicly registerable.

### Authentication example

1. Register:

```http
POST /api/auth/register
Content-Type: application/json
```

json
{
  "name": "Asha Farmer",
  "email": "asha@example.com",
  "mobileNumber": "+91 9876543210",
  "password": "FarmLink123",
  "role": "farmer",
  "location": "Nashik"
}


The response contains a `verificationId`; the six-digit OTP is sent to the email address, not returned in JSON:

```json
{
  "success": true,
  "message": "Verification OTP sent to your email.",
  "data": {
    "verificationId": "replace-with-response-id",
    "email": "asha@example.com"
  }
}
```

2. Verify registration:

```http
POST /api/auth/register/verify
Content-Type: application/json
```

```json
{
  "verificationId": "replace-with-response-id",
  "otp": "123456"
}
```

3. Log in using the password:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "asha@example.com",
  "password": "FarmLink123"
}
```

Successful login returns `{ "success": true, "message": "Login successful.", "data": { "user": {}, "token": "..." } }` without a login OTP. The `user` object does not contain a password hash. Send the token as `Authorization: Bearer <token>` to protected endpoints. Registration OTP sends are rate-limited to one send per email every 60 seconds.

Use the Thunder Client extension or Postman to create the requests above. Keep the API base URL as `http://localhost:5000` and set each request body to JSON. Copy the registration OTP from the configured mailbox; after registration verification, log in with the email and password to receive a JWT for protected requests.

## Files added for OTP authentication

- `utils/generateOTP.js` creates cryptographically random six-digit OTPs, stores only salted scrypt hashes, and compares values in constant time.
- `utils/emailService.js` sends registration OTP emails through Nodemailer using SMTP environment variables.

Authentication and short-lived OTP challenges are stored in MongoDB. OTP values are stored only as salted hashes. Worker, Equipment, and Booking APIs are implemented below.

## Worker APIs

Worker endpoints require an authenticated `worker` role, except the directory and individual profile routes, which are available to authenticated farmers, workers, and admins.

| Method | Path | Access | Details |
|---|---|---|---|
| POST | `/api/workers` | Worker | Create the signed-in worker's profile |
| GET | `/api/workers?location=&skill=&wageType=&minWage=&maxWage=` | Farmer, worker, admin | Search available workers by location, skill, rate type, and wage range |
| GET | `/api/workers/:id` | Farmer, worker, admin | Get a worker profile |
| PUT | `/api/workers/:id` | Owning worker | Update one or more profile fields |
| DELETE | `/api/workers/:id` | Owning worker | Delete profile if there are no pending or accepted jobs |
| GET | `/api/workers/my-profile` | Worker | Get own profile |
| GET | `/api/workers/jobs` | Worker | View pending farmer job requests |
| GET | `/api/workers/my-jobs` | Worker | View all bookings, including pending and completed jobs |
| PUT | `/api/workers/jobs/:bookingId/accept` | Worker provider | Accept a pending job on an available date |
| PUT | `/api/workers/jobs/:bookingId/reject` | Worker provider | Reject a pending job |

Example `POST /api/workers` body:

```json
{
  "fullName": "Kiran Worker",
  "mobileNumber": "+91 9876543210",
  "location": "Nashik",
  "skills": ["Planting", "Harvesting", "Irrigation"],
  "wageType": "daily",
  "wageAmount": 800,
  "experienceYears": 4,
  "availableDates": ["2027-01-15", "2027-01-16"],
  "isAvailable": true
}
```

Wage types are `daily` and `hourly`; wage must be positive, experience must be from 0 to 80 years, and availability dates must be today or later in `YYYY-MM-DD` format. The directory includes only workers with `isAvailable: true` and at least one future available date. `minWage` and `maxWage` are optional non-negative filters. Workers can toggle `isAvailable` without deleting their date schedule; unavailable workers cannot receive new bookings.

Worker profile create/update accepts JSON or `multipart/form-data`. For an optional persistent profile photo, send the file in the `image` field. Images must be JPG, PNG, or WEBP and at most 5 MB; Cloudinary credentials must be configured in the backend environment. Send `removeImage=true` to remove an existing photo instead of replacing it.

### Worker module files

- `controllers/workerController.js` contains worker profile validation and create/read/update/delete operations, directory filtering, and job request decisions.
- `routes/workerRoutes.js` maps worker URLs to controller functions and applies authentication and role checks.
- `models/index.js` defines the persisted MongoDB collections used by the API.
- `test/workers.test.js` tests worker profile permissions, directory filtering, date availability, and job request status handling.

## Equipment APIs

Equipment endpoints require an authenticated user. Equipment owners manage their own listings and rental history; farmers can browse listings and view details; admins can browse inventory.

| Method | Path | Access | Details |
|---|---|---|---|
| POST | `/api/equipment` | Equipment owner | Create a rental listing |
| GET | `/api/equipment?search=&category=&location=&rentalRateType=` | Farmer, equipment owner, admin | Search listings currently available |
| GET | `/api/equipment/:id` | Farmer, equipment owner, admin | View equipment details |
| PUT | `/api/equipment/:id` | Owning equipment owner | Update listing fields |
| DELETE | `/api/equipment/:id` | Owning equipment owner | Delete if there are no pending or accepted rentals |
| GET | `/api/equipment/my-listings` | Equipment owner | View own listings |
| GET | `/api/equipment/my-bookings` | Equipment owner | View rental history |

Example `POST /api/equipment` multipart form:

```text
equipmentName=Farm Tractor
category=Tractor
description=55 HP tractor with operator option.
rentalRateType=daily
rentalPrice=12000
location=Nashik
availableDates=["2027-01-15","2027-01-16"]
image=<selected file in the image field>
```

For updates, send the changed listing fields as multipart form data; set `removeImage=true` to remove its current image, or send a replacement file in the `image` field. Do not send both. `rentalRateType` must be `hourly` or `daily`; rental price must be greater than zero; availability dates must be today or later in `YYYY-MM-DD` format. An owner cannot remove dates already used by pending or accepted rentals. Rental request creation and accept/reject/cancel/complete actions are part of the Booking API. `my-bookings` reads persisted equipment bookings.

### Equipment module files

- `controllers/equipmentController.js` validates and manages equipment listings, availability-aware search, and owner rental history.
- `routes/equipmentRoutes.js` maps equipment URLs to controller functions and restricts them by role.
- Equipment listings and bookings are stored in MongoDB.
- `utils/validation.js` provides shared available-date validation for Worker and Equipment profiles/listings.
- `test/equipment.test.js` covers listing permissions, filtering, availability conflicts, and booking history.

## Booking APIs

All booking endpoints require a JWT. Farmers create bookings. Workers and equipment owners can decide bookings assigned to them. Farmers can cancel their own requests; the assigned provider can complete an accepted booking. Admins can view all bookings and perform the status actions.

| Method | Path | Access | Details |
|---|---|---|---|
| POST | `/api/bookings` | Farmer | Request a worker or equipment booking |
| GET | `/api/bookings` | Farmer, worker, equipment owner, admin | List bookings for the signed-in user; admins see all |
| GET | `/api/bookings/my-bookings` | Farmer, worker, equipment owner | View own booking history |
| GET | `/api/bookings/:id` | Booking participants or admin | View booking details |
| PUT | `/api/bookings/:id/accept` | Assigned provider or admin | Accept a pending request |
| PUT | `/api/bookings/:id/reject` | Assigned provider or admin | Reject a pending request |
| PUT | `/api/bookings/:id/cancel` | Requesting farmer or admin | Cancel a pending or accepted booking |
| PUT | `/api/bookings/:id/complete` | Assigned provider or admin | Complete an accepted booking |

Example `POST /api/bookings` request for a worker:

```json
{
  "serviceType": "WORKER",
  "serviceId": "worker-profile-id",
  "workType": "Harvesting",
  "description": "Harvest and sort the produce in the north field.",
  "bookingDate": "2027-01-15",
  "duration": 2,
  "location": "Nashik"
}
```

For equipment, set `serviceType` to `EQUIPMENT` and `serviceId` to the equipment listing ID. Duration must be a whole number: hourly listings accept 1–24 hours and daily listings accept 1–30 days. Daily bookings require the provider to be available for every date in the requested period. The server calculates `totalPrice` as the provider's current hourly/daily rate multiplied by duration. Dates use `YYYY-MM-DD` and cannot be in the past.

Bookings use statuses `Pending`, `Accepted`, `Rejected`, `Cancelled`, and `Completed`. For workers, a pending or accepted booking blocks overlapping dates for further requests; acceptance also checks for overlapping bookings. Equipment booking behavior remains unchanged. Rejected, cancelled, and completed bookings are terminal. Booking creation and status changes are stored in MongoDB.

### Booking module files

- `controllers/bookingController.js` creates bookings, calculates prices, scopes reads to booking participants, checks date availability/conflicts, and enforces status transitions.
- `routes/bookingRoutes.js` exposes the booking API and applies authentication and role restrictions.
- Bookings, workers, and equipment are persisted in MongoDB.
- `test/bookings.test.js` exercises worker and equipment requests, access restrictions, conflicts, pricing, and booking status lifecycles.

### Produce

| Method | Path | Access | Details |
|---|---|---|---|
| GET | `/api/produce?search=&category=&location=` | Public | Available listings |
| GET | `/api/produce/:id` | Public | Listing details |
| GET | `/api/produce/mine` | Farmer | Own listings, including closed |
| POST | `/api/produce` | Farmer | Create listing |
| PATCH | `/api/produce/:id` | Owning farmer | Update available listing |
| DELETE | `/api/produce/:id` | Owning farmer | Delete listing without an order |

Create/update fields: `produceName`, `category`, `quantity`, `unit`, `expectedPrice`, `location`, optional `description`, and an optional image file in the multipart `image` field. Set `removeImage=true` on update to remove the current image. Quantity and expected price must be greater than zero.

### Bids

| Method | Path | Access | Details |
|---|---|---|---|
| POST | `/api/bids` | Buyer | `{ "produceId", "bidAmount", "quantity", "message?" }` |
| GET | `/api/bids/mine` | Buyer | Own bids |
| GET | `/api/bids/produce/:produceId` | Listing farmer or admin | Bids ranked by price and `highestBid` |
| PATCH | `/api/bids/:id` | Owning buyer | Update pending bid fields or `{ "status": "withdrawn" }` |
| PATCH | `/api/bids/:id/decision` | Listing farmer | `{ "status": "accepted" }` or `{ "status": "rejected" }` |

Only bids on available listings are accepted. Accepting a bid closes that listing, rejects its other pending bids, and creates one order.

### Orders

| Method | Path | Access | Details |
|---|---|---|---|
| GET | `/api/orders/mine` | Buyer or farmer | Orders where the user is a participant |
| GET | `/api/orders/:id` | Order participants or admin | Accepts order UUID or order number |
| PATCH | `/api/orders/:id/status` | Participant or admin | `{ "status": "..." }` |

Statuses: `Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`. The farmer advances fulfillment (`Confirmed` → `Processing` → `Shipped` → `Delivered`); the buyer can cancel a `Pending` or `Confirmed` order. Admins may make any valid transition.

### Admin

All routes require an admin token.

| Method | Path | Details |
|---|---|---|
| GET | `/api/admin/dashboard` | Counts for users, listings, bids, orders, workers, and equipment |
| GET | `/api/admin/users` | User list (without password hashes) |
| PATCH | `/api/admin/users/:id/block` | `{ "isBlocked": true }` or `false` |
| GET | `/api/admin/produce` | All listings |
| DELETE | `/api/admin/produce/:id` | Remove inappropriate listing without an order |
| GET | `/api/admin/bids` | All bids |
| GET | `/api/admin/orders` | All orders |
| GET | `/api/admin/equipment` | All equipment listings |
| GET | `/api/admin/bookings` | All worker and equipment bookings |

### Price analytics

`GET /api/analytics/prices?produceName=&category=&location=` summarizes accepted bid prices per unit, grouped by produce name, category, and location. The response includes accepted bid count, average, lowest, and highest prices. Analytics are calculated from accepted bids and listings stored in MongoDB; no separate price-history collection is maintained.

## Health check

`GET /api/health` returns `{ "status": "ok" }`.

## Testing

Run `npm test` for the Node.js test suite. Tests explicitly use an in-memory repository and do not require a MongoDB connection; normal server startup requires MongoDB.
