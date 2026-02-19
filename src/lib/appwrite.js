import { Client, Account, Databases } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "");

const account = new Account(client);
const databases = new Databases(client);

// Live Radio Configuration
export const LIVE_STATE_COLLECTION = {
  database: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "",
  collection: process.env.NEXT_PUBLIC_APPWRITE_LIVE_STATE_COLLECTION_ID || "live_state",
};

export { client, account, databases };
