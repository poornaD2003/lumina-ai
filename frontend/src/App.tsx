import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import { RestockPlanPage } from './pages/RestockPlanPage';
import { DynamicPricingPage } from './pages/DynamicPricingPage';
import { CompetitorComparisonPage } from './pages/CompetitorComparison';
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/restock-plan" element={<RestockPlanPage />} />
            <Route path="/dynamic-pricing" element={<DynamicPricingPage />} />
            <Route path="/competitor-comparison" element={<CompetitorComparisonPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
