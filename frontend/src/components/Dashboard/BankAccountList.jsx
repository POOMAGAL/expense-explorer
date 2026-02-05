import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bankAccountAPI } from '../../services/api';

function BankAccountList() {
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: '',
    account_nickname: '',
    currency: 'USD',
  });
  const navigate = useNavigate();

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'QAR', 'INR'];

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await bankAccountAPI.list();
      setAccounts(response.data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await bankAccountAPI.create(formData);
      setShowModal(false);
      setFormData({ bank_name: '', account_nickname: '', currency: 'USD' });
      loadAccounts();
    } catch (error) {
      alert('Error creating account');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Bank Accounts</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => navigate('/dashboard')} style={styles.dashboardButton}>
            📊 Dashboard
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      <button onClick={() => setShowModal(true)} style={styles.addButton}>
        + Add Bank Account
      </button>

      <div style={styles.grid}>
        {accounts.map((account) => (
          <div key={account.id} style={styles.card} onClick={() => {
            localStorage.setItem('selected_bank_account', account.id);
            navigate('/dashboard');
          }}>
            <div style={styles.cardIcon}>🏦</div>
            <h3 style={styles.cardTitle}>{account.bank_name}</h3>
            {account.account_nickname && (
              <p style={styles.cardSubtitle}>{account.account_nickname}</p>
            )}
            <div style={styles.cardStats}>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Currency</span>
                <span style={styles.statValue}>{account.currency}</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Statements</span>
                <span style={styles.statValue}>{account.statement_count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Add Bank Account</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Bank Name *</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  style={styles.input}
                  placeholder="e.g., Chase, Bank of America"
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Account Nickname (Optional)</label>
                <input
                  type="text"
                  value={formData.account_nickname}
                  onChange={(e) => setFormData({ ...formData, account_nickname: e.target.value })}
                  style={styles.input}
                  placeholder="e.g., Personal Card, Business Card"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Currency *</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  style={styles.input}
                  required
                >
                  {currencies.map((curr) => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>

              <div style={styles.modalButtons}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '40px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    maxWidth: '1200px',
    margin: '0 auto 30px auto',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#333',
  },
  headerButtons: {
    display: 'flex',
    gap: '12px',
  },
  dashboardButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#667eea',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#e74c3c',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  addButton: {
    display: 'block',
    margin: '0 auto 30px auto',
    padding: '14px 32px',
    borderRadius: '8px',
    border: 'none',
    background: '#27ae60',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 8px 0',
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 20px 0',
  },
  cardStats: {
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#667eea',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '24px',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#27ae60',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default BankAccountList;
