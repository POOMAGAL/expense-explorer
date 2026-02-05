import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  Upload, 
  TrendingUp, 
  Settings, 
  Menu, 
  X 
} from 'lucide-react';

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: CreditCard, label: 'Bank Accounts', path: '/bank-accounts' },
    { icon: Upload, label: 'Upload Statement', path: '/upload' },
    { icon: TrendingUp, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside style={{ ...styles.sidebar, width: collapsed ? '80px' : '260px' }}>
      <div style={styles.header}>
        {!collapsed && <h2 style={styles.title}>Menu</h2>}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          style={styles.toggleButton}
        >
          {collapsed ? <Menu size={24} /> : <X size={24} />}
        </button>
      </div>

      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              ...styles.menuItem,
              background: isActive(item.path) ? '#667eea' : 'transparent',
              color: isActive(item.path) ? 'white' : '#666',
            }}
            title={collapsed ? item.label : ''}
          >
            <item.icon size={22} />
            {!collapsed && <span style={styles.label}>{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    height: '100vh',
    background: 'white',
    borderRight: '1px solid #e0e0e0',
    padding: '20px 0',
    transition: 'width 0.3s ease',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px 20px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    margin: 0,
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '0 12px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    justifyContent: 'flex-start',
  },
  label: {
    whiteSpace: 'nowrap',
  },
};

export default Sidebar;
