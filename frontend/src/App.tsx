
import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { DocumentList } from './pages/DocumentList';
import { ReviewScreen } from './pages/ReviewScreen';
import { SummaryScreen } from './pages/SummaryScreen';
import { ToastContainer } from './components/ToastContainer';

function App() {
  const { currentPage } = useStore();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-bg-app text-text-primary flex flex-col selection:bg-accent-main/30 selection:text-text-primary transition-colors duration-200">
      {currentPage === 'list' && <DocumentList />}
      {currentPage === 'review' && <ReviewScreen />}
      {currentPage === 'summary' && <SummaryScreen />}
      <ToastContainer />
    </div>
  );
}

export default App;
