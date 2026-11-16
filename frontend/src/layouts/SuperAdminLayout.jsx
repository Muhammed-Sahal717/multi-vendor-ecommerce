import { Outlet } from "react-router-dom";

export default function SuperAdminLayout() {
  return (
    <div className="SuperAdminLayout">
      <Outlet />
    </div>
  );
}
