
import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api";

const emptyEmployee = {
  employeeId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "IT",
  designation: "",
  salary: "",
  joiningDate: "",
  status: "Active",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    color: "#1e293b",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(15,23,42,0.06)",
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    fontSize: "14px",
  },
  button: {
    padding: "10px 15px",
    border: "none",
    borderRadius: "7px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  secondaryButton: {
    padding: "10px 15px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: "bold",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "bold",
    marginBottom: "6px",
  },
};

const cellStyle = {
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "middle",
};

function alertStyle(type) {
  const isError = type === "error";

  return {
    padding: "12px",
    borderRadius: "7px",
    background: isError ? "#fee2e2" : "#dcfce7",
    color: isError ? "#991b1b" : "#166534",
    fontSize: "14px",
    overflowWrap: "anywhere",
  };
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyEmployee);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function apiRequest(url, options = {}) {
    const currentToken = localStorage.getItem("token") || token;

    const headers = { ...(options.headers || {}) };

    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    let response;

    try {
      response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers,
      });
    } catch {
      throw new Error(
        "Backend connect nahi ho raha. Check karo server port 5000 par chal raha hai."
      );
    }

    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken("");
      setUser(null);
      setEmployees([]);
      throw new Error("Session expired. Please login again.");
    }

    if (!response.ok) {
      throw new Error(result.message || "Request failed.");
    }

    return result;
  }

  async function loadEmployees() {
    if (!localStorage.getItem("token") && !token) return;

    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/employees");

      const list = Array.isArray(result)
        ? result
        : result.employees || result.data || [];

      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(getErrorMessage(err, "Employees load nahi hue."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadEmployees();
    } else {
      setEmployees([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAuth(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const endpoint =
        authMode === "login" ? "/auth/login" : "/auth/register";

      const payload =
        authMode === "login"
          ? {
              email: authForm.email,
              password: authForm.password,
            }
          : authForm;

      const result = await apiRequest(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const receivedToken = result.token || result.accessToken;
      const receivedUser = result.user || result.data?.user || null;

      if (!receivedToken) {
        throw new Error(
          "Login response mein token nahi mila. Backend auth controller check karo."
        );
      }

      localStorage.setItem("token", receivedToken);
      setToken(receivedToken);

      if (receivedUser) {
        localStorage.setItem("user", JSON.stringify(receivedUser));
        setUser(receivedUser);
      }

      setMessage(
        authMode === "login"
          ? "Login successful!"
          : "Registration successful!"
      );

      setAuthForm({ name: "", email: "", password: "" });
    } catch (err) {
      setError(getErrorMessage(err, "Authentication failed."));
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setEmployees([]);
    setForm(emptyEmployee);
    setEditingId(null);
    setShowForm(false);
    setMessage("Logged out successfully.");
    setError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function startAddEmployee() {
    setForm(emptyEmployee);
    setEditingId(null);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function startEditEmployee(employee) {
    setEditingId(employee._id || employee.id);

    setForm({
      employeeId: employee.employeeId || "",
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "IT",
      designation: employee.designation || "",
      salary: employee.salary ?? "",
      joiningDate: employee.joiningDate
        ? String(employee.joiningDate).slice(0, 10)
        : "",
      status: employee.status || "Active",
    });

    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleEmployeeSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const payload = {
        ...form,
        salary: Number(form.salary),
      };

      const isEditing = Boolean(editingId);
      const endpoint = isEditing
        ? `/employees/${editingId}`
        : "/employees";

      await apiRequest(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setMessage(
        isEditing
          ? "Employee updated successfully!"
          : "Employee added successfully!"
      );

      setForm(emptyEmployee);
      setEditingId(null);
      setShowForm(false);
      await loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err, "Employee save nahi hua."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
    const id = employee._id || employee.id;

    if (!id) {
      setError("Employee ID nahi mila.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${employee.firstName} ${employee.lastName}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await apiRequest(`/employees/${id}`, {
        method: "DELETE",
      });

      setMessage("Employee deleted successfully.");
      await loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err, "Employee delete nahi hua."));
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const fullName =
        `${employee.firstName || ""} ${employee.lastName || ""}`.toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        String(employee.employeeId || "").toLowerCase().includes(query) ||
        String(employee.email || "").toLowerCase().includes(query) ||
        String(employee.department || "").toLowerCase().includes(query) ||
        String(employee.designation || "").toLowerCase().includes(query);

      const matchesDepartment =
        departmentFilter === "All" ||
        employee.department === departmentFilter;

      const matchesStatus =
        statusFilter === "All" || employee.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, search, departmentFilter, statusFilter]);

  const totalEmployees = employees.length;

  const activeEmployees = employees.filter(
    (employee) => employee.status === "Active"
  ).length;

  const inactiveEmployees = employees.filter(
    (employee) => employee.status === "Inactive"
  ).length;

  const onLeaveEmployees = employees.filter(
    (employee) => employee.status === "On Leave"
  ).length;

  const totalSalary = employees.reduce(
    (total, employee) => total + (Number(employee.salary) || 0),
    0
  );

  const departments = useMemo(
    () => [
      "All",
      ...new Set(
        employees
          .map((employee) => employee.department)
          .filter(Boolean)
      ),
    ],
    [employees]
  );

  const departmentData = useMemo(() => {
    const counts = {};

    employees.forEach((employee) => {
      const department = employee.department || "Other";
      counts[department] = (counts[department] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  const maxDepartmentCount = Math.max(
    1,
    ...departmentData.map((item) => item.count)
  );

  // CSV EXPORT
  function exportCSV() {
    if (filteredEmployees.length === 0) {
      setError("Export karne ke liye employees nahi hain.");
      return;
    }

    const columns = [
      "employeeId",
      "firstName",
      "lastName",
      "email",
      "phone",
      "department",
      "designation",
      "salary",
      "joiningDate",
      "status",
    ];

    function escapeCSV(value) {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    }

    // Fixed: missing variable name
    const rows = [
      columns.join(","),
      ...filteredEmployees.map((employee) =>
        columns
          .map((column) => {
            const value =
              column === "joiningDate" && employee[column]
                ? String(employee[column]).slice(0, 10)
                : employee[column];

            return escapeCSV(value);
          })
          .join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + rows.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "employees.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setError("");
    setMessage("CSV export successful!");
  }

  // CSV IMPORT
  async function importCSV(event) {
    const input = event.target;
    const file = input.files?.[0];

    input.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please CSV file select karo.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const result = await apiRequest("/employees/import", {
        method: "POST",
        body: formData,
      });

      setMessage(result.message || "CSV import successful!");
      await loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err, "CSV import failed."));
    } finally {
      setSaving(false);
    }
  }

  // LOGIN SCREEN
  if (!token) {
    return (
      <div
        style={{
          ...styles.page,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ ...styles.card, width: "100%", maxWidth: "420px" }}>
          <h1 style={{ textAlign: "center", marginBottom: "8px" }}>
            Employee Management
          </h1>

          <p style={{ textAlign: "center", color: "#64748b" }}>
            {authMode === "login"
              ? "Login to your dashboard"
              : "Create your account"}
          </p>

          {error && <p style={alertStyle("error")}>{error}</p>}
          {message && <p style={alertStyle("success")}>{message}</p>}

          <form onSubmit={handleAuth}>
            {authMode === "register" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.input}
                  name="name"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      name: event.target.value,
                    })
                  }
                  required
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                name="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    email: event.target.value,
                  })
                }
                required
                placeholder="Enter your email"
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                name="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    password: event.target.value,
                  })
                }
                required
                minLength={6}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{ ...styles.button, width: "100%" }}
            >
              {saving
                ? "Please wait..."
                : authMode === "login"
                  ? "Login"
                  : "Register"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "20px" }}>
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              style={{
                border: "none",
                background: "none",
                color: "#2563eb",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setError("");
                setMessage("");
              }}
            >
              {authMode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div style={styles.page}>
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            ...styles.container,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Employee Management System</h2>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              Manage your employees in one place
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "14px" }}>
              {user?.name || user?.email || "Logged in"}
            </span>
            <button style={styles.secondaryButton} onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={styles.container}>
        {error && <p style={alertStyle("error")}>{error}</p>}
        {message && <p style={alertStyle("success")}>{message}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          <StatCard title="Total Employees" value={totalEmployees} />
          <StatCard title="Active Employees" value={activeEmployees} />
          <StatCard title="Inactive Employees" value={inactiveEmployees} />
          <StatCard title="On Leave" value={onLeaveEmployees} />
          <StatCard
            title="Total Monthly Salary"
            value={formatCurrency(totalSalary)}
          />
        </div>

        <section style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Employees by Department</h3>

          {departmentData.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              Department chart dikhane ke liye employees add karo.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {departmentData.map((item) => (
                <div key={item.department}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <span>{item.department}</span>
                    <strong>{item.count}</strong>
                  </div>

                  <div
                    style={{
                      height: "12px",
                      borderRadius: "20px",
                      background: "#e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(item.count / maxDepartmentCount) * 100}%`,
                        background: "#2563eb",
                        borderRadius: "20px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showForm && (
          <section style={styles.card}>
            <h3 style={{ marginTop: 0 }}>
              {editingId ? "Edit Employee" : "Add New Employee"}
            </h3>

            <form onSubmit={handleEmployeeSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <FormField label="Employee ID">
                  <input
                    style={styles.input}
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleFormChange}
                    required
                    placeholder="EMP001"
                  />
                </FormField>

                <FormField label="First Name">
                  <input
                    style={styles.input}
                    name="firstName"
                    value={form.firstName}
                    onChange={handleFormChange}
                    required
                  />
                </FormField>

                <FormField label="Last Name">
                  <input
                    style={styles.input}
                    name="lastName"
                    value={form.lastName}
                    onChange={handleFormChange}
                    required
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    style={styles.input}
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    required
                  />
                </FormField>

                <FormField label="Phone">
                  <input
                    style={styles.input}
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="Phone number"
                  />
                </FormField>

                <FormField label="Department">
                  <select
                    style={styles.input}
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Other">Other</option>
                  </select>
                </FormField>

                <FormField label="Designation">
                  <input
                    style={styles.input}
                    name="designation"
                    value={form.designation}
                    onChange={handleFormChange}
                    required
                    placeholder="Software Developer"
                  />
                </FormField>

                <FormField label="Salary">
                  <input
                    style={styles.input}
                    type="number"
                    name="salary"
                    value={form.salary}
                    onChange={handleFormChange}
                    min="0"
                    required
                  />
                </FormField>

                <FormField label="Joining Date">
                  <input
                    style={styles.input}
                    type="date"
                    name="joiningDate"
                    value={form.joiningDate}
                    onChange={handleFormChange}
                    required
                  />
                </FormField>

                <FormField label="Status">
                  <select
                    style={styles.input}
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </FormField>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="submit"
                  disabled={saving}
                  style={styles.button}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Employee"
                      : "Save Employee"}
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyEmployee);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={styles.card}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 6px" }}>Employee Directory</h3>
              <span style={{ color: "#64748b", fontSize: "13px" }}>
                Showing {filteredEmployees.length} of {totalEmployees} employees
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <button style={styles.button} onClick={startAddEmployee}>
                + Add Employee
              </button>

              <button style={styles.secondaryButton} onClick={exportCSV}>
                Export CSV
              </button>

              <label
                style={{
                  ...styles.secondaryButton,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {saving ? "Please wait..." : "Import CSV"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={importCSV}
                  disabled={saving}
                  style={{ display: "none" }}
                />
              </label>

              <button
                style={styles.secondaryButton}
                onClick={loadEmployees}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <input
              style={styles.input}
              placeholder="Search name, ID, email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              style={styles.input}
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department === "All" ? "All Departments" : department}
                </option>
              ))}
            </select>

            <select
              style={styles.input}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "950px",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  {[
                    "Employee ID",
                    "Name",
                    "Email",
                    "Department",
                    "Designation",
                    "Salary",
                    "Joining Date",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "13px 10px",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee) => {
                  const id = employee._id || employee.id;

                  return (
                    <tr key={id || employee.employeeId}>
                      <td style={cellStyle}>{employee.employeeId || "-"}</td>
                      <td style={cellStyle}>
                        {employee.firstName} {employee.lastName}
                      </td>
                      <td style={cellStyle}>{employee.email || "-"}</td>
                      <td style={cellStyle}>{employee.department || "-"}</td>
                      <td style={cellStyle}>{employee.designation || "-"}</td>
                      <td style={cellStyle}>
                        {formatCurrency(employee.salary)}
                      </td>
                      <td style={cellStyle}>
                        {employee.joiningDate
                          ? String(employee.joiningDate).slice(0, 10)
                          : "-"}
                      </td>
                      <td style={cellStyle}>
                        <span
                          style={{
                            padding: "5px 8px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            background:
                              employee.status === "Active"
                                ? "#dcfce7"
                                : employee.status === "Inactive"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                            color:
                              employee.status === "Active"
                                ? "#166534"
                                : employee.status === "Inactive"
                                  ? "#991b1b"
                                  : "#92400e",
                          }}
                        >
                          {employee.status || "Active"}
                        </span>
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: "flex", gap: "7px" }}>
                          <button
                            style={{
                              ...styles.button,
                              padding: "7px 10px",
                              fontSize: "12px",
                            }}
                            onClick={() => startEditEmployee(employee)}
                          >
                            Edit
                          </button>

                          <button
                            style={{
                              ...styles.button,
                              background: "#dc2626",
                              padding: "7px 10px",
                              fontSize: "12px",
                            }}
                            onClick={() => deleteEmployee(employee)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        padding: "30px",
                        color: "#64748b",
                      }}
                    >
                      {loading
                        ? "Loading employees..."
                        : "No employees found. Add an employee or change your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
          }}
        >
          Employee Management System · MERN Stack
        </p>
      </main>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={{ ...styles.card, marginBottom: 0 }}>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: "14px",
          color: "#64748b",
        }}
      >
        {title}
      </p>
      <h2 style={{ margin: 0, fontSize: "25px" }}>{value}</h2>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}
