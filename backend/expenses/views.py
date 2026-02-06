from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth, TruncDate, ExtractWeekDay
from datetime import datetime, timedelta
from decimal import Decimal
from .models import BankAccount, Statement, Transaction
from .serializers import (
    UserSerializer, RegisterSerializer, BankAccountSerializer,
    StatementSerializer, StatementUploadSerializer, TransactionSerializer
)
from .parsers import StatementParser
from django.http import HttpResponse  # ADD THIS AT TOP OF views.py
from django.db.models import Sum, Count
from django.http import HttpResponse
from django.db.models import Sum, Count
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from io import BytesIO




@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class BankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = BankAccountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class StatementViewSet(viewsets.ModelViewSet):
    serializer_class = StatementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        bank_id = self.request.query_params.get('bank_account')
        queryset = Statement.objects.filter(bank_account__user=self.request.user)
        if bank_id:
            queryset = queryset.filter(bank_account_id=bank_id)
        return queryset
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        serializer = StatementUploadSerializer(data=request.data)
        if serializer.is_valid():
            statement = serializer.save()
            
            # Check if bank account belongs to user
            if statement.bank_account.user != request.user:
                statement.delete()
                return Response({'error': 'Invalid bank account'}, status=status.HTTP_403_FORBIDDEN)
            
            # Parse the statement
            try:
                file_path = statement.file.path
                ftype = statement.file_type.lower()

                if ftype == 'csv':
                    transactions_data = StatementParser.parse_csv(file_path)
                elif ftype in ('xls', 'xlsx'):
                    transactions_data = StatementParser.parse_excel(file_path)
                else:
                    transactions_data = StatementParser.parse_pdf(file_path)

                
                # Create transactions
                # Create transactions
                expense_total = Decimal('0')
                income_total = Decimal('0')  # for future use / debugging

                for trans_data in transactions_data:
                    amount = trans_data.get('amount')

                    # Ensure amount is a proper Decimal
                    try:
                        if not isinstance(amount, Decimal):
                            amount = Decimal(str(amount))
                    except Exception:
                        # Skip bad rows just in case
                        continue

                    trans_data['amount'] = amount
                    is_income = bool(trans_data.get('is_income', False))

                    Transaction.objects.create(statement=statement, **trans_data)

                    if is_income:
                        income_total += amount
                    else:
                        expense_total += amount

                # Store only expenses in Statement.total_amount
                statement.total_amount = expense_total
                statement.processed = True
                statement.save()

                return Response(
                    {
                        'message': 'Statement processed successfully',
                        'transaction_count': len(transactions_data),
                        'total_amount': float(expense_total),   # total spending
                        'total_income': float(income_total),    # optional, for your info
                    },
                    status=status.HTTP_201_CREATED,
                )

            
            except Exception as e:
                statement.delete()
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        bank_id = self.request.query_params.get('bank_account')
        statement_id = self.request.query_params.get('statement')  # NEW
        queryset = Transaction.objects.filter(statement__bank_account__user=self.request.user)
        if bank_id:
            queryset = queryset.filter(statement__bank_account_id=bank_id)
        if statement_id:
            queryset = queryset.filter(statement_id=statement_id)  # NEW
        return queryset
    
    @action(detail=False, methods=['get'])
    def export_dashboard(self, request):
        """
        Export a PDF snapshot of the dashboard:
        - Summary (total spending, transactions, categories)
        - Top categories
        - Recent transactions
        """
        bank_id = request.query_params.get('bank_account')
        statement_id = request.query_params.get('statement')

        # Resolve human‑readable names
        bank_label = "All accounts"
        statement_label = "All statements"

        if bank_id:
            bank = BankAccount.objects.filter(
                id=bank_id,
                user=request.user
            ).first()
            if bank:
                # adjust field name if your model differs
                bank_label = bank.bank_name  

        if statement_id:
            stmt = Statement.objects.filter(
                id=statement_id,
                bank_account__user=request.user
            ).first()
            if stmt:
                # 'name' is the custom label you set when uploading
                statement_label = stmt.name or f"Statement {stmt.id}"


        # Use the same filtering logic as get_queryset
        transactions = self.get_queryset()

        expenses = transactions.filter(is_income=False)
        income_qs = transactions.filter(is_income=True)  # for future PDF usage

        total_spending = expenses.aggregate(total=Sum('amount'))['total'] or 0
        total_transactions = expenses.count()
        categories = list(
            expenses.values('category').annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('-total')[:5]
        )


        total_spending = expenses.aggregate(total=Sum('amount'))['total'] or 0
        total_transactions = transactions.count()

        # Top 5 categories
        categories = list(
            expenses.values('category')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )

        # Recent 15 transactions
        recent_transactions = list(
            expenses.order_by('-date')[:15]
        )

        # Start PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        # Header
        story.append(Paragraph("Expense Dashboard Report", styles['Title']))
        story.append(
            Paragraph(
                # f"Account: {bank_id or 'All'} | Statement: {statement_id or 'All'}",
                # styles['Normal'],
                f"Account: {bank_label or 'All'} | Statement: {statement_label or 'All'}",
                styles['Normal'],
            )
        )
        story.append(Spacer(1, 12))

        # Summary table (like the summary cards)
        summary_data = [
            ["Metric", "Value"],
            ["Total Spending", f"QR {float(total_spending):,.2f}"],
            ["Transactions", f"{total_transactions:,}"],
            ["Categories", str(len(categories))],
        ]
        summary_table = Table(summary_data, colWidths=[2.5 * inch, 2.5 * inch])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.darkblue),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.whitesmoke),
                ]
            )
        )
        story.append(summary_table)
        story.append(Spacer(1, 18))

        # Top categories table
        cat_rows = [["#", "Category", "Amount", "% of total"]]
        for i, cat in enumerate(categories, start=1):
            amount = float(cat["total"])
            pct = (amount / float(total_spending) * 100) if total_spending > 0 else 0
            cat_rows.append(
                [
                    i,
                    cat["category"],
                    f"QR {amount:,.2f}",
                    f"{pct:.1f}%",
                ]
            )

        cat_table = Table(cat_rows, colWidths=[0.5 * inch, 2.5 * inch, 1.5 * inch, 1.0 * inch])
        cat_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.green),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey]),
                    ("ALIGN", (1, 1), (1, -1), "LEFT"),
                    ("ALIGN", (2, 1), (2, -1), "RIGHT"),
                    ("ALIGN", (3, 1), (3, -1), "RIGHT"),
                ]
            )
        )

        story.append(Paragraph("Top Spending Categories", styles["Heading2"]))
        if categories:
            story.append(cat_table)
        else:
            story.append(Paragraph("No category data available.", styles["Normal"]))
        story.append(Spacer(1, 18))

        # Recent transactions table (up to 15)
        trans_rows = [["Date", "Description", "Amount", "Category"]]
        for t in recent_transactions:
            trans_rows.append(
                [
                    t.date.strftime("%Y-%m-%d") if t.date else "-",
                    (t.description or "")[:40],
                    f"QR {float(t.amount):,.2f}",
                    t.category or "",
                ]
            )

        trans_table = Table(
            trans_rows, colWidths=[1.0 * inch, 3.0 * inch, 1.3 * inch, 1.2 * inch]
        )
        trans_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.darkgrey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey]),
                    ("ALIGN", (2, 1), (2, -1), "RIGHT"),
                ]
            )
        )

        story.append(Paragraph("Recent Transactions", styles["Heading2"]))
        if recent_transactions:
            story.append(trans_table)
        else:
            story.append(Paragraph("No transactions found.", styles["Normal"]))

        # Build PDF
        doc.build(story)
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="dashboard_report.pdf"'
        return response







