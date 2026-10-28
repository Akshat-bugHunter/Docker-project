import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api/todos";

function App() {
  const [search, setSearch] = useState("");
  const [todos, setTodos] = useState([]);
  const [editIdx, setEditIdx] = useState(-1);

  // Get todos from backend
  useEffect(() => {
    async function getTodos() {
      try {
        const res = await fetch(API);
        if (!res.ok) throw new Error("Failed to fetch todos");

        const data = await res.json();
        setTodos(data);
      } catch (err) {
        console.log(err);
        alert("Backend is not running!");
      }
    }

    getTodos();
  }, []);

  async function handleClick() {
    if (search.trim() === "") return;

    try {
      let res;

      if (editIdx !== -1) {
        // Update existing todo using its database ID
        const id = todos[editIdx].id;

        res = await fetch(`${API}/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: search }),
        });
      } else {
        // Add new todo
        res = await fetch(API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: search }),
        });
      }

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();

      if (editIdx !== -1) {
        const arr = [...todos];
        arr[editIdx] = data;
        setTodos(arr);
        setEditIdx(-1);
      } else {
        setTodos([...todos, data]);
      }

      setSearch("");
    } catch (err) {
      console.log(err);
      alert("Could not save todo");
    }
  }

  async function deleteTask(idx) {
    try {
      const id = todos[idx].id;

      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      const filteredTask = todos.filter((_, i) => i !== idx);
      setTodos(filteredTask);

      if (editIdx === idx) {
        setEditIdx(-1);
        setSearch("");
      } else if (editIdx > idx) {
        setEditIdx(editIdx - 1);
      }
    } catch (err) {
      console.log(err);
      alert("Could not delete todo");
    }
  }

  function editTask(idx) {
    setSearch(todos[idx].text);
    setEditIdx(idx);
  }

  return (
    <div>
      <h1>todo app</h1>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <button onClick={handleClick}>{editIdx === -1 ? "Add" : "update"}</button>

      <div>
        <ul>
          {todos.map((t, idx) => (
            <li key={t.id}>
              <span>{t.text}</span>
              <button onClick={() => deleteTask(idx)}>Delete</button>
              <button onClick={() => editTask(idx)}>edit</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
