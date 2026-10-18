import { useEffect, useState } from "react";
import "./App.css";

function Icon({ name }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    edit: (
      <>
        <path d="m16 4 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, options);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Không thực hiện được yêu cầu");
  }

  return response.status === 204 ? null : response.json();
}

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTodos() {
      try {
        const data = await request("/todos");
        if (active) setTodos(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTodos();

    return () => {
      active = false;
    };
  }, []);

  async function performAction(action) {
    setBusy(true);
    setError("");

    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function addTodo(event) {
    event.preventDefault();
    if (!title.trim() || busy || loading) return;

    performAction(async () => {
      const todo = await request("/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      setTodos((current) => [todo, ...current]);
      setTitle("");
    });
  }

  function toggleTodo(todo) {
    performAction(async () => {
      const updated = await request(`/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      replaceTodo(updated);
    });
  }

  function deleteTodo(id) {
    performAction(async () => {
      await request(`/todos/${id}`, { method: "DELETE" });

      setTodos((current) =>
        current.filter((todo) => todo.id !== id)
      );
    });
  }

  function replaceTodo(updated) {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === updated.id ? updated : todo
      )
    );
  }

  function startEditing(todo) {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
  }

  function saveEdit(event) {
    event.preventDefault();
    if (!editTitle.trim() || busy) return;

    performAction(async () => {
      const updated = await request(`/todos/${editingId}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });

      replaceTodo(updated);
      cancelEditing();
    });
  }

  const completedCount = todos.filter(
    (todo) => todo.completed
  ).length;

  const progress = todos.length
    ? Math.round((completedCount / todos.length) * 100)
    : 0;

  const locked = busy || loading || editingId !== null;

  return (
    <main className="todo-app">
      <header className="app-header">
        <div className="heading-icon">
          <Icon name="check" />
        </div>

        <div>
          <h1>Việc hôm nay<span>.</span></h1>
          <p>Từng việc nhỏ, một ngày tốt hơn.</p>
        </div>
      </header>

      <form className="add-form" onSubmit={addTodo}>
        <input
          aria-label="Tên công việc mới"
          placeholder="Thêm một việc bạn muốn làm..."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={255}
          disabled={locked}
          required
        />

        <button
          type="submit"
          className="icon-button primary"
          aria-label="Thêm công việc"
          title="Thêm công việc"
          disabled={locked || !title.trim()}
        >
          <Icon name="plus" />
        </button>
      </form>

      <section className="progress-section" aria-label="Tiến độ công việc">
        <div className="progress-caption">
          <span>
            <strong>{completedCount}</strong>/{todos.length} việc hoàn thành
          </span>
          <span>{progress}%</span>
        </div>

        <progress
          className="progress-bar"
          value={completedCount}
          max={todos.length || 1}
          aria-label="Tỷ lệ công việc hoàn thành"
        />
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      {loading ? (
        <p className="empty-state">Đang tải công việc...</p>
      ) : (
        <>
          {todos.length === 0 && !error && (
            <p className="empty-state">
              Một ngày mới đang chờ bạn. Thêm công việc đầu tiên nhé!
            </p>
          )}

          <ul className="todo-list">
            {todos.map((todo) => (
              <li key={todo.id} className="todo-item">
                {editingId === todo.id ? (
                  <form
                    className="edit-form"
                    onSubmit={saveEdit}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && !busy) {
                        event.preventDefault();
                        cancelEditing();
                      }
                    }}
                  >
                    <input
                      aria-label="Sửa tên công việc"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      maxLength={255}
                      disabled={busy}
                      autoFocus
                      required
                    />

                    <button
                      type="submit"
                      className="icon-button save"
                      title="Lưu thay đổi"
                      aria-label="Lưu thay đổi"
                      disabled={busy || !editTitle.trim()}
                    >
                      <Icon name="check" />
                    </button>

                    <button
                      type="button"
                      className="icon-button neutral"
                      title="Hủy chỉnh sửa"
                      aria-label="Hủy chỉnh sửa"
                      onClick={cancelEditing}
                      disabled={busy}
                    >
                      <Icon name="close" />
                    </button>
                  </form>
                ) : (
                  <>
                    <label className="todo-label">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo)}
                        disabled={locked}
                      />

                      <span className={todo.completed ? "done" : ""}>
                        {todo.title}
                      </span>
                    </label>

                    <div className="todo-actions">
                      <button
                        type="button"
                        className="icon-button edit"
                        title="Sửa tên"
                        aria-label={`Sửa ${todo.title}`}
                        onClick={() => startEditing(todo)}
                        disabled={locked}
                      >
                        <Icon name="edit" />
                      </button>

                      <button
                        type="button"
                        className="icon-button delete"
                        title="Xóa công việc"
                        aria-label={`Xóa ${todo.title}`}
                        onClick={() => deleteTodo(todo.id)}
                        disabled={locked}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

export default App;