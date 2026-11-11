import { useEffect, useState } from "react";
import "./worker.css";

function AvailableJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchJobs = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/jobs/available",
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Unable to fetch jobs");
      }

      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const applyForJob = async (jobId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/jobs/${jobId}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Application failed");
      }

      setMessage("Successfully applied for the job!");
      fetchJobs();
    } catch (error) {
      console.error(error);
      setMessage("Unable to apply. Please try again.");
    }
  };

  return (
    <div className="worker-page">
      <h1>Available Jobs</h1>
      <p className="worker-subtitle">
        Explore farming jobs posted by farmers.
      </p>

      {message && <p className="worker-message">{message}</p>}

      {loading ? (
        <p>Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p className="worker-empty">No available jobs at the moment.</p>
      ) : (
        <div className="worker-job-grid">
          {jobs.map(job => (
            <div className="worker-job-card" key={job.id || job._id}>
              <h3>{job.title || job.jobTitle}</h3>

              <p><strong>Farmer:</strong> {job.farmerName || "Farmer"}</p>
              <p><strong>Location:</strong> {job.location || "Not specified"}</p>
              <p><strong>Category:</strong> {job.category || "General"}</p>
              <p><strong>Workers Needed:</strong> {job.workersNeeded ?? "Not specified"}</p>
              <p><strong>Payment:</strong> ₹{job.payment ?? job.salary ?? "Not specified"}</p>

              <p className="worker-description">
                {job.description || "No description available."}
              </p>

              <button
                onClick={() => applyForJob(job.id || job._id)}
                disabled={job.applied}
              >
                {job.applied ? "Applied" : "Apply for Job"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AvailableJobs;