import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import mixpanel from "mixpanel-browser";

mixpanel.init("7fd4188b84922d92681ba0bcd45c4fc1", {
  debug: true,
  autocapture: true,
});

createRoot(document.getElementById("root")!).render(<App />);
