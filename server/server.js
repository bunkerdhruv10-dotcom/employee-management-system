
require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const employeeRoutes = require("./routes/employeeRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Employee API routes
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", authRoutes);
// Home route
app.get("/", (req, res) => {
  res.send("Employee Management Backend is running");
});

// Health check route
app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected
      ? "Employee Management API and database are running"
      : "API is running, but database is not connected",
    database: connected ? "connected" : "disconnected",
  });
});

// Start server
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();