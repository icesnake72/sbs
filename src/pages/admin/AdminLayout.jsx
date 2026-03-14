import { NavLink, Outlet } from 'react-router-dom';

import GNB from '../../components/Gnb';
import Footer from '../../components/Footer';
import './Admin.css';

function AdminLayout() {
  return (
    <>
      <GNB />
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <h1 className="admin-brand">Admin Console</h1>
          <nav className="admin-nav">
            <NavLink to="/admin/dashboard" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              대시보드
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              사용자 관리
            </NavLink>
            <NavLink to="/admin/posts" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              게시글 관리
            </NavLink>
            <NavLink to="/admin/comments" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
              댓글 관리
            </NavLink>
          </nav>
        </aside>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
      <Footer />
    </>
  );
}

export default AdminLayout;

