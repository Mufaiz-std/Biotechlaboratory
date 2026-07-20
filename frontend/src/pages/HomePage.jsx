import { useEffect, useState } from "react";
import { FiActivity } from "react-icons/fi";
import api, { unwrapResponse } from "../lib/api";

export default function HomePage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setHealth(unwrapResponse(res)))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="flex items-center gap-3">
        <FiActivity className="text-3xl text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-foreground">
          Lab Booking System
        </h1>
      </div>
      <p className="text-muted max-w-md text-center text-base">
        Laboratory Appointment &amp; Home Collection Booking Platform
      </p>
      {health && (
        <div className="rounded-lg border border-border bg-surface px-6 py-4 shadow-sm">
          <p className="text-sm text-muted">API Status</p>
          <p className="text-success mt-1 font-medium">
            {health.message} — {health.data?.status}
          </p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-6 py-4">
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
