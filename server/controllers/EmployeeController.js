
const Employee = require("../models/Employee");
const fs = require("node:fs");
const csv = require("csv-parser");

// GET ALL EMPLOYEES + SEARCH
const getEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { employeeId: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { designation: searchRegex },
      ];
    }

    const employees = await Employee.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees.",
    });
  }
};

// CREATE EMPLOYEE
const createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Employee created successfully.",
      employee,
    });
  } catch (error) {
    console.error("Create employee error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create employee.",
    });
  }
};

// UPDATE EMPLOYEE
const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Update employee error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update employee.",
    });
  }
};

// DELETE EMPLOYEE
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully.",
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete employee.",
    });
  }
};

// IMPORT EMPLOYEES FROM CSV
const importEmployees = async (req, res) => {
  let filePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV file using the field name 'file'.",
      });
    }

    filePath = req.file.path;

    if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
      return res.status(400).json({
        success: false,
        message: "Only CSV files are allowed.",
      });
    }

    const rows = [];

    // Read and parse the CSV file
    await new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath);

      const csvStream = csv({
        mapHeaders: ({ header }) =>
          header.replace(/^\uFEFF/, "").trim(),
      });

      fileStream
        .pipe(csvStream)
        .on("data", (row) => {
          // Normalize header names and trim values
          const cleanRow = {};

          for (const key of Object.keys(row)) {
            const cleanKey = key.replace(/^\uFEFF/, "").trim();

            cleanRow[cleanKey] =
              typeof row[key] === "string"
                ? row[key].trim()
                : row[key];
          }

          rows.push(cleanRow);
        })
        .on("end", resolve)
        .on("error", reject);

      fileStream.on("error", reject);
    });

    console.log("CSV file:", req.file.originalname);
    console.log("CSV rows found:", rows.length);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "CSV has no data rows. Check the selected file and its contents.",
      });
    }

    // Check required columns
    const requiredColumns = [
      "employeeId",
      "firstName",
      "lastName",
      "email",
      "department",
      "designation",
      "salary",
      "joiningDate",
    ];

    const csvColumns = Object.keys(rows[0]);

    console.log("CSV columns:", csvColumns);

    const missingColumns = requiredColumns.filter(
      (column) => !csvColumns.includes(column)
    );

    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing CSV columns: ${missingColumns.join(", ")}`,
      });
    }

    // Validate and prepare employee records
    const employees = rows.map((row, index) => {
      const salaryText = row.salary;
      const salary = Number(salaryText);
      const joiningDate = new Date(row.joiningDate);

      if (
        !row.employeeId ||
        !row.firstName ||
        !row.lastName ||
        !row.email ||
        !row.department ||
        !row.designation
      ) {
        throw new Error(
          `Row ${index + 2}: A required employee field is empty.`
        );
      }

      if (
        !salaryText ||
        !Number.isFinite(salary) ||
        salary < 0
      ) {
        throw new Error(`Row ${index + 2}: Invalid salary.`);
      }

      if (
        !row.joiningDate ||
        Number.isNaN(joiningDate.getTime())
      ) {
        throw new Error(
          `Row ${index + 2}: Invalid joiningDate.`
        );
      }

      const status = row.status || "Active";

      if (!["Active", "Inactive", "On Leave"].includes(status)) {
        throw new Error(
          `Row ${index + 2}: Invalid employee status.`
        );
      }

      return {
        employeeId: row.employeeId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email.toLowerCase(),
        phone: row.phone || "",
        department: row.department,
        designation: row.designation,
        salary,
        joiningDate,
        status,
      };
    });

    // Check duplicate IDs or emails inside the CSV
    const employeeIds = employees.map(
      (employee) => employee.employeeId
    );

    const emails = employees.map(
      (employee) => employee.email
    );

    if (new Set(employeeIds).size !== employeeIds.length) {
      return res.status(400).json({
        success: false,
        message: "CSV contains duplicate employee IDs.",
      });
    }

    if (new Set(emails).size !== emails.length) {
      return res.status(400).json({
        success: false,
        message: "CSV contains duplicate email addresses.",
      });
    }

    // Check whether records already exist in MongoDB
    const existingEmployees = await Employee.find({
      $or: [
        { employeeId: { $in: employeeIds } },
        { email: { $in: emails } },
      ],
    }).select("employeeId email");

    if (existingEmployees.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Some employee IDs or email addresses already exist. Remove duplicates and try again.",
        existingEmployees,
      });
    }

    // Save employees to MongoDB
    const importedEmployees = await Employee.insertMany(
      employees,
      { ordered: true }
    );

    return res.status(201).json({
      success: true,
      message: "Employees imported successfully.",
      count: importedEmployees.length,
      employees: importedEmployees,
    });
  } catch (error) {
    console.error("Import employees error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An employee ID or email address already exists.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message && /^Row \d+:/.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to import employees.",
    });
  } finally {
    // Remove temporary uploaded file
    if (filePath) {
      await fs.promises.unlink(filePath).catch((error) => {
        if (error.code !== "ENOENT") {
          console.error(
            "Temporary CSV cleanup error:",
            error.message
          );
        }
      });
    }
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees,
};
