import pandas as pd
import pdfplumber
import re
from datetime import datetime
from decimal import Decimal
import math

class StatementParser:
    """Parse CSV and PDF credit card statements"""
    
    CATEGORY_KEYWORDS = {
        'Healthcare': [
            'hospital', 'clinic', 'pharmacy', 'medical', 'doctor', 'health', 
            'afia', 'raf pharmacy'  # Doha-specific pharmacies
        ],
        'Food & Dining': [
            'restaurant', 'cafe', 'food', 'dining', 'grocery', 'supermarket',
            'indian sup market', 'new indian sup market', 'lulu hyper market', 
            'family food', 'al aker sweets', 'yummy corn', 'dosa house', 
            'pizza', 'bangle seller', 'bos coffee', 'thaam al shaay', 
            'namma veedu', 'chennai spices', 'mra restaurant', 'aalishan', 'jeelan foodstuff'
        ],
        'Transportation': [
            'uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'transport',
            'woqod', 'qatar rail', 'qatar bahrain internat', 'souq al wakra parking'
        ],
        'Utilities': [
            'electric', 'water', 'internet', 'phone', 'utility', 
            'vodafone', 'ooredoo', 'kahrmaa', 'TANGEDCO', 'vodafone Idea'# Qatar telcos/utilities
        ],
        'Shopping': [
            'amazon', 'shop', 'store', 'mall', 'retail', 'market', 'hyper market',
            'ansar gallery', 'megamart', 'day to day center', 'pan emirates', 'salutary food trading',  
            'fah fah es wakra'
        ],
        'Luxury': [
            'jewelry', 'spa', 'salon', 'luxury', 'kalyan jewellers', 'pearling', 'bangle'
        ],
        'Travel': [
            'hotel', 'airline', 'booking', 'airbnb', 'flight', 'travel', 
            'holiday inn', 'qatar rail', 'Trip', 'visit'
        ],
        'Entertainment': [
            'cinema', 'movie', 'theatre', 'spotify', 'netflix', 'game'
        ],
        'Mutual Funds & Stocks': [
            'mutual fund', 'national pension scheme'
        ],
        'Real Estate': ['building'],
        'Investments': ['sbi gold fund', 'gold bond'],
        'Loan': ['loan'],
        'Savings': ['life insurance corporation', 'pnbmetlife'],
        'Home': ['cpt', 'home monthly', 'kumar monthly'],
        'Education': ['pearling', 'psi', 'swimming']
    }


    @staticmethod
    def categorize_transaction(description):
        """Auto-categorize based on keywords"""
        description_lower = description.lower()
        for category, keywords in StatementParser.CATEGORY_KEYWORDS.items():
            if any(keyword in description_lower for keyword in keywords):
                return category
        return 'Other'

    @staticmethod
    def parse_csv(file_path):
        """Parse CSV statement"""
        try:
            df = pd.read_csv(file_path)
            
            # Common CSV column mappings (adjust based on your CSV format)
            date_cols = ['date', 'Date', 'Transaction Date', 'trans_date']
            desc_cols = ['description', 'Description', 'Merchant', 'Details']
            amount_cols = ['amount', 'Amount', 'Transaction Amount', 'Debit']
            
            date_col = next((col for col in date_cols if col in df.columns), None)
            desc_col = next((col for col in desc_cols if col in df.columns), None)
            amount_col = next((col for col in amount_cols if col in df.columns), None)
            
            if not all([date_col, desc_col, amount_col]):
                raise ValueError("CSV format not recognized. Required columns: date, description, amount")
            
            transactions = []
            for _, row in df.iterrows():
                try:
                    date_str = str(row[date_col])
                    # Try multiple date formats
                    date_obj = None
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']:
                        try:
                            date_obj = datetime.strptime(date_str, fmt).date()
                            break
                        except:
                            continue
                    
                    if not date_obj:
                        continue
                    
                    description = str(row[desc_col])
                    # Parse amount safely
                    raw_amount = str(row[amount_col]).strip().upper()

                    # Skip completely invalid amounts
                    if not raw_amount or raw_amount in ['S', 'NAN', '', 'NONE']:
                        continue

                    # Clean: remove commas, quotes, spaces, currency symbols
                    clean_amount = re.sub(r'[^\d.-]', '', raw_amount)

                    try:
                        amount_float = float(clean_amount)
                        print(f"DEBUG: raw_amount='{raw_amount}', clean_amount='{clean_amount}', amount_float={amount_float}")

                        if not math.isfinite(amount_float):  # Skip NaN, Inf
                            continue
                        amount = abs(amount_float)
                    except (ValueError, TypeError):
                        continue  # Skip any unparseable amount

                    transactions.append({
                        'date': date_obj,
                        'description': description,
                        'amount': Decimal(str(amount)),
                        'category': StatementParser.categorize_transaction(description)
                    })


                except Exception as e:
                    continue
            
            return transactions
        except Exception as e:
            raise ValueError(f"Error parsing CSV: {str(e)}")

    @staticmethod
    def parse_pdf(file_path):
        """Parse PDF statement using pdfplumber"""
        try:
            transactions = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    tables = page.extract_tables()
                    
                    # Method 1: Extract from tables
                    for table in tables:
                        for row in table[1:]:  # Skip header
                            if len(row) < 3:
                                continue
                            try:
                                # Adjust indices based on your PDF format
                                date_str = row[0]
                                description = row[1] if len(row) > 1 else ''
                                amount_str = row[-1]  # Amount usually last column
                                
                                # Parse date
                                date_obj = None
                                for fmt in ['%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y-%m-%d']:
                                    try:
                                        date_obj = datetime.strptime(date_str, fmt).date()
                                        break
                                    except:
                                        continue
                                
                                if not date_obj:
                                    continue
                                
                                # Parse amount
                                amount_clean = re.sub(r'[^\d.]', '', amount_str)
                                amount = abs(float(amount_clean))
                                
                                if amount > 0:
                                    transactions.append({
                                        'date': date_obj,
                                        'description': description,
                                        'amount': Decimal(str(amount)),
                                        'category': StatementParser.categorize_transaction(description)
                                    })
                            except Exception as e:
                                continue
            
            if not transactions:
                raise ValueError("No transactions found in PDF")
            
            return transactions
        except Exception as e:
            raise ValueError(f"Error parsing PDF: {str(e)}")
