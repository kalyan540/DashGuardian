import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 3001; // Use PORT from .env or default to 3001
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(cors());

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Fetch access token from Dashboard
async function fetchAccessToken() {
  try {
    const body = {
      username: process.env.DASHBOARD_ADMIN_USERNAME, // Use environment variable
      password: process.env.DASHBOARD_ADMIN_PASSWORD, // Use environment variable
      provider: "db",
      refresh: true,
    };

    const response = await fetch(
      `${process.env.DASHBOARD_DOMAIN}/api/v1/security/login`, // Use environment variable
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const jsonResponse = await response.json();
    return jsonResponse?.access_token;
  } catch (e) {
    console.error(e);
  }
}

// Fetch guest token from dashboard
async function fetchGuestToken(dashboardId, userDetails, accountRoleInfo) {
  const accessToken = await fetchAccessToken();

  console.log("access token: ", accessToken);

  // Log account, role, and dashboard ID
  console.log("Dashboard ID:", dashboardId);
  console.log("Account:", accountRoleInfo.account);
  console.log("Role:", accountRoleInfo.role);

  try {
    const body = {
      resources: [
        {
          type: "dashboard",
          id: dashboardId, // Use the dashboardId from the request
        },
      ],
      rls: [
        {
          dataset: 50,
          clause: `"functionName"='${accountRoleInfo.account}'`, // Use role in RLS clause
        },
      ],
      user: {
        username: userDetails.username,
        first_name: userDetails.first_name,
        last_name: userDetails.last_name,
      },
    };

    const response = await fetch(
      `${process.env.DASHBOARD_DOMAIN}/api/v1/security/guest_token`, // Use environment variable
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        redirect: "follow",
      }
    );

    const jsonResponse = await response.json();
    console.log("token", jsonResponse.token);
    return jsonResponse?.token;
  } catch (error) {
    console.error(error);
  }
}

// Endpoint to fetch guest token
app.post("/guest-token", async (req, res) => {
  const { dashboardId, userDetails, accountRoleInfo } = req.body;

  if (!dashboardId || !userDetails || !accountRoleInfo) {
    return res.status(400).json({ error: "dashboardId, userDetails, and accountRoleInfo are required" });
  }

  const token = await fetchGuestToken(dashboardId, userDetails, accountRoleInfo);
  console.log("token received :", token);
  res.json({ token });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});