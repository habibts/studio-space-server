# Studio Space Server

Express API for Studio Space. The app can run locally with Node.js or deploy to Vercel as an Express function.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_URL`.
3. Start the server with `npm start`. It listens on port `3001` by default; set `PORT` to override it.

## Deploy to Vercel

1. Import this repository into Vercel and set the project root to `studio-space-server` if deploying from the repository's parent directory.
2. Add these environment variables in the Vercel project settings for each deployment environment:
   - `MONGODB_URI`: MongoDB connection string. Ensure the database permits connections from your deployment.
   - `JWT_SECRET`: A long, random secret used to verify authentication tokens.
   - `FRONTEND_URL`: Additional frontend origins, for example `https://your-frontend.vercel.app` (no trailing slash). The production frontend and `http://localhost:3000` are allowed by default. To allow multiple additional origins, separate them with commas.
3. Deploy. Vercel detects the root Express app in `index.js`; no custom build command or output directory is required.

Do not commit `.env` or put production secrets in `.env.example`.
