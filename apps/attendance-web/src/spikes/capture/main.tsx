import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../index.css";
import "./capture-spike.css";
import { CaptureSpike } from "./CaptureSpike";

createRoot(document.getElementById("root")!).render(<StrictMode><CaptureSpike /></StrictMode>);
