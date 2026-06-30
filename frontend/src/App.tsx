
import { useStore } from './store/useStore';
import { DocumentList } from './pages/DocumentList';
import { ReviewScreen } from './pages/ReviewScreen';
import { SummaryScreen } from './pages/SummaryScreen';
import { ToastContainer } from './components/ToastContainer';

function App() {
  const { currentPage } = useStore();

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {currentPage === 'list' && <DocumentList />}
      {currentPage === 'review' && <ReviewScreen />}
      {currentPage === 'summary' && <SummaryScreen />}
      <ToastContainer />
    </div>
  );
}

export default App;
