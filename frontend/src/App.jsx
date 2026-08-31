import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SprintCreate from "./pages/SprintCreate";
import SprintList from "./pages/SprintList";
import SprintDetail from "./pages/SprintDetail";
import SprintTasks from "./pages/SprintTasks";
import MainLayout from "./layout/MainLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="sprints" element={<SprintList />} />
          <Route path="sprints/:sprintId" element={<SprintDetail />} />
          <Route path="sprints/:sprintId/tasks" element={<SprintTasks />} />
          <Route path="sprints/new" element={<SprintCreate />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
