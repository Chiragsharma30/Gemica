import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="container section">
      <h1>Admin</h1>
      <div className="admin">
        <nav className="admin__nav" aria-label="Admin">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/coupons">Coupons</NavLink>
        </nav>
        <div><Outlet /></div>
      </div>
    </div>
  );
}
