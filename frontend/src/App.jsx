import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import HomePage from "./pages/HomePage";

const App = () => {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-svh items-center justify-center bg-background">
            <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </Suspense>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: "var(--text-sm)",
          },
        }}
      />
    </BrowserRouter>
  );
};

export default App;
