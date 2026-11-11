
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

function ProtectedAdmin() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/verify", {
      credentials: "include"
    })
      .then(async response => {
        if (!response.ok) {
          setStatus("denied");
          return;
        }

        const data = await response.json();

        if (data.authenticated && data.role === "admin") {
          setStatus("allowed");
        } else {
          setStatus("denied");
        }
      })
      .catch(() => setStatus("denied"));
  }, []);

  if (status === "checking") {
    return <p>Checking admin access...</p>;
  }

  if (status === "denied") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedAdmin;
