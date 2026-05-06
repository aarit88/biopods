import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout.tsx';

// BioPods Pages
import { LandingPage } from './pages/LandingPage.tsx';
import { ImmuneDashboard } from './pages/ImmuneDashboard.tsx';
import { ClusterVisualization } from './pages/ClusterVisualization.tsx';
import { PodIntelligence } from './pages/PodIntelligence.tsx';
import { AgentControl } from './pages/AgentControl.tsx';
import { ThreatDetection } from './pages/ThreatDetection.tsx';
import { MemoryArchive } from './pages/MemoryArchive.tsx';
import { HealingCenter } from './pages/HealingCenter.tsx';
import { TopologyMap } from './pages/TopologyMap.tsx';
import { EventTimeline } from './pages/EventTimeline.tsx';
import { AgentAnalytics } from './pages/AgentAnalytics.tsx';
import { Settings } from './pages/Settings.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { path: "dashboard", element: <ImmuneDashboard /> },
      { path: "topology", element: <TopologyMap /> },
      { path: "visualization", element: <ClusterVisualization /> },
      { path: "intelligence", element: <PodIntelligence /> },
      { path: "agents", element: <AgentControl /> },
      { path: "threats", element: <ThreatDetection /> },
      { path: "memory", element: <MemoryArchive /> },
      { path: "healing", element: <HealingCenter /> },
      { path: "events", element: <EventTimeline /> },
      { path: "analytics", element: <AgentAnalytics /> },
      { path: "settings", element: <Settings /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  }
]);

const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;