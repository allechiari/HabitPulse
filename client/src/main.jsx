import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// dentro common.css c'e anche l'import delle variabili, 
//basta metterlo li perche e il primo fil che si carica e quindi gli altri due ereditano anche loro le variabili
import "./styles/common.css";
import "./styles/auth.css";
import "./styles/dashboard.css"
import "./styles/profile.css";
import "./styles/analysis.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);