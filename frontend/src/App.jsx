import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { useSelector } from "react-redux";
import AppRoutes from "./routes";

function DarkModeApplier() {
  const darkMode = useSelector((state) => state.ui.darkMode);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <DarkModeApplier />
      <AppRoutes />
    </BrowserRouter>
  );
}
