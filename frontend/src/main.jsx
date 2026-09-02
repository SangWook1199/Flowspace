import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/dashboard.css";
import "./styles/sprint.css";
import "./styles/sprint-list.css";
import "./styles/sidebar-sprints.css";
import "./styles/sprint-detail.css";
import "./styles/kanban.css";
import "./styles/calendar.css";
import "./styles/retrospectiveList.css";
import "./styles/sprint-detail-table.css";
import "./styles/retrospective-detail.css";
import "./styles/workspace-create.css";
import "./styles/auth.css";

createRoot(document.getElementById("root")).render(<App />);
