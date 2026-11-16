import { Outlet } from "react-router-dom";

export default function CustomerLayout() {
  return (
    <div className="CustomerLayout">
      <Outlet />
    </div>
  );
}
