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
import ActivityPage from "./pages/ActivityPage";
import WorkspaceCreatePage from "./pages/WorkspaceCreatePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

import MainLayout from "./layout/MainLayout";
import { AuthProvider } from "./context/AuthProvider";
import { WorkspaceProvider } from "./context/WorkspaceProvider";
import { NotificationProvider } from "./context/NotificationProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <AuthProvider>
      {/* 워크스페이스·페이지·작업 상태는 라우트 바깥에 둬요 — /workspace/create처럼 MainLayout 밖으로 나갔다 돌아와도
          만들어 둔 페이지가 초기화되지 않고, API를 붙일 때도 이 Provider 한 곳만 바꾸면 돼요. */}
      <WorkspaceProvider>
        <BrowserRouter>
          {/* 알림은 실시간(WebSocket)으로 받아서 화면을 옮기고 워크스페이스를 다시 불러오니까, 라우터와 워크스페이스 안쪽에 둬요. */}
          <NotificationProvider>
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
                <Route path="activities" element={<ActivityPage />} />
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
              {/* 비밀번호 찾기·재설정은 로그인 여부와 상관없이 열려요(메일 링크로 들어와요). */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* 없는 주소는 홈으로 보내요(로그인 안 한 상태면 ProtectedRoute가 로그인으로 다시 보내요). */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;
