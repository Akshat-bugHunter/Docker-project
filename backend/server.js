import express from "express";
import cors from "cors";

import dotenv from "dotenv";
dotenv.config();
import pool from "./db.js";
import redis from "./redis.js";


const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;
const CACHE_KEY = "todos:all";
app.get("/api/todos", async (req, res) => {
  try {
    // First, check Redis
    const cached = await redis.get(CACHE_KEY);
    if (cached !== null) {
      console.log("cache hit");
      return res.json(JSON.parse(cached));
    }
    // Cache miss: query PostgreSQL
    console.log("Cache MISS");
    const result = await pool.query("SELECT * FROM todos ORDER BY id DESC");
    // Cache the result for 60 seconds
    await redis.set(CACHE_KEY, JSON.stringify(result.rows), {
      EX: 60,
    });
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch todos" });
  }
});

// POST: Add a todo
app.post("/api/todos", async (req, res) => {
  try {
    const text = req.body.text?.trim();

    if (!text || text.length > 255) {
      return res.status(400).json({
        message: "Task must contain 1–255 characters",
      });
    }

    const result = await pool.query(
      "INSERT INTO todos (text) VALUES ($1) RETURNING *",
      [text],
    );

    // Invalidate cached data
    await redis.del(CACHE_KEY);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create todo" });
  }
});

// PUT: Update a todo
app.put("/api/todos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const text = req.body.text?.trim();

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: "Invalid todo ID" });
    }

    if (!text || text.length > 255) {
      return res.status(400).json({
        message: "Task must contain 1–255 characters",
      });
    }

    const result = await pool.query(
      "UPDATE todos SET text = $1 WHERE id = $2 RETURNING *",
      [text, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Todo not found" });
    }

    await redis.del(CACHE_KEY);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update todo" });
  }
});

// DELETE: Remove a todo
app.delete("/api/todos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: "Invalid todo ID" });
    }

    const result = await pool.query(
      "DELETE FROM todos WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Todo not found" });
    }

    await redis.del(CACHE_KEY);

    res.json({ message: "Todo deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete todo" });
  }
});

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");

    await redis.connect();
    console.log("Redis connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;
