import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Onboarding } from "./pages/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { ProjectCreate } from "./pages/ProjectCreate";
import { ProjectDetail } from "./pages/ProjectDetail";
import { ProjectRoom } from "./pages/ProjectRoom";
import { Collaborators } from "./pages/Collaborators";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { Settings } from "./pages/Settings";
import { Search } from "./pages/Search";
import { Notifications } from "./pages/Notifications";
import { Requests } from "./pages/Requests";
import { Messages } from "./pages/Messages";
import { AiAssistant } from "./components/ai/AiAssistant";
import { Button } from "./components/ui/Button";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="rounded-full bg-navy-50 p-4 text-navy">
        <span className="font-serif text-3xl font-bold">404</span>
      </div>
      <h2 className="font-serif text-2xl font-bold text-ink">Page Not Found</h2>
      <p className="text-sm text-ink-500 max-w-md">
        The requested university catalog page or research room does not exist.
      </p>
      <Link to="/">
        <Button>Return to Campus Home</Button>
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-paper-50 font-sans text-ink">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectCreate />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/room" element={<ProjectRoom />} />
            <Route path="/collaborators" element={<Collaborators />} />
            <Route path="/search" element={<Search />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <AiAssistant />
        <Footer />
      </div>
    </BrowserRouter>
  );
}
