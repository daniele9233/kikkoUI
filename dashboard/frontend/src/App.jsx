import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Deploy from './pages/Deploy';
import History from './pages/History';
import Inventory from './pages/Inventory';
import Layout from './components/Layout';

export default function App() {
  const { token } = useAuth();

  if (!token) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/deploy" element={<Deploy />} />
        <Route path="/history" element={<History />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
