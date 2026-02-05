import { useNavigate } from 'react-router-dom';
import { LogOut, Home, Upload, CreditCard } from 'lucide-react';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <div style={styles.brand} onClick={() => navigate('/dashboard')}>
          <span style={styles.logo}>💰</span>
          <span style={styles.brandText}>Expense Explorer</span>
        </div>

        <div style={styles.menu}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={styles.menuItem}
            title="Dashboard"
          >
            <Home size={20} />
            <span style={styles.menuText}>Dashboard</span>
          </button>

          <button 
            onClick={() => navigate('/bank-accounts')} 
            style={styles.menuItem}
            title="Bank Accounts"
          >
            <CreditCard size={20} />
            <span style={styles.menuText}>Accounts</span>
          </button>

          <button 
            onClick={() => navigate('/upload')} 
            style={styles.menuItem}
            title="Upload Statement"
          >
            <Upload size={20} />
            <span style={styles.menuText}>Upload</span>
          </button>
        </div>

        <div style={styles.rightSection}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span style={styles.username}>{user.username || 'User'}</span>
          </div>

          <button onClick={handleLogout} style={styles.logoutButton} title="Logout">
            <LogOut size={20} />
            <span style={styles.menuText}>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logo: {
    fontSize: '32px',
  },
  brandText: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
  },
  menu: {
    display: 'flex',
    gap: '8px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  menuText: {
    display: 'inline',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    fontWeight: '700',
  },
  username: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(231,76,60,0.9)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// Add hover effects
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    nav button:hover {
      background: rgba(255,255,255,0.2) !important;
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);
}

export default Navbar;
