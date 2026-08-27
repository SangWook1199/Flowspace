import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SprintCreate from './pages/SprintCreate';
import MainLayout from './layout/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="sprints/new" element={<SprintCreate />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
