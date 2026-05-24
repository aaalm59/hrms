import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import AppRoutes from "./routes";
import api from "@/services/api";
import { setPermissions } from "@/redux/slices/rbacSlice";
import { selectIsAuthenticated } from "@/redux/slices/authSlice";

function DarkModeApplier() {
  const darkMode = useSelector((state) => state.ui.darkMode);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);
  return null;
}

/** Fetches /rbac/my-permissions/ once per login session and stores in Redux. */
function PermissionLoader() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    api.get("/rbac/my-permissions/")
      .then(({ data }) => dispatch(setPermissions(data)))
      .catch(() => {});
  }, [isAuthenticated, accessToken, dispatch]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <DarkModeApplier />
      <PermissionLoader />
      <AppRoutes />
    </BrowserRouter>
  );
}
