import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import ScanPage from './pages/ScanPage';
import RegistrationPage from './pages/RegistrationPage';
import AdminDashboard from './pages/AdminDashboard';
import { initDb } from './lib/db';

function App() {
  useEffect(() => {
    initDb();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ScanPage />} />
          <Route path="register" element={<RegistrationPage />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
