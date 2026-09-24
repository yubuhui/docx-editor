import './styles.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <App />
    </div>
  );
}
