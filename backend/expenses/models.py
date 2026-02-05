from django.db import models
from django.contrib.auth.models import User

class BankAccount(models.Model):
    """Sub-accounts for different banks"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bank_accounts')
    bank_name = models.CharField(max_length=200)
    account_nickname = models.CharField(max_length=200, blank=True)
    currency = models.CharField(max_length=10, default='USD')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'bank_name']

    def __str__(self):
        return f"{self.user.username} - {self.bank_name}"


class Statement(models.Model):
    """Uploaded credit card statements"""
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='statements')
    file = models.FileField(upload_to='statements/%Y/%m/')
    file_type = models.CharField(max_length=10, choices=[('csv', 'CSV'), ('pdf', 'PDF')])
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # NEW:
    name = models.CharField(max_length=255, blank=True)  # user-friendly label

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        # # Optional: prefer custom name in admin/debug
        # return self.name or f"Statement #{self.id}"
        return f"{self.bank_account.bank_name} - {self.uploaded_at.date()}"
    


class Transaction(models.Model):
    """Individual transactions from statements"""
    CATEGORY_CHOICES = [
        ('Healthcare', 'Healthcare'),
        ('Food & Dining', 'Food & Dining'),
        ('Entertainment', 'Entertainment'),
        ('Transportation', 'Transportation'),
        ('Travel', 'Travel'),
        ('Shopping', 'Shopping'),
        ('Utilities', 'Utilities'),
        ('Luxury', 'Luxury'),
        ('Other', 'Other'),
    ]

    statement = models.ForeignKey(Statement, on_delete=models.CASCADE, related_name='transactions')
    date = models.DateField()
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES, default='Other')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.description} - {self.amount}"
    
class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=100)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    month = models.DateField()  # First day of month
    created_at = models.DateTimeField(auto_now_add=True)

