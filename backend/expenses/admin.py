from django.contrib import admin
from .models import BankAccount, Statement, Transaction, Budget

@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ['bank_name', 'user']
    list_filter = ['bank_name']

class TransactionInline(admin.TabularInline):
    model = Transaction
    extra = 0
    fields = ['date', 'description', 'amount', 'category']
    readonly_fields = ['date', 'amount']

@admin.register(Statement)
class StatementAdmin(admin.ModelAdmin):
    list_display = ['name', 'bank_account', 'file_type', 'total_amount', 'processed']
    list_filter = ['bank_account', 'processed']
    inlines = [TransactionInline]  # ✅ Transactions inline on Statement (correct)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['date', 'description', 'amount', 'category', 'statement']
    list_filter = ['category', 'date']
    list_editable = ['category']  # ✅ Edit category directly here!
    search_fields = ['description']

    actions = ['export_excel_admin', 'export_pdf_admin']
    
    def export_excel_admin(self, request, queryset):
        # Similar Excel logic for admin
        pass
    export_excel_admin.short_description = "Export selected to Excel"

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ['category', 'bank_account', 'amount', 'month', 'remaining']
    list_filter = ['category', 'month']
    
    def remaining(self, obj):
        actual = Transaction.objects.filter(
            statement__bank_account=obj.bank_account,
            category=obj.category,
            date__month=obj.month.month,
            date__year=obj.month.year
        ).aggregate(total=Sum('amount'))['total'] or 0
        return obj.amount - actual
    remaining.short_description = 'Remaining'

