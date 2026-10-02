import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import { WorkspaceProvider } from "./context/WorkspaceProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";

function App() {
  return (
    <AuthProvider>
      {/* 워크스페이스·페이지·작업 상태는 라우트 바깥에 둬요 — /workspace/create처럼 MainLayout 밖으로 나갔다 돌아와도
          만들어 둔 페이지가 초기화되지 않고, API를 붙일 때도 이 Provider 한 곳만 바꾸면 돼요. */}
      <WorkspaceProvider>
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
            {/* 없는 주소는 홈으로 보내요(로그인 안 한 상태면 ProtectedRoute가 로그인으로 다시 보내요). */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;
