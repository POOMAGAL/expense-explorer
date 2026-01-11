# expenses/management/commands/init_categories.py
from django.core.management.base import BaseCommand
from expenses.models import Category

class Command(BaseCommand):
    help = 'Initialize default expense categories'

    def handle(self, *args, **kwargs):
        categories = [
            ('FOOD', 'Food & Dining', []),
            ('GROCERIES', 'Groceries', []),
            ('HEALTHCARE', 'Healthcare', []),
            ('ENTERTAINMENT', 'Entertainment', []),
            ('TRANSPORT', 'Transportation', []),
            ('SHOPPING', 'Shopping', []),
            ('UTILITIES', 'Utilities', []),
            ('TRAVEL', 'Travel', []),
            ('LUXURY', 'Luxury', []),
            ('EDUCATION', 'Education', []),
            ('INCOME', 'Income', []),
            ('OTHER', 'Other', []),
            ('UNCATEGORIZED', 'Uncategorized', []),
        ]

        for name, description, keywords in categories:
            category, created = Category.objects.get_or_create(
                name=name,
                defaults={'description': description, 'keywords': keywords}
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created category: {category.get_name_display()}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Category already exists: {category.get_name_display()}')
                )

        self.stdout.write(self.style.SUCCESS('Categories initialized successfully!'))