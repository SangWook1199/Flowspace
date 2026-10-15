import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import MainLayout from "./layout/MainLayout";
import { AuthProvider } from "./context/AuthProvider";
import { DialogProvider } from "./context/DialogProvider";
import { WorkspaceProvider } from "./context/WorkspaceProvider";
import { NotificationProvider } from "./context/NotificationProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";

// 화면(페이지)은 처음 열 때 받아와요 — 몇 천 줄짜리 에디터 같은 큰 코드가 첫 화면 로딩에 같이 딸려오지 않게 나눠요.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SprintCreate = lazy(() => import("./pages/SprintCreate"));
const AiProject = lazy(() => import("./pages/AiProject"));
const SprintEdit = lazy(() => import("./pages/SprintEdit"));
const SprintList = lazy(() => import("./pages/SprintList"));
const SprintDetail = lazy(() => import("./pages/SprintDetail"));
const SprintTasks = lazy(() => import("./pages/SprintTasks"));
const Kanban = lazy(() => import("./pages/Kanban"));
const Calendar = lazy(() => import("./pages/Calendar"));
const RetrospectiveList = lazy(() => import("./pages/RetrospectiveList"));
const RetrospectiveDetailPage = lazy(() => import("./pages/RetrospectiveDetailPage"));
const PageDetailPage = lazy(() => import("./pages/PageDetailPage"));
const AllPages = lazy(() => import("./pages/AllPages"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const WorkspaceCreatePage = lazy(() => import("./pages/WorkspaceCreatePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));

// 화면에서 예외가 나도 흰 화면이 되지 않게 막아요. 다른 주소로 가면 오류 상태가 풀려요.
function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

// 화면 코드를 받아오는 동안 잠깐 보여줘요.
function RouteFallback() {
  return (
    <div role="status" style={{ padding: 40, textAlign: "center", color: "#7c879c" }}>
      불러오는 중이에요…
    </div>
  );
}

function App() {
  return (
    <DialogProvider>
    <AuthProvider>
      {/* 워크스페이스·페이지·작업 상태는 라우트 바깥에 둬요 — /workspace/create처럼 MainLayout 밖으로 나갔다 돌아와도
          만들어 둔 페이지가 초기화되지 않고, API를 붙일 때도 이 Provider 한 곳만 바꾸면 돼요. */}
      <WorkspaceProvider>
        <BrowserRouter>
          {/* 알림은 실시간(WebSocket)으로 받아서 화면을 옮기고 워크스페이스를 다시 불러오니까, 라우터와 워크스페이스 안쪽에 둬요. */}
          <NotificationProvider>
            <RouteErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
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
                <Route path="sprints/ai" element={<AiProject />} />
                <Route path="sprints/:sprintId/edit" element={<SprintEdit />} />
                <Route path="kanban" element={<Kanban />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="/retrospectives" element={<RetrospectiveList />} />
                <Route
                  path="/retrospectives/:sprintId"
                  element={<RetrospectiveDetailPage />}
                />
                <Route path="pages" element={<AllPages />} />
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
              {/* 가입 이메일 인증도 메일 링크로 들어와요. */}
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* 없는 주소는 홈으로 보내요(로그인 안 한 상태면 ProtectedRoute가 로그인으로 다시 보내요). */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
            </RouteErrorBoundary>
          </NotificationProvider>
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
    </DialogProvider>
  );
}

export default App;
