import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

// eslint-disable-next-line no-undef
gsap.registerPlugin(GSDevTools);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
