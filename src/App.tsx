import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DashboardPage } from '@/routes/dashboard';
import { NewMatchPage } from '@/routes/new-match';
import { MatchOverviewPage } from '@/routes/match-overview';
import { SetRecordingPage } from '@/routes/set-recording';
import { SetStatsPage } from '@/routes/set-stats';
import { MatchStatsPage } from '@/routes/match-stats';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: { fontSize: '14px' },
        }}
      />
      <div className="h-full w-full max-w-lg mx-auto flex flex-col bg-slate-950">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/match/new" element={<NewMatchPage />} />
          <Route path="/match/:matchId" element={<MatchOverviewPage />} />
          <Route path="/match/:matchId/set/:setId/record" element={<SetRecordingPage />} />
          <Route path="/match/:matchId/set/:setId/stats" element={<SetStatsPage />} />
          <Route path="/match/:matchId/stats" element={<MatchStatsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