@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_analytics(request):
    bank_id = request.query_params.get('bank_account')
    statement_id = request.query_params.get('statement')

    # Base queryset
    transactions = Transaction.objects.filter(
        statement__bank_account__user=request.user
    )
    if bank_id:
        transactions = transactions.filter(statement__bank_account_id=bank_id)
    # NEW: filter by specific statement if provided
    if statement_id:
        transactions = transactions.filter(statement_id=statement_id)

    # Split into expenses and income
    expense_qs = transactions.filter(is_income=False)
    income_qs = transactions.filter(is_income=True)

    # Totals
    total_spending = expense_qs.aggregate(total=Sum('amount'))['total'] or 0
    total_income = income_qs.aggregate(total=Sum('amount'))['total'] or 0
    total_transactions = transactions.count()  # all rows (income + expense)

    # Categories (expenses only)
    categories = expense_qs.values('category').annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('-total')

    
    # Top 5 and Lowest 5 expenses
    top_expenses = list(categories[:5])
    lowest_expenses = list(categories.order_by('total')[:5])
    
    # Spending by day of week
    spending_by_day = expense_qs.annotate(
        day=ExtractWeekDay('date')
    ).values('day').annotate(total=Sum('amount')).order_by('day')
    
    day_names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    day_spending = {day_names[i]: 0 for i in range(7)}
    for item in spending_by_day:
        day_spending[day_names[item['day'] - 1]] = float(item['total'])
    
    # Monthly trend
    monthly_trend = expense_qs.annotate(
        month=TruncMonth('date')
    ).values('month').annotate(total=Sum('amount')).order_by('month')
    
    # Category distribution for pie chart
    category_distribution = [
        {
            'category': cat['category'],
            'amount': float(cat['total']),
            'percentage': round((float(cat['total']) / float(total_spending) * 100), 1) if total_spending > 0 else 0
        }
        for cat in categories
    ]
    
    # Smart recommendations
    recommendations = []
    if categories:
        highest_cat = categories[0]
        recommendations.append({
            'type': 'Spending Pattern',
            'message': f"Your top {len(categories)} spending categories account for {sum(c['total'] for c in categories[:5]) / total_spending * 100:.0f}% of total expenses."
        })
        
        # Potential savings
        food_spending = next((c['total'] for c in categories if c['category'] == 'Food & Dining'), 0)
        if food_spending > 0:
            recommendations.append({
                'type': 'Potential Savings',
                'amount': f"${float(food_spending) * 0.3:.2f}/mo",
                'message': f"Reduce Food & Dining expenses by 30% by meal planning and cooking at home more often."
            })
    
    return Response({
        'summary': {
            'total_spending': float(total_spending),
            'total_income': float(total_income),
            'total_transactions': total_transactions,
            'total_categories': len(categories),
        },
        'top_expenses': top_expenses,
        'lowest_expenses': lowest_expenses,
        'spending_by_day': day_spending,
        'monthly_trend': [
            {'month': item['month'].strftime('%b %Y'), 'total': float(item['total'])}
            for item in monthly_trend
        ],
        'category_distribution': category_distribution,
        'recommendations': recommendations
    })
