import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./worker.css";

function WorkerDashboard() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workerName, setWorkerName] = useState("Worker");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [profileResponse, jobsResponse, tasksResponse] =
          await Promise.all([
            fetch("http://localhost:5000/api/workers/profile", {
              credentials: "include"
            }),
            fetch("http://localhost:5000/api/jobs/available", {
              credentials: "include"
            }),
            fetch("http://localhost:5000/api/workers/tasks", {
              credentials: "include"
            })
          ]);

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          setWorkerName(profile.name || "Worker");
        }

        if (jobsResponse.ok) {
          setJobs(await jobsResponse.json());
        }

        if (tasksResponse.ok) {
          setTasks(await tasksResponse.json());
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      }
    };

    fetchDashboard();
  }, []);

  const completedTasks = tasks.filter(
    task => task.status === "Completed"
  ).length;

  return (
    <div className="worker-page">
      <section className="worker-welcome">
        <h1>Welcome, {workerName}! 👋</h1>
        <p>Find farming jobs and manage your assigned tasks.</p>

        <button onClick={() => navigate("/worker/jobs")}>
          Explore Available Jobs
        </button>
      </section>

      <div className="worker-stats">
        <div className="worker-stat-card">
          <h3>{jobs.length}</h3>
          <p>Available Jobs</p>
        </div>

        <div className="worker-stat-card">
          <h3>{tasks.length}</h3>
          <p>My Tasks</p>
        </div>

        <div className="worker-stat-card">
          <h3>{completedTasks}</h3>
          <p>Completed Tasks</p>
        </div>
      </div>

      <section className="worker-section">
        <h2>Quick Actions</h2>

        <div className="worker-actions">
          <button onClick={() => navigate("/worker/jobs")}>
            View Available Jobs
          </button>

          <button onClick={() => navigate("/worker/tasks")}>
            Manage My Tasks
          </button>

          <button onClick={() => navigate("/worker/profile")}>
            View My Profile
          </button>
        </div>
      </section>
    </div>
  );
}

export default WorkerDashboard;