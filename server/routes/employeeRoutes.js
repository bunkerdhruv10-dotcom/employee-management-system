
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees,
} = require("../controllers/EmployeeController");

// All employee APIs require login
router.use(authMiddleware);

// Import route
router.post(
  "/import",
  upload.single("file"),
  importEmployees
);

// Existing employee routes
router.get("/", getEmployees);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

module.exports = router;
