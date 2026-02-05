import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  analyticsAPI,
  bankAccountAPI,
  transactionAPI,
  statementAPI, // <-- you must export this from ../../services/api
} from "../../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { saveAs } from 'file-saver';

function Dashboard() {
  const { statementId } = useParams();   // URL: /dashboard/:statementId
  const [analytics, setAnalytics] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Statement-level state
  const [statements, setStatements] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState("all");
  const [loadingStatements, setLoadingStatements] = useState(false);

  const navigate = useNavigate();

  const COLORS = [
    "#667eea",
    "#e74c3c",
    "#f39c12",
    "#27ae60",
    "#3498db",
    "#9b59b6",
    "#1abc9c",
    "#e67e22",
  ];

  // Helpers to avoid `toFixed` on non-number
  const safeNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 0;
  };

  const formatAmount = (value) => safeNumber(value).toFixed(2);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Load statements whenever account changes
  useEffect(() => {
    if (selectedAccount) {
      loadStatements();
      // Reset statement + category view when switching accounts
      setSelectedStatement("all");
      setSelectedCategory("all");
      setCategoryTransactions([]);
    }
  }, [selectedAccount]);

  // Load analytics whenever account or statement changes
  useEffect(() => {
    if (selectedAccount) {
      loadAnalytics();
    }
  }, [selectedAccount, selectedStatement]);

  // Load category transactions when filter/statement/account changes
  useEffect(() => {
    if (selectedCategory !== "all" && selectedAccount) {
      loadCategoryTransactions();
    } else {
      setCategoryTransactions([]);
    }
  }, [selectedCategory, selectedAccount, selectedStatement]);

  const loadAccounts = async () => {
    try {
      const response = await bankAccountAPI.list();
      const data = response.data || [];
      setAccounts(data);

      if (data.length === 0) {
        setLoading(false);
        return;
      }

      const savedAccount = localStorage.getItem("selected_bank_account");
      const defaultAccountId = savedAccount || data[0].id;
      setSelectedAccount(defaultAccountId);
      setLoading(false);
    } catch (error) {
      console.error("Error loading accounts:", error);
      setLoading(false);
    }
  };

  const loadStatements = async () => {
    setLoadingStatements(true);
    try {
      // Assumed API: statementAPI.list(bankAccountId)
      const response = await statementAPI.list(selectedAccount);
      const data = response.data || [];
      setStatements(data);

      // If there are no statements, force "all"
      if (data.length === 0) {
        setSelectedStatement("all");
      }
    } catch (error) {
      console.error("Error loading statements:", error);
    } finally {
      setLoadingStatements(false);
    }
  };

   // *** CHANGED: pass statementId to backend ***
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const statementId =
        selectedStatement === "all" ? null : selectedStatement;

      const response = await analyticsAPI.dashboard(
        selectedAccount,
        statementId
      );

      setAnalytics(response.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };


  // *** CHANGED: also filter transactions by statementId ***
  const loadCategoryTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const statementId =
        selectedStatement === "all" ? null : selectedStatement;

      const response = await transactionAPI.list(
        selectedAccount,
        statementId
      );

      const filtered = response.data.filter(
        (transaction) => transaction.category === selectedCategory
      );
      setCategoryTransactions(filtered);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };


  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleAccountChange = (e) => {
    const value = e.target.value;
    setSelectedAccount(value);
    localStorage.setItem("selected_bank_account", value);
  };

  const handleStatementChange = (e) => {
    const value = e.target.value;
    setSelectedStatement(value);
    // Reset category view when switching statement
    setSelectedCategory("all");
    setCategoryTransactions([]);
  };

  const handleDeleteStatement = async () => {
    if (
      !selectedStatement ||
      selectedStatement === "all" ||
      statements.length === 0
    ) {
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this statement? This will remove all its transactions and analytics."
    );
    if (!confirmDelete) return;

    try {
      await statementAPI.delete(selectedStatement);
      // Reload statements and analytics after delete
      await loadStatements();
      setSelectedStatement("all");
      await loadAnalytics();
    } catch (error) {
      console.error("Error deleting statement:", error);
    }
  };

  // Add these functions before your return statement
  const handleExportDashboard = async () => {
    if (!selectedAccount || !analytics) return;
    const statementId = selectedStatement === "all" ? null : selectedStatement;
    try {
      const response = await transactionAPI.exportDashboard(selectedAccount, statementId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      saveAs(blob, `dashboard_report.pdf`);
    } catch (error) {
      console.error('Dashboard export failed:', error);
    }
  };





  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div style={styles.emptyState}>
        <h1>Welcome to Expense Explorer!</h1>
        <p>Let&apos;s get started by creating your first bank account.</p>
        <button
          onClick={() => navigate("/bank-accounts")}
          style={styles.startButton}
        >
          Create Bank Account
        </button>
      </div>
    );
  }

  if (!analytics) {
    return <div style={styles.loading}>Loading analytics...</div>;
  }

  // Prepare data for charts
  const dayData = Object.entries(analytics.spending_by_day || {}).map(
    ([day, amount]) => ({
      day,
      amount: safeNumber(amount),
    })
  );

  const allCategories = analytics.category_distribution || [];
  const topExpenses = analytics.top_expenses || [];
  const lowestExpenses = analytics.lowest_expenses || [];
  const monthlyTrend = analytics.monthly_trend || [];
  const recommendations = analytics.recommendations || [];

  const selectedStatementObj =
    statements.find((s) => String(s.id) === String(selectedStatement)) || null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Expense Analysis Dashboard</h1>
        <div style={styles.headerButtons}>
          {/* Bank account selector */}
          <select
            value={selectedAccount || ""}
            onChange={handleAccountChange}
            style={styles.select}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bank_name || acc.bankname || `Account ${acc.id}`}
              </option>
            ))}
          </select>

          {/* Statement selector */}
          <select
            value={selectedStatement}
            onChange={handleStatementChange}
            style={styles.statementSelect}
            disabled={loadingStatements || statements.length === 0}
          >
            <option value="all">
              {statements.length === 0
                ? "No statements yet"
                : "All statements (combined)"}
            </option>
            {statements.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name
                  ? st.name
                  : `Statement #${st.id}`}{" "}
                {st.uploaded_at
                  ? ` - ${new Date(st.uploaded_at).toLocaleDateString()}`
                  : ""}{" "}
                {st.total_spending
                  ? ` - ${formatAmount(st.total_spending)}`
                  : ""}
              </option>
            ))}
          </select>

          <button
            onClick={handleDeleteStatement}
            style={{
              ...styles.deleteStatementButton,
              opacity:
                selectedStatement === "all" || statements.length === 0
                  ? 0.5
                  : 1,
              cursor:
                selectedStatement === "all" || statements.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
            disabled={
              selectedStatement === "all" || statements.length === 0
            }
          >
            Delete Statement
          </button>

          <button
            onClick={() => navigate("/bank-accounts")}
            style={styles.accountsButton}
          >
            Accounts
          </button>
          <button
            onClick={() => navigate("/upload")}
            style={styles.uploadButton}
          >
            Upload Statement
          </button>

          <button onClick={handleExportDashboard} style={styles.exportDashboardButton} disabled={!selectedAccount || !analytics}>
          📊 Export Dashboard
          </button>

        
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {/* Optional statement meta info */}
      {selectedStatementObj && (
        <div style={styles.statementMeta}>
          <span>
            Statement:{" "}
            <strong>
              {selectedStatementObj.name ||
                `Statement #${selectedStatementObj.id}`}
            </strong>
          </span>
          {selectedStatementObj.uploaded_at && (
            <span>
              Uploaded on:{" "}
              {new Date(
                selectedStatementObj.uploaded_at
              ).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div style={styles.summaryCards}>
        <div
          style={{ ...styles.summaryCard, background: "#667eea" }}
        >
          <div style={styles.summaryIcon}>💸</div>
          <div>
            <div style={styles.summaryLabel}>Total Spending</div>
            <div style={styles.summaryValue}>
              {formatAmount(
                analytics.summary?.total_spending ??
                  analytics.summary?.totalspending
              )}
            </div>
          </div>
        </div>

        <div
          style={{ ...styles.summaryCard, background: "#e74c3c" }}
        >
          <div style={styles.summaryIcon}>📂</div>
          <div>
            <div style={styles.summaryLabel}>Categories</div>
            <div style={styles.summaryValue}>
              {analytics.summary?.total_categories ??
                analytics.summary?.totalcategories ??
                0}
            </div>
          </div>
        </div>

        <div
          style={{ ...styles.summaryCard, background: "#27ae60" }}
        >
          <div style={styles.summaryIcon}>🧾</div>
          <div>
            <div style={styles.summaryLabel}>Transactions</div>
            <div style={styles.summaryValue}>
              {analytics.summary?.total_transactions ??
                analytics.summary?.totaltransactions ??
                0}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Section */}
      <div style={styles.categoryFilterSection}>
        <div style={styles.filterHeader}>
          <h3 style={styles.filterTitle}>Category Explorer</h3>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.categorySelect}
          >
            <option value="all">Select a category to explore...</option>
            {allCategories.map((cat) => (
              <option key={cat.category} value={cat.category}>
                {cat.category} - {formatAmount(cat.amount)} (
                {safeNumber(cat.percentage).toFixed(1)}%)
              </option>
            ))}
          </select>
        </div>

        {selectedCategory !== "all" && (
          <div style={styles.categoryDetails}>
            <div style={styles.categoryHeader}>
              <h4 style={styles.categoryTitle}>
                {selectedCategory} Transactions
              </h4>
              <div style={styles.categoryBadge}>
                {categoryTransactions.length} transactions
              </div>
            </div>

            {loadingTransactions ? (
              <div style={styles.loadingSmall}>
                Loading transactions...
              </div>
            ) : categoryTransactions.length > 0 ? (
              <>
                <div style={styles.transactionsTable}>
                  <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Description</th>
                        <th style={styles.th}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryTransactions.map((transaction, index) => (
                        <tr
                          key={transaction.id || index}
                          style={{
                            ...styles.tableRow,
                            background:
                              index % 2 === 0 ? "#f9f9f9" : "#ffffff",
                          }}
                        >
                          <td style={styles.td}>
                            {transaction.date
                              ? new Date(
                                  transaction.date
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "-"}
                          </td>
                          <td style={styles.td}>
                            {transaction.description || "-"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...styles.amountCell,
                            }}
                          >
                            {formatAmount(transaction.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary for selected category */}
                <div style={styles.categorySummary}>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryItemLabel}>
                      Total Transactions
                    </span>
                    <span style={styles.summaryItemValue}>
                      {categoryTransactions.length}
                    </span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryItemLabel}>
                      Total Amount
                    </span>
                    <span style={styles.summaryItemValue}>
                      {formatAmount(
                        categoryTransactions.reduce(
                          (sum, t) =>
                            sum + safeNumber(t.amount),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryItemLabel}>
                      Average
                    </span>
                    <span style={styles.summaryItemValue}>
                      {categoryTransactions.length > 0
                        ? formatAmount(
                            categoryTransactions.reduce(
                              (sum, t) =>
                                sum + safeNumber(t.amount),
                              0
                            ) / categoryTransactions.length
                          )
                        : "0.00"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.noData}>
                No transactions found for this category
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charts Row 1: Top/Lowest expenses */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Top 5 Highest Expenses</h3>
          <div style={styles.expenseList}>
            {topExpenses.map((exp, i) => (
              <div key={i} style={styles.expenseItem}>
                <div>
                  <div style={styles.expenseName}>{exp.category}</div>
                  <div style={styles.expenseBar}>
                    <div
                      style={{
                        ...styles.expenseBarFill,
                        width:
                          topExpenses[0] &&
                          topExpenses[0].total
                            ? `${
                                (safeNumber(exp.total) /
                                  safeNumber(topExpenses[0].total)) *
                                100
                              }%`
                            : "0%",
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
                <div style={styles.expenseAmount}>
                  {formatAmount(exp.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Lowest 5 Expenses</h3>
          <div style={styles.expenseList}>
            {lowestExpenses.map((exp, i) => {
              const maxIndex = lowestExpenses.length - 1;
              const maxTotal =
                maxIndex >= 0
                  ? safeNumber(lowestExpenses[maxIndex].total)
                  : 1;
              return (
                <div key={i} style={styles.expenseItem}>
                  <div>
                    <div style={styles.expenseName}>
                      {exp.category}
                    </div>
                    <div style={styles.expenseBar}>
                      <div
                        style={{
                          ...styles.expenseBarFill,
                          width: `${
                            (safeNumber(exp.total) / maxTotal) * 100
                          }%`,
                          background: "#27ae60",
                        }}
                      />
                    </div>
                  </div>
                  <div style={styles.expenseAmount}>
                    {formatAmount(exp.total)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Day of week + Category distribution */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Spending by Day of Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allCategories}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) =>
                  `${entry.category} (${safeNumber(
                    entry.percentage
                  ).toFixed(1)}%)`
                }
              >
                {allCategories.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly trend */}
      {monthlyTrend.length > 0 && (
        <div style={styles.chartsRow}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Spending Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#667eea"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={styles.recommendationsCard}>
          <h3 style={styles.chartTitle}>Smart Recommendations</h3>
          <div style={styles.recommendations}>
            {recommendations.map((rec, i) => (
              <div key={i} style={styles.recommendation}>
                <div style={styles.savingsAmount}>
                  {formatAmount(rec.amount)}
                </div>
                <div style={styles.recType}>{rec.type}</div>
                <div style={styles.recMessage}>{rec.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f5f7fa",
    padding: "30px 20px",
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    color: "#667eea",
  },
  emptyState: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "20px",
  },
  startButton: {
    padding: "14px 32px",
    borderRadius: "8px",
    border: "none",
    background: "#27ae60",
    color: "white",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "20px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#333",
    margin: 0,
  },
  headerButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  select: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  statementSelect: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #667eea",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    minWidth: "260px",
  },
  deleteStatementButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#c0392b",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
  },
  accountsButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#3498db",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  uploadButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#27ae60",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  exportDashboardButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#e74c3c',
    color: 'white',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
  },


  logoutButton: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#e74c3c",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  statementMeta: {
    marginBottom: "16px",
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    fontSize: "13px",
    color: "#555",
  },
  summaryCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  summaryCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "24px",
    borderRadius: "16px",
    color: "white",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  summaryIcon: {
    fontSize: "40px",
  },
  summaryLabel: {
    fontSize: "14px",
    opacity: 0.9,
  },
  summaryValue: {
    fontSize: "28px",
    fontWeight: 700,
    marginTop: "4px",
  },
  categoryFilterSection: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "30px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  filterHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
  },
  filterTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#333",
    margin: 0,
  },
  categorySelect: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "2px solid #667eea",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    minWidth: "300px",
    color: "#333",
  },
  categoryDetails: {
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "2px solid #f0f0f0",
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  categoryTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#333",
    margin: 0,
  },
  categoryBadge: {
    padding: "8px 16px",
    borderRadius: "20px",
    background: "#667eea",
    color: "white",
    fontSize: "14px",
    fontWeight: 600,
  },
  transactionsTable: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "20px",
  },
  tableHeader: {
    background: "#f8f9fa",
  },
  th: {
    padding: "14px",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: 700,
    color: "#333",
    borderBottom: "2px solid #e0e0e0",
  },
  tableRow: {
    transition: "background 0.2s",
  },
  td: {
    padding: "14px",
    fontSize: "14px",
    color: "#666",
    borderBottom: "1px solid #f0f0f0",
  },
  amountCell: {
    fontWeight: 700,
    color: "#667eea",
    textAlign: "right",
  },
  categorySummary: {
    display: "flex",
    justifyContent: "space-around",
    padding: "20px",
    background: "#f8f9fa",
    borderRadius: "12px",
    flexWrap: "wrap",
    gap: "20px",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textAlign: "center",
  },
  summaryItemLabel: {
    fontSize: "13px",
    color: "#999",
    fontWeight: 600,
  },
  summaryItemValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#667eea",
  },
  loadingSmall: {
    padding: "40px",
    textAlign: "center",
    color: "#999",
  },
  noData: {
    padding: "40px",
    textAlign: "center",
    color: "#999",
    fontSize: "16px",
  },
  chartsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
    gap: "20px",
    marginBottom: "20px",
  },
  chartCard: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  chartTitle: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "20px",
    color: "#333",
  },
  expenseList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  expenseItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  expenseName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#333",
    marginBottom: "6px",
  },
  expenseBar: {
    height: "8px",
    background: "#f0f0f0",
    borderRadius: "4px",
    width: "200px",
    overflow: "hidden",
  },
  expenseBarFill: {
    height: "100%",
    borderRadius: "4px",
  },
  expenseAmount: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#667eea",
    minWidth: "100px",
    textAlign: "right",
  },
  recommendationsCard: {
    background: "#fff9e6",
    borderRadius: "16px",
    padding: "24px",
    marginTop: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  recommendations: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
  },
  recommendation: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    borderLeft: "4px solid #27ae60",
  },
  savingsAmount: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#27ae60",
    marginBottom: "8px",
  },
  recType: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  recMessage: {
    fontSize: "14px",
    color: "#666",
    lineHeight: 1.5,
  },
};

export default Dashboard;
