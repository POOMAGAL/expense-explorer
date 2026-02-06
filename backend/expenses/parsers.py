import pandas as pd
import pdfplumber
import re
from datetime import datetime
from decimal import Decimal
import math


class StatementParser:
    """Parse CSV and PDF bank/credit card statements"""

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
            'namma veedu', 'chennai spices', 'mra restaurant', 'aalishan',
            'jeelan foodstuff'
        ],

        'Transportation': [
            'uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'transport',
            'woqod', 'qatar rail', 'qatar bahrain internat',
            'souq al wakra parking'
        ],

        'Utilities': [
            'electric', 'water', 'internet', 'phone', 'utility',
            'vodafone', 'ooredoo', 'kahrmaa', 'tangedco', 'vodafone idea'
        ],

        'Shopping': [
            'amazon', 'shop', 'store', 'mall', 'retail', 'market',
            'hyper market', 'ansar gallery', 'megamart', 'day to day center',
            'pan emirates', 'salutary food trading', 'fah fah es wakra'
        ],

        'Luxury': [
            'jewelry', 'spa', 'salon', 'luxury', 'kalyan jewellers',
            'pearling', 'bangle'
        ],

        'Travel': [
            'hotel', 'airline', 'booking', 'airbnb', 'flight', 'travel',
            'holiday inn', 'qatar rail', 'trip', 'visit'
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
        'Education': ['pearling', 'psi', 'swimming'],
    }

    @staticmethod
    def categorize_transaction(description):
        """Auto-categorize based on keywords"""
        description_lower = description.lower()
        for category, keywords in StatementParser.CATEGORY_KEYWORDS.items():
            if any(keyword in description_lower for keyword in keywords):
                return category
        return "Other"

    # ------------ Helpers ------------

    @staticmethod
    def _parse_date(date_str):
        if date_str is None:
            return None
        s = str(date_str).strip()
        if not s:
            return None
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%d-%m-%Y",
            "%d-%b-%y",
            "%d-%b-%Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(s, fmt).date()
            except Exception:
                continue
        return None

    @staticmethod
    def _parse_amount(value):
        if pd.isna(value):
            return Decimal("0")
        s = str(value).strip().upper()
        if not s or s in {"S", "NAN", "NONE"}:
            return Decimal("0")
        clean = re.sub(r"[^\d\.-]", "", s)
        if not clean:
            return Decimal("0")
        try:
            amt = Decimal(clean)
            if not math.isfinite(float(amt)):
                return Decimal("0")
            return amt
        except Exception:
            return Decimal("0")

    @staticmethod
    def parse_excel(file_path):
        """
        Parse SBI-style Excel statement with columns:
        Date | Details | Ref No/Cheque No | Debit | Credit | Balance
        Expenses (Debit) -> is_income=False, used in charts.
        Income   (Credit) -> is_income=True, used only for total income.
        """
        try:
            # Read without assuming header row, because there are intro lines
            df_raw = pd.read_excel(file_path, header=None)

            header_row_idx = None
            for i, row in df_raw.iterrows():
                cells = [str(c).strip().lower() for c in row.tolist()]
                if "date" in cells and "debit" in cells and "credit" in cells:
                    header_row_idx = i
                    break

            if header_row_idx is None:
                raise ValueError("Could not find table header row in Excel file.")

            # Re-read with the detected header row
            df = pd.read_excel(file_path, header=header_row_idx)

            # Normalize column names
            df.columns = [str(c).strip() for c in df.columns]
            lower_map = {c.lower(): c for c in df.columns}

            def find_col(possible):
                for key, real in lower_map.items():
                    if key in possible:
                        return real
                return None

            date_col = find_col({"date"})
            desc_col = find_col({"details", "description"})
            debit_col = find_col({"debit"})
            credit_col = find_col({"credit"})

            if not date_col or not desc_col:
                raise ValueError("Excel format not recognized (missing Date/Details columns).")

            transactions = []

            for _, row in df.iterrows():
                try:
                    date_obj = StatementParser._parse_date(row[date_col])
                    if not date_obj:
                        continue

                    description = str(row[desc_col]).strip()

                    debit_amt = (
                        StatementParser._parse_amount(row[debit_col])
                        if debit_col in df.columns
                        else Decimal("0")
                    )
                    credit_amt = (
                        StatementParser._parse_amount(row[credit_col])
                        if credit_col in df.columns
                        else Decimal("0")
                    )

                    # Expense from Debit -> used in charts
                    if debit_amt > 0:
                        transactions.append(
                            {
                                "date": date_obj,
                                "description": description,
                                "amount": debit_amt,
                                "category": StatementParser.categorize_transaction(description),
                                "is_income": False,
                            }
                        )

                    # Income from Credit -> used only for total income
                    if credit_amt > 0:
                        transactions.append(
                            {
                                "date": date_obj,
                                "description": description,
                                "amount": credit_amt,
                                "category": "Income",
                                "is_income": True,
                            }
                        )
                except Exception:
                    continue

            return transactions

        except Exception as e:
            raise ValueError(f"Error parsing Excel: {str(e)}")

    # ------------ CSV ------------

    @staticmethod
    def parse_csv(file_path):
        """
        Parse CSV statement.

        - If 'Debit'/'Credit' columns exist (bank statement like test.csv):
            * Debit  -> expense (is_income=False)  -> used in charts
            * Credit -> income (is_income=True)    -> only for total income
        - Otherwise, assume a single signed amount column (debit-card CSV like
          TransactionHistory-2) where:
            * negative -> expense (is_income=False)
            * positive -> income (is_income=True)
        """
        try:
            df = pd.read_csv(file_path)

            # Normalise column names (strip spaces)
            original_cols = list(df.columns)
            normalized_cols = [c.strip() for c in original_cols]
            df.columns = normalized_cols

            # Map lowercase -> real name
            lower_map = {c.lower(): c for c in df.columns}

            def find_col(possible_names):
                for key, real in lower_map.items():
                    if key in possible_names:
                        return real
                return None

            # Check if we have explicit Debit/Credit columns (bank CSV)
            debit_col = find_col({"debit"})
            credit_col = find_col({"credit"})

            # Common date/description columns
            date_col = find_col(
                {"txn date", "transaction date", "date", "value date"}
            )
            desc_col = find_col(
                {"description", "details", "transaction details", "merchant"}
            )

            transactions = []

            # -------- Branch 1: Debit + Credit columns (test.csv) --------
            if debit_col or credit_col:
                if not date_col or not desc_col:
                    raise ValueError(
                        "CSV format not recognized. Need at least date and description columns."
                    )

                for _, row in df.iterrows():
                    try:
                        date_obj = StatementParser._parse_date(row[date_col])
                        if not date_obj:
                            continue

                        description = str(row[desc_col]).strip()

                        debit_amt = (
                            StatementParser._parse_amount(row[debit_col])
                            if debit_col
                            else Decimal("0")
                        )
                        credit_amt = (
                            StatementParser._parse_amount(row[credit_col])
                            if credit_col
                            else Decimal("0")
                        )

                        # 1) Expense from Debit -> appears in all spend charts
                        if debit_amt > 0:
                            transactions.append(
                                {
                                    "date": date_obj,
                                    "description": description,
                                    "amount": debit_amt,
                                    "category": StatementParser.categorize_transaction(
                                        description
                                    ),
                                    "is_income": False,
                                }
                            )

                        # 2) Income from Credit -> used only for total income
                        if credit_amt > 0:
                            transactions.append(
                                {
                                    "date": date_obj,
                                    "description": description,
                                    "amount": credit_amt,
                                    "category": "Income",
                                    "is_income": True,
                                }
                            )
                    except Exception:
                        continue

                return transactions

            # -------- Branch 2: Single signed amount column (debit-card CSV) --------
            amount_col = find_col(
                {"amount", "transaction amount", "debit amount", "credit amount"}
            )
            if not date_col or not desc_col or not amount_col:
                raise ValueError(
                    "CSV format not recognized. Required columns: date, description, amount."
                )

            for _, row in df.iterrows():
                try:
                    date_obj = StatementParser._parse_date(row[date_col])
                    if not date_obj:
                        continue

                    description = str(row[desc_col]).strip()
                    amt = StatementParser._parse_amount(row[amount_col])
                    if amt == 0:
                        continue

                    is_income = amt > 0
                    amount = abs(amt)

                    transactions.append(
                        {
                            "date": date_obj,
                            "description": description,
                            "amount": amount,
                            "category": (
                                "Income"
                                if is_income
                                else StatementParser.categorize_transaction(
                                    description
                                )
                            ),
                            "is_income": is_income,
                        }
                    )
                except Exception:
                    continue

            return transactions

        except Exception as e:
            raise ValueError(f"Error parsing CSV: {str(e)}")

    # ------------ PDF ------------

    @staticmethod
    def parse_pdf(file_path):
        """
        Parse PDF statement using pdfplumber.

        Assumes table rows like:
            [date, description, ..., amount]

        If the extracted amount is signed:
            * negative -> expense (is_income=False)
            * positive -> income (is_income=True)
        If there is no sign, it is treated as expense.
        """
        try:
            transactions = []

            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    tables = page.extract_tables()

                    for table in tables:
                        # skip header row
                        for row in table[1:]:
                            if len(row) < 3:
                                continue

                            try:
                                date_str = row[0]
                                description = row[1] if len(row) > 1 else ""
                                amount_str = row[-1]  # usually last column

                                date_obj = StatementParser._parse_date(date_str)
                                if not date_obj:
                                    continue

                                # Parse signed amount
                                if amount_str is None:
                                    continue
                                clean = re.sub(r"[^\d\.-]", "", str(amount_str))
                                if not clean:
                                    continue

                                amt_dec = Decimal(clean)
                                if not math.isfinite(float(amt_dec)):
                                    continue
                                if amt_dec == 0:
                                    continue

                                is_income = amt_dec > 0
                                amount = abs(amt_dec)

                                transactions.append(
                                    {
                                        "date": date_obj,
                                        "description": description,
                                        "amount": amount,
                                        "category": (
                                            "Income"
                                            if is_income
                                            else StatementParser.categorize_transaction(
                                                description
                                            )
                                        ),
                                        "is_income": is_income,
                                    }
                                )
                            except Exception:
                                continue

            if not transactions:
                raise ValueError("No transactions found in PDF")

            return transactions

        except Exception as e:
            raise ValueError(f"Error parsing PDF: {str(e)}")
