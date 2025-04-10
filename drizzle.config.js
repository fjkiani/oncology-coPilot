import * as dotenv from "dotenv";
dotenv.config();

export default {
  schema: "./src/utils/schema.jsx",
  out: "./drizzle",
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
