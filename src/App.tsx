import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./views/MainLayout";
import { ScenarioSelection } from "./views/ScenarioSelection";
import { ScenarioWorkspace } from "./views/ScenarioWorkspace";
import { ResultDashboard } from "./views/ResultDashboard";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/menu" replace />} />
          <Route path="menu" element={<ScenarioSelection />} />
          <Route path="play/:id" element={<ScenarioWorkspace />} />
          <Route path="result/:id" element={<ResultDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

