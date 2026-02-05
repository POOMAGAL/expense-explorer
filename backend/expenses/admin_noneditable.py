from django.contrib import admin
from .models import BankAccount, Statement, Transaction

@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ['bank_name', 'user']  # REMOVED account_number
    list_filter = ['bank_name']

@admin.register(Statement)
class StatementAdmin(admin.ModelAdmin):
    list_display = ['name', 'bank_account', 'file_type', 'total_amount', 'processed']
    list_filter = ['bank_account', 'processed']

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['date', 'description', 'amount', 'category']
    list_filter = ['category']
