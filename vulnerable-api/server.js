const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

// Fake users
const users = {
    101: {
        id: 101,
        name: "Rahul",
        email: "rahul@example.com",
        role: "user"
    },
    102: {
        id: 102,
        name: "Aman",
        email: "aman@example.com",
        role: "user"
    }
};

// Fake orders
const orders = {
    101: {
        orderId: 101,
        userId: 101,
        product: "Laptop",
        amount: 55000
    },

    102: {
        orderId: 102,
        userId: 102,
        product: "iPhone",
        amount: 80000
    }
};

// ------------------------------------
// Health
// ------------------------------------

app.get("/", (req, res) => {
    res.json({
        name: "SentinelAPI Vulnerable Demo API",
        status: "running"
    });
});

// ------------------------------------
// Login
// ------------------------------------

app.post("/login", (req, res) => {
    const { userId } = req.body;

    if (!users[userId]) {
        return res.status(401).json({
            error: "Invalid user"
        });
    }

    // Demo token
    res.json({
        token: `user-${userId}`,
        userId: Number(userId)
    });
});

// ------------------------------------
// USERS
// ------------------------------------

app.get("/users/:id", (req, res) => {
    const user = users[req.params.id];

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        });
    }

    // INTENTIONALLY VULNERABLE:
    // No ownership/authorization check.

    res.json(user);
});

// ------------------------------------
// ORDERS
// ------------------------------------

app.get("/orders/:id", (req, res) => {
    const order = orders[req.params.id];

    if (!order) {
        return res.status(404).json({
            error: "Order not found"
        });
    }

    // INTENTIONALLY VULNERABLE:
    // Any authenticated user can access another user's order.

    res.json(order);
});

// ------------------------------------
// PROFILE
// ------------------------------------

app.get("/profile", (req, res) => {
    // INTENTIONALLY VULNERABLE:
    // Excessive data exposure.

    res.json({
        name: "Rahul",
        email: "rahul@example.com",
        phone: "+91-9876543210",
        address: "Jaipur, Rajasthan",
        internalNotes: "VIP customer",
        salary: 85000,
        passwordHash: "demo-hash-not-real",
        role: "user"
    });
});

// ------------------------------------
// ADMIN
// ------------------------------------

app.get("/admin/users", (req, res) => {
    // INTENTIONALLY VULNERABLE:
    // No authentication/authorization.

    res.json({
        users: Object.values(users)
    });
});

// ------------------------------------
// Start
// ------------------------------------

app.listen(PORT, () => {
    console.log(`🚨 Vulnerable API running at http://localhost:${PORT}`);
});