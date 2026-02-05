import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#667eea', '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#1abc9c', '#e67e22'];

export const SpendingBarChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="amount" fill="#667eea" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const TrendLineChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="total" 
          stroke="#667eea" 
          strokeWidth={3}
          dot={{ fill: '#667eea', r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const CategoryPieChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={(entry) => `${entry.category}: ${entry.percentage}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const ExpenseBarList = ({ expenses, title, type = 'high' }) => {
  const maxAmount = expenses.length > 0 ? expenses[0].total : 1;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.list}>
        {expenses.map((exp, i) => (
          <div key={i} style={styles.item}>
            <div style={{ flex: 1 }}>
              <div style={styles.categoryName}>{exp.category}</div>
              <div style={styles.barContainer}>
                <div 
                  style={{
                    ...styles.bar,
                    width: `${(exp.total / maxAmount) * 100}%`,
                    background: type === 'high' ? COLORS[i % COLORS.length] : '#27ae60'
                  }} 
                />
              </div>
            </div>
            <div style={styles.amount}>${exp.total.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#333',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  barContainer: {
    height: '10px',
    background: '#f0f0f0',
    borderRadius: '5px',
    overflow: 'hidden',
    minWidth: '200px',
  },
  bar: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  },
  amount: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#667eea',
    minWidth: '100px',
    textAlign: 'right',
  },
};

export default { SpendingBarChart, TrendLineChart, CategoryPieChart, ExpenseBarList };
