import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bankAccountAPI, statementAPI } from '../../services/api';

function UploadStatement() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [statementName, setStatementName] = useState("");


  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await bankAccountAPI.list();
      setAccounts(response.data);
      const savedAccount = localStorage.getItem('selected_bank_account');
      if (savedAccount) {
        setSelectedAccount(savedAccount);
      } else if (response.data.length > 0) {
        setSelectedAccount(response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const name = selectedFile.name.toLowerCase();
      let fileType = "pdf"; // default

      if (name.endsWith(".csv")) {
        fileType = "csv";
      } else if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
        fileType = "xlsx";
      } else if (name.endsWith(".pdf")) {
        fileType = "pdf";
      }

      setFile({ file: selectedFile, type: fileType });

    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selectedAccount) {
      setMessage('Please select a bank account and file');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await statementAPI.upload({
        bank_account: selectedAccount,
        file: file.file,
        file_type: file.type,
        name: statementName,       // NEW
      });

      setMessage(`✅ Success! Processed ${response.data.transaction_count} transactions. Total: $${response.data.total_amount.toFixed(2)}`);
      setFile(null);
      setStatementName("");        // NEW: reset field
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || 'Upload failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📤 Upload Statement</h1>
        <p style={styles.subtitle}>Upload your credit card statement (CSV or PDF)</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Select Bank Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">Choose an account...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} {acc.account_nickname && `(${acc.account_nickname})`}
                </option>
              ))}
            </select>
          </div>


          <div className="form-group">
            <label htmlFor="statementName">Statement name</label>
            <input
              id="statementName"
              type="text"
              value={statementName}
              onChange={(e) => setStatementName(e.target.value)}
              placeholder="e.g. HDFC Credit Card – Jan 2026"
              required
            />
          </div>
  
          
          <div style={styles.uploadArea}>
            <input
              type="file"
              id="file-upload"
              accept=".csv,.pdf,.xls,.xlsx"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
            <label htmlFor="file-upload" style={styles.uploadLabel}>
              <div style={styles.uploadIcon}>📄</div>
              <div style={styles.uploadText}>
                {file ? file.file.name : 'Click to browse or drag and drop'}
              </div>
              <div style={styles.uploadHint}>Accepted formats: CSV, PDF, Excel (.xls, .xlsx)</div>
            </label>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              background: message.startsWith('✅') ? '#d4edda' : '#f8d7da',
              color: message.startsWith('✅') ? '#155724' : '#721c24',
            }}>
              {message}
            </div>
          )}

          <div style={styles.buttons}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading || !file}
            >
              {loading ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        </form>

        <div style={styles.privacyNote}>
          <div style={styles.privacyIcon}>🔒</div>
          <div>
            <div style={styles.privacyTitle}>100% Private & Secure</div>
            <div style={styles.privacyText}>
              Your data is encrypted and stored securely. We never share your financial information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    textAlign: 'center',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
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
  select: {
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    cursor: 'pointer',
  },
  uploadArea: {
    position: 'relative',
  },
  fileInput: {
    display: 'none',
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    border: '2px dashed #667eea',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  uploadText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  uploadHint: {
    fontSize: '14px',
    color: '#999',
  },
  message: {
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  privacyNote: {
    display: 'flex',
    gap: '16px',
    marginTop: '32px',
    padding: '20px',
    background: '#f0fdf4',
    borderRadius: '12px',
    border: '1px solid #86efac',
  },
  privacyIcon: {
    fontSize: '24px',
  },
  privacyTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#166534',
    marginBottom: '4px',
  },
  privacyText: {
    fontSize: '13px',
    color: '#166534',
    lineHeight: '1.5',
  },
};

export default UploadStatement;
