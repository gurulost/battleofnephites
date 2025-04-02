import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { EventBridge } from "./lib/events/EventBridge";

// Make EventBridge globally available for components
(window as any).EventBridge = EventBridge;

createRoot(document.getElementById("root")!).render(<App />);
