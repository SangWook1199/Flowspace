import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SprintCreate from "./pages/SprintCreate";
import SprintList from "./pages/SprintList";
import SprintDetail from "./pages/SprintDetail";
import SprintTasks from "./pages/SprintTasks";
import Kanban from "./pages/Kanban";
import Calendar from "./pages/Calendar";
import RetrospectiveList from "./pages/RetrospectiveList";
import RetrospectiveDetailPage from "./pages/RetrospectiveDetailPage";
import PageDetailPage from "./pages/PageDetailPage";
import WorkspaceCreatePage from "./pages/WorkspaceCreatePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

import MainLayout from "./layout/MainLayout";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="sprints" element={<SprintList />} />
            <Route path="sprints/:sprintId" element={<SprintDetail />} />
            <Route path="sprints/:sprintId/tasks" element={<SprintTasks />} />
            <Route path="sprints/new" element={<SprintCreate />} />
            <Route path="kanban" element={<Kanban />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="/retrospectives" element={<RetrospectiveList />} />
            <Route
              path="/retrospectives/:sprintId"
              element={<RetrospectiveDetailPage />}
            />
            <Route path="pages/:pageId" element={<PageDetailPage />} />
          </Route>
          <Route
            path="/workspace/create"
            element={
              <ProtectedRoute>
                <WorkspaceCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <SignupPage />
              </GuestRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
