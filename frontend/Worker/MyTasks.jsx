import { useEffect, useState } from "react";
import "./worker.css";

function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchTasks = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/workers/tasks",
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Unable to fetch tasks");
      }

      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load your tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateStatus = async (taskId, status) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/workers/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status })
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update task");
      }

      setTasks(previousTasks =>
        previousTasks.map(task =>
          (task.id || task._id) === taskId
            ? { ...task, status }
            : task
        )
      );

      setMessage("Task status updated successfully!");
    } catch (error) {
      console.error(error);
      setMessage("Unable to update task status.");
    }
  };

  return (
    <div className="worker-page">
      <h1>My Tasks</h1>
      <p className="worker-subtitle">
        View your assigned farming tasks and update their progress.
      </p>

      {message && <p className="worker-message">{message}</p>}

      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="worker-empty">No tasks assigned yet.</p>
      ) : (
        <div className="worker-task-list">
          {tasks.map(task => (
            <div className="worker-task-card" key={task.id || task._id}>
              <div>
                <h3>{task.title || task.taskName}</h3>
                <p><strong>Farmer:</strong> {task.farmerName || "Farmer"}</p>
                <p><strong>Location:</strong> {task.location || "Not specified"}</p>
                <p><strong>Description:</strong> {task.description || "No description"}</p>
                <p><strong>Due Date:</strong> {task.dueDate || "Not specified"}</p>
              </div>

              <div className="worker-task-update">
                <label>Task Status</label>

                <select
                  value={task.status || "Pending"}
                  onChange={e =>
                    updateStatus(task.id || task._id, e.target.value)
                  }
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

                <span className={`task-status ${(task.status || "Pending").toLowerCase().replace(" ", "-")}`}>
                  {task.status || "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTasks;