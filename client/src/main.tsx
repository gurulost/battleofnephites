import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { EventBridge } from "./lib/events/EventBridge";
import { DebugTools } from "./lib/utils/debugTools";

// Initialize debug tools in development mode
if (process.env.NODE_ENV !== "production") {
  // Inject debug tools to window object for console access
  DebugTools.injectToWindow();
}

createRoot(document.getElementById("root")!).render(<App />);
