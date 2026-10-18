require("dotenv").config();

const express = require("express");
const pool = require("./db");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Kiểm tra kết nối
app.get("/api/health", async (req, res) => {
  await pool.query("SELECT 1");

  res.json({
    message: "Backend Express đang chạy!",
    database: "PostgreSQL đã kết nối!",
  });
});

// Kiểm tra ID
app.param("id", (req, res, next, value) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    return res.status(400).json({
      message: "ID không hợp lệ",
    });
  }

  req.todoId = id;
  next();
});

// Lấy danh sách
app.get("/api/todos", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM todos ORDER BY id DESC"
  );

  res.json(result.rows);
});

// Thêm công việc
app.post("/api/todos", async (req, res) => {
  const title = req.body?.title;

  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.trim().length > 255
  ) {
    return res.status(400).json({
      message: "Tên công việc phải từ 1 đến 255 ký tự",
    });
  }

  const result = await pool.query(
    "INSERT INTO todos (title) VALUES ($1) RETURNING *",
    [title.trim()]
  );

  res.status(201).json(result.rows[0]);
});

// Cập nhật trạng thái hoàn thành
app.patch("/api/todos/:id", async (req, res) => {
  const completed = req.body?.completed;

  if (typeof completed !== "boolean") {
    return res.status(400).json({
      message: "completed phải là true hoặc false",
    });
  }

  const result = await pool.query(
    "UPDATE todos SET completed = $1 WHERE id = $2 RETURNING *",
    [completed, req.todoId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Không tìm thấy công việc",
    });
  }

  res.json(result.rows[0]);
});

// Sửa tên công việc
app.patch("/api/todos/:id/title", async (req, res) => {
  const title = req.body?.title;

  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.trim().length > 255
  ) {
    return res.status(400).json({
      message: "Tên công việc phải từ 1 đến 255 ký tự",
    });
  }

  const result = await pool.query(
    "UPDATE todos SET title = $1 WHERE id = $2 RETURNING *",
    [title.trim(), req.todoId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Không tìm thấy công việc",
    });
  }

  res.json(result.rows[0]);
});

// Xóa công việc
app.delete("/api/todos/:id", async (req, res) => {
  const result = await pool.query(
    "DELETE FROM todos WHERE id = $1 RETURNING id",
    [req.todoId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Không tìm thấy công việc",
    });
  }

  res.status(204).end();
});

// Xử lý lỗi
app.use((error, req, res, next) => {
  console.error(error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Dữ liệu JSON không hợp lệ",
    });
  }

  res.status(500).json({
    message: "Lỗi máy chủ, hãy kiểm tra log backend",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend đang chạy tại cổng ${PORT}`);
});