import { createRoot } from "react-dom/client";
import { loadFonts } from "../utils/fonts";
import { Options } from "./Options";
import "./options.css";

void loadFonts();
createRoot(document.getElementById("root")!).render(<Options />);
