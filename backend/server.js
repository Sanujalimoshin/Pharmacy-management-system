const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const JWT_SECRET = "pharmacy_secret_key";

app.use(express.json());
app.use(express.static("../frontend"));

// ================= DATABASE =================

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "pharmacy_management"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("Database connected successfully!");
    }
});

// ================= AUTHENTICATION =================

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Access denied. Token required"
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: "Invalid or expired token. Please login again."
            });
        }

        req.user = user;
        next();
    });
}

// ================= ADMIN AUTHENTICATION =================

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            error: "Admin access required"
        });
    }

    next();
}

// ================= HOME =================

app.get("/", (req, res) => {
    res.send("Pharmacy Management Backend is Running!");
});

// ================= GET MEDICINES =================

app.get("/api/medicines", authenticateToken, (req, res) => {
    const sql = "SELECT * FROM medicines ORDER BY medicine_id DESC";

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                error: "Could not load medicines"
            });
        }

        res.json(results);
    });
});

// ================= ADD MEDICINE =================

app.post(
    "/api/medicines",
    authenticateToken,
    requireAdmin,
    (req, res) => {
        const {
            medicine_name,
            category,
            supplier,
            quantity,
            price
        } = req.body;

        if (
            typeof medicine_name !== "string" ||
            !medicine_name.trim() ||
            typeof category !== "string" ||
            !category.trim() ||
            typeof supplier !== "string" ||
            !supplier.trim() ||
            quantity === undefined ||
            quantity === null ||
            quantity === "" ||
            price === undefined ||
            price === null ||
            price === ""
        ) {
            return res.status(400).json({
                error: "All medicine fields are required"
            });
        }

        const qty = Number(quantity);
        const cost = Number(price);

        if (
            !Number.isInteger(qty) ||
            qty < 0 ||
            !Number.isFinite(cost) ||
            cost < 0
        ) {
            return res.status(400).json({
                error: "Enter a valid quantity and price"
            });
        }

        const sql = `
            INSERT INTO medicines
            (medicine_name, category, supplier, quantity, price)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [
                medicine_name.trim(),
                category.trim(),
                supplier.trim(),
                qty,
                cost
            ],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        error: "Could not add medicine"
                    });
                }

                res.status(201).json({
                    message: "Medicine added successfully",
                    medicine_id: result.insertId
                });
            }
        );
    }
);

// ================= UPDATE MEDICINE =================

app.put(
    "/api/medicines/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {
        const id = Number(req.params.id);

        const {
            medicine_name,
            category,
            supplier,
            quantity,
            price
        } = req.body;
        console.log("Medicine data received",req,body)

        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            typeof medicine_name !== "string" ||
            !medicine_name.trim() ||
            typeof category !== "string" ||
            !category.trim() ||
            typeof supplier !== "string" ||
            !supplier.trim() ||
            quantity === undefined ||
            quantity === null ||
            quantity === "" ||
            price === undefined ||
            price === null ||
            price === ""
        ) {
            return res.status(400).json({
                error: "Enter all valid medicine details"
            });
        }

        const qty = Number(quantity);
        const cost = Number(price);

        if (
            !Number.isInteger(qty) ||
            qty < 0 ||
            !Number.isFinite(cost) ||
            cost < 0
        ) {
            return res.status(400).json({
                error: "Enter a valid quantity and price"
            });
        }

        const sql = `
            UPDATE medicines
            SET medicine_name = ?,
                category = ?,
                supplier = ?,
                quantity = ?,
                price = ?
            WHERE medicine_id = ?
        `;

        db.query(
            sql,
            [
                medicine_name.trim(),
                category.trim(),
                supplier.trim(),
                qty,
                cost,
                id
            ],
            (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        error: "Could not update medicine"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        error: "Medicine not found"
                    });
                }

                res.json({
                    message: "Medicine updated successfully"
                });
            }
        );
    }
);

// ================= DELETE MEDICINE =================

app.delete(
    "/api/medicines/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: "Invalid medicine ID"
            });
        }

        const sql = "DELETE FROM medicines WHERE medicine_id = ?";

        db.query(sql, [id], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    error: "Could not delete medicine"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Medicine not found"
                });
            }

            res.json({
                message: "Medicine deleted successfully"
            });
        });
    }
);

// ================= REGISTER =================

app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    console.log("Received medicine data:", req.body);

const medicine_name = String(req.body.medicine_name || "").trim();
const category = String(req.body.category || "").trim();
const supplier = String(req.body.supplier || "").trim();
const quantity = req.body.quantity;
const price = req.body.price;

if (
    !medicine_name ||
    !category ||
    !supplier ||
    quantity === undefined ||
    quantity === null ||
    quantity === "" ||
    price === undefined ||
    price === null ||
    price === ""
) {
    return res.status(400).json({
        error: "All medicine fields are required"
    });
}

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (username, password)
            VALUES (?, ?)
        `;

        db.query(
            sql,
            [username.trim(), hashedPassword],
            (err, result) => {
                if (err) {
                    console.log(err);

                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            error: "Username already exists"
                        });
                    }

                    return res.status(500).json({
                        error: "Registration failed"
                    });
                }

                res.status(201).json({
                    message: "User registered successfully"
                });
            }
        );
    } catch (error) {
        console.log(error);

        res.status(500).json({
            error: "Registration failed"
        });
    }
});

// ================= LOGIN =================

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (
        typeof username !== "string" ||
        !username.trim() ||
        typeof password !== "string" ||
        !password
    ) {
        return res.status(400).json({
            error: "Username and password are required"
        });
    }

    const sql = "SELECT * FROM users WHERE username = ?";

    db.query(sql, [username.trim()], async (err, results) => {
        if (err) {
            console.log("LOGIN DATABASE ERROR:", err);

            return res.status(500).json({
                error: "Login database error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                error: "Invalid username or password"
            });
        }

        const user = results[0];

        try {
            const validPassword = await bcrypt.compare(
                password,
                user.password
            );

            if (!validPassword) {
                return res.status(401).json({
                    error: "Invalid username or password"
                });
            }

            const token = jwt.sign(
                {
                    user_id: user.user_id,
                    username: user.username,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            res.json({
                message: "Login successful",
                token: token,
                role: user.role,
                username: user.username
            });
        } catch (error) {
            console.log("LOGIN ERROR:", error);

            res.status(500).json({
                error: "Login failed"
            });
        }
    });
});

// ================= SERVER =================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});