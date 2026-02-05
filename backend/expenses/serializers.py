from rest_framework import serializers
from django.contrib.auth.models import User
from .models import BankAccount, Statement, Transaction

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name']
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'amount', 'category', 'created_at']

class StatementSerializer(serializers.ModelSerializer):
    transaction_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Statement
        fields = ['id', 'file', 'name', 'file_type', 'uploaded_at', 'processed', 'total_amount', 'transaction_count']
    
    def get_transaction_count(self, obj):
        return obj.transactions.count()

class BankAccountSerializer(serializers.ModelSerializer):
    statement_count = serializers.SerializerMethodField()
    total_spending = serializers.SerializerMethodField()
    
    class Meta:
        model = BankAccount
        fields = ['id', 'bank_name', 'account_nickname', 'currency', 'created_at', 'statement_count', 'total_spending']
    
    def get_statement_count(self, obj):
        return obj.statements.count()
    
    def get_total_spending(self, obj):
        return sum(s.total_amount for s in obj.statements.all())

class StatementUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Statement
        fields = ['id', 'bank_account', 'file', 'file_type', 'name']
