import sqlite3
import os
import json
from datetime import datetime, timedelta
import random
import shutil

DB_PATH = os.path.join(os.path.dirname(__file__), "streamflow.db")

# Vercel filesystem is read-only, so copy the db to /tmp for write operations
if os.environ.get("VERCEL"):
    original_db = DB_PATH
    DB_PATH = "/tmp/streamflow.db"
    if not os.path.exists(DB_PATH) and os.path.exists(original_db):
        try:
            shutil.copy2(original_db, DB_PATH)
            # Also copy WAL files if they exist to keep the database consistent
            for suffix in ["-shm", "-wal"]:
                orig_file = original_db + suffix
                dest_file = DB_PATH + suffix
                if os.path.exists(orig_file):
                    shutil.copy2(orig_file, dest_file)
        except Exception as e:
            print(f"Error copying database to /tmp: {e}")


_db_initialized = False

def get_db_connection():
    global _db_initialized
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for concurrent read/write access without locking
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=10000")
    conn.execute("PRAGMA cache_size=-32000")  # 32 MB cache
    
    if not _db_initialized:
        _db_initialized = True
        try:
            c = conn.cursor()
            c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Dim_Product'")
            if not c.fetchone():
                init_db_with_conn(conn)
        except Exception as e:
            _db_initialized = False
            raise e
            
    return conn

def init_db():
    conn = get_db_connection()
    init_db_with_conn(conn)
    conn.close()

def init_db_with_conn(conn):
    cursor = conn.cursor()

    # --- BRONZE LAYER (Raw, Immutable) ---
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Bronze_Orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL,
        raw_message TEXT NOT NULL,
        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # --- SILVER LAYER (Cleaned, Standardized, Enriched) ---
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Silver_Orders (
        order_id TEXT PRIMARY KEY,
        customer_id TEXT,
        product_id TEXT,
        quantity INTEGER,
        price REAL,
        amount REAL,
        currency TEXT,
        usd_amount REAL,
        transaction_date TEXT,
        device TEXT,
        ip_address TEXT,
        email TEXT,
        billing_country TEXT,
        shipping_country TEXT,
        card_status TEXT,
        fraud_score REAL,
        is_fraud INTEGER,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Silver_Payments (
        payment_id TEXT PRIMARY KEY,
        order_id TEXT,
        customer_id TEXT,
        amount REAL,
        payment_method TEXT,
        payment_status TEXT,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Silver_Returns (
        return_id TEXT PRIMARY KEY,
        order_id TEXT,
        product_id TEXT,
        return_reason TEXT,
        refund_amount REAL,
        refund_status TEXT,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # --- GOLD LAYER (Star Schema Dimensions) ---
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Dim_Customer (
        customer_id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        signup_date TEXT,
        country TEXT,
        region TEXT,
        segment TEXT,
        customer_type TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Dim_Product (
        product_id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        subcategory TEXT,
        unit_price REAL,
        supplier_id TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Dim_Date (
        date_key INTEGER PRIMARY KEY,
        full_date TEXT,
        year INTEGER,
        quarter INTEGER,
        month INTEGER,
        month_name TEXT,
        day INTEGER,
        day_of_week TEXT,
        is_weekend INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Dim_Time (
        time_key INTEGER PRIMARY KEY,
        hour INTEGER,
        minute INTEGER,
        second INTEGER,
        time_of_day TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Dim_Country (
        country_code TEXT PRIMARY KEY,
        country_name TEXT,
        continent TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Dim_State (
        state_code TEXT PRIMARY KEY,
        state_name TEXT,
        country_code TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Dim_Seller (
        seller_id TEXT PRIMARY KEY,
        name TEXT,
        rating REAL,
        status TEXT
    )
    """)

    # --- GOLD LAYER (Star Schema Facts) ---
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Fact_Orders (
        order_key INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT,
        customer_id TEXT,
        product_id TEXT,
        date_key INTEGER,
        time_key INTEGER,
        quantity INTEGER,
        price REAL,
        discount_amount REAL,
        net_amount REAL,
        tax_amount REAL,
        shipping_amount REAL,
        fraud_flag INTEGER,
        FOREIGN KEY(customer_id) REFERENCES Dim_Customer(customer_id),
        FOREIGN KEY(product_id) REFERENCES Dim_Product(product_id),
        FOREIGN KEY(date_key) REFERENCES Dim_Date(date_key)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Fact_Payments (
        payment_key INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT,
        order_id TEXT,
        customer_id TEXT,
        date_key INTEGER,
        amount REAL,
        payment_method TEXT,
        status TEXT,
        FOREIGN KEY(customer_id) REFERENCES Dim_Customer(customer_id),
        FOREIGN KEY(date_key) REFERENCES Dim_Date(date_key)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Fact_Returns (
        return_key INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id TEXT,
        order_id TEXT,
        product_id TEXT,
        date_key INTEGER,
        refund_amount REAL,
        reason TEXT,
        FOREIGN KEY(product_id) REFERENCES Dim_Product(product_id),
        FOREIGN KEY(date_key) REFERENCES Dim_Date(date_key)
    )
    """)

    # System Logs for Airflow / Spark Monitoring
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS System_Logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        component TEXT,
        log_level TEXT,
        message TEXT
    )
    """)

    # Seed static dimensions if empty
    cursor.execute("SELECT COUNT(*) FROM Dim_Product")
    if cursor.fetchone()[0] == 0:
        seed_dimensions(conn)
        seed_historical_data(conn)

    conn.commit()

def seed_dimensions(conn):
    cursor = conn.cursor()

    # Seed Dim_Country
    countries = [
        ("US", "United States", "North America"),
        ("CA", "Canada", "North America"),
        ("GB", "United Kingdom", "Europe"),
        ("DE", "Germany", "Europe"),
        ("FR", "France", "Europe"),
        ("JP", "Japan", "Asia"),
        ("AU", "Australia", "Oceania"),
        ("IN", "India", "Asia")
    ]
    cursor.executemany("INSERT INTO Dim_Country VALUES (?,?,?)", countries)

    # Seed Dim_State
    states = [
        ("NY", "New York", "US"), ("CA", "California", "US"), ("TX", "Texas", "US"),
        ("ON", "Ontario", "CA"), ("QC", "Quebec", "CA"),
        ("LDN", "London", "GB"), ("MAN", "Manchester", "GB"),
        ("BY", "Bavaria", "DE"), ("BE", "Berlin", "DE"),
        ("IDF", "Île-de-France", "FR"),
        ("TKY", "Tokyo", "JP"), ("OSA", "Osaka", "JP"),
        ("NSW", "New South Wales", "AU"), ("VIC", "Victoria", "AU"),
        ("MH", "Maharashtra", "IN"), ("DL", "Delhi", "IN")
    ]
    cursor.executemany("INSERT INTO Dim_State VALUES (?,?,?)", states)

    # Seed Dim_Seller
    sellers = [
        ("SEL001", "Nexus Retail", 4.8, "Active"),
        ("SEL002", "Nova E-Commerce", 4.5, "Active"),
        ("SEL003", "Apex Goods", 4.2, "Active"),
        ("SEL004", "Prime Deals", 3.9, "Warning"),
        ("SEL005", "Summit Global", 4.9, "Active")
    ]
    cursor.executemany("INSERT INTO Dim_Seller VALUES (?,?,?,?)", sellers)

    # Seed Dim_Product
    products = [
        ("PROD001", "UltraBook Pro 15", "Electronics", "Computers", 1299.99, "SEL001"),
        ("PROD002", "Smart Noise-Cancelling Headphones", "Electronics", "Audio", 299.99, "SEL001"),
        ("PROD003", "Neo QLED 4K Smart TV 65", "Electronics", "Video", 1499.99, "SEL002"),
        ("PROD004", "Premium Leather Jacket", "Fashion", "Outerwear", 249.99, "SEL003"),
        ("PROD005", "Running Flyknit Sneakers", "Fashion", "Footwear", 120.00, "SEL003"),
        ("PROD006", "Minimalist Quartz Watch", "Fashion", "Accessories", 85.00, "SEL003"),
        ("PROD007", "Ergonomic Office Chair", "Home", "Furniture", 349.99, "SEL002"),
        ("PROD008", "Stainless Steel Smart Thermos", "Home", "Kitchen", 45.00, "SEL004"),
        ("PROD009", "Robot Vacuum Cleaner", "Home", "Appliances", 399.99, "SEL004"),
        ("PROD010", "Adjustable Dumbbell Set (50lbs)", "Sports", "Fitness", 180.00, "SEL005"),
        ("PROD011", "Carbon Fiber Road Bike", "Sports", "Outdoor", 2100.00, "SEL005"),
        ("PROD012", "E-commerce System Design Book", "Books", "Education", 49.99, "SEL002"),
        ("PROD013", "The Great Gatsby Special Edition", "Books", "Fiction", 24.99, "SEL002")
    ]
    cursor.executemany("INSERT INTO Dim_Product VALUES (?,?,?,?,?,?)", products)

    # Seed Dim_Customer
    customers = [
        ("CUST001", "John Doe", "john.doe@gmail.com", "2025-01-10", "US", "North America", "Enterprise", "Returning"),
        ("CUST002", "Jane Smith", "jane.smith@yahoo.com", "2025-02-15", "CA", "North America", "Standard", "Returning"),
        ("CUST003", "Alice Johnson", "alice.j@outlook.com", "2025-03-20", "GB", "Europe", "Premium", "Returning"),
        ("CUST004", "Bob Miller", "bob.miller@gmail.com", "2025-04-05", "DE", "Europe", "Standard", "New"),
        ("CUST005", "Yuki Sato", "yuki.sato@gmail.com", "2025-05-12", "JP", "Asia", "Premium", "Returning"),
        ("CUST006", "Liam Davies", "liam.d@gmail.com", "2025-05-18", "AU", "Oceania", "Standard", "New"),
        ("CUST007", "Priya Sharma", "priya.sharma@gmail.com", "2025-06-01", "IN", "Asia", "Enterprise", "Returning"),
        ("CUST008", "Emma Dubois", "emma.dubois@gmail.com", "2025-06-20", "FR", "Europe", "Premium", "New"),
    ]
    cursor.executemany("INSERT INTO Dim_Customer VALUES (?,?,?,?,?,?,?,?)", customers)

    # Seed Dim_Date (past 30 days + next 7 days)
    start_date = datetime.now() - timedelta(days=30)
    dates = []
    for i in range(40):
        curr = start_date + timedelta(days=i)
        date_key = int(curr.strftime("%Y%m%d"))
        dates.append((
            date_key,
            curr.strftime("%Y-%m-%d"),
            curr.year,
            (curr.month - 1) // 3 + 1,
            curr.month,
            curr.strftime("%B"),
            curr.day,
            curr.strftime("%A"),
            1 if curr.weekday() in (5, 6) else 0
        ))
    cursor.executemany("INSERT INTO Dim_Date VALUES (?,?,?,?,?,?,?,?,?)", dates)

    # Seed Dim_Time
    times = []
    for hour in range(24):
        for minute in [0, 15, 30, 45]:
            time_key = hour * 100 + minute
            time_of_day = "Morning" if 5 <= hour < 12 else "Afternoon" if 12 <= hour < 17 else "Evening" if 17 <= hour < 21 else "Night"
            times.append((
                time_key, hour, minute, 0, time_of_day
            ))
    cursor.executemany("INSERT INTO Dim_Time VALUES (?,?,?,?,?)", times)


def seed_historical_data(conn):
    cursor = conn.cursor()

    # Generate realistic historical orders (past 7 days)
    products_db = [
        ("PROD001", 1299.99), ("PROD002", 299.99), ("PROD003", 1499.99),
        ("PROD004", 249.99), ("PROD005", 120.00), ("PROD006", 85.00),
        ("PROD007", 349.99), ("PROD008", 45.00), ("PROD009", 399.99),
        ("PROD010", 180.00), ("PROD011", 2100.00), ("PROD012", 49.99)
    ]
    customers_db = ["CUST001", "CUST002", "CUST003", "CUST004", "CUST005", "CUST006", "CUST007", "CUST008"]
    payment_methods = ["Credit Card", "PayPal", "Apple Pay", "Google Pay", "Bank Transfer"]
    countries = ["US", "CA", "GB", "DE", "FR", "JP", "AU", "IN"]

    start_date = datetime.now() - timedelta(days=7)
    order_id_seq = 1000

    for i in range(120):  # Generate 120 historical orders
        curr_date = start_date + timedelta(minutes=random.randint(10, 10080))
        date_key = int(curr_date.strftime("%Y%m%d"))
        time_key = curr_date.hour * 100 + (curr_date.minute - curr_date.minute % 15)

        order_id = f"ORD{order_id_seq + i}"
        customer_id = random.choice(customers_db)
        product_id, unit_price = random.choice(products_db)
        quantity = random.randint(1, 3)
        price = unit_price
        amount = price * quantity
        discount = round(amount * random.choice([0, 0, 0.05, 0.1]), 2)
        net_amount = amount - discount
        tax = round(net_amount * 0.08, 2)
        shipping = 15.00 if net_amount < 200 else 0.00

        country = random.choice(countries)
        email = f"cust_{customer_id.lower()}@gmail.com"

        # Raw bronze message
        raw_msg = {
            "order_id": order_id,
            "customer_id": customer_id,
            "product_id": product_id,
            "quantity": quantity,
            "price": price,
            "currency": "USD",
            "transaction_date": curr_date.isoformat(),
            "device": random.choice(["Mobile", "Desktop", "Tablet"]),
            "ip_address": f"192.168.1.{random.randint(1, 254)}",
            "email": email,
            "billing_country": country,
            "shipping_country": country,
            "card_status": "Approved" if random.random() > 0.02 else "Blocked"
        }

        # Save to Bronze
        cursor.execute(
            "INSERT INTO Bronze_Orders (topic, raw_message, ingested_at) VALUES (?,?,?)",
            ("orders", json.dumps(raw_msg), curr_date.isoformat())
        )

        # Apply Silver transform logic (cleaned)
        is_fraud = 1 if (net_amount > 5000 or raw_msg["card_status"] == "Blocked") else 0
        fraud_score = 95.0 if is_fraud else round(random.uniform(1.0, 45.0), 1)

        cursor.execute("""
        INSERT INTO Silver_Orders (
            order_id, customer_id, product_id, quantity, price, amount, currency, usd_amount,
            transaction_date, device, ip_address, email, billing_country, shipping_country,
            card_status, fraud_score, is_fraud, processed_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            order_id, customer_id, product_id, quantity, price, amount, "USD", net_amount,
            curr_date.isoformat(), raw_msg["device"], raw_msg["ip_address"], email, country, country,
            raw_msg["card_status"], fraud_score, is_fraud, curr_date.isoformat()
        ))

        # Payments
        payment_id = f"PAY{2000 + i}"
        pay_status = "Success" if is_fraud == 0 else "Failed"
        cursor.execute("""
        INSERT INTO Silver_Payments (payment_id, order_id, customer_id, amount, payment_method, payment_status, processed_at)
        VALUES (?,?,?,?,?,?,?)
        """, (
            payment_id, order_id, customer_id, net_amount + tax + shipping, random.choice(payment_methods), pay_status, curr_date.isoformat()
        ))

        # Save to Gold
        if is_fraud == 0:
            cursor.execute("""
            INSERT INTO Fact_Orders (
                order_id, customer_id, product_id, date_key, time_key, quantity, price, discount_amount, net_amount, tax_amount, shipping_amount, fraud_flag
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                order_id, customer_id, product_id, date_key, time_key, quantity, price, discount, net_amount, tax, shipping, 0
            ))

            cursor.execute("""
            INSERT INTO Fact_Payments (payment_id, order_id, customer_id, date_key, amount, payment_method, status)
            VALUES (?,?,?,?,?,?,?)
            """, (
                payment_id, order_id, customer_id, date_key, net_amount + tax + shipping, random.choice(payment_methods), "Success"
            ))

            # Simulate returns for 5% of orders
            if random.random() < 0.05:
                return_id = f"RET{3000 + i}"
                ret_date = curr_date + timedelta(days=random.randint(1, 3))
                ret_date_key = int(ret_date.strftime("%Y%m%d"))
                cursor.execute("""
                INSERT INTO Silver_Returns (return_id, order_id, product_id, return_reason, refund_amount, refund_status, processed_at)
                VALUES (?,?,?,?,?,?,?)
                """, (
                    return_id, order_id, product_id, "Damaged/Defective" if random.random() > 0.5 else "Wrong Size", net_amount, "Processed", ret_date.isoformat()
                ))

                cursor.execute("""
                INSERT INTO Fact_Returns (return_id, order_id, product_id, date_key, refund_amount, reason)
                VALUES (?,?,?,?,?,?)
                """, (
                    return_id, order_id, product_id, ret_date_key, net_amount, "Damaged" if random.random() > 0.5 else "Size"
                ))

    # Add historical log entries
    logs = [
        ("Kafka-Ingestion", "INFO", "Started StreamFlow Event Ingestor consumer group order-readers"),
        ("Spark-Streaming", "INFO", "Spark Streaming Context successfully initialized on Master node spark://172.20.0.3:7077"),
        ("Airflow-Scheduler", "INFO", "DAG 'streamflow_data_lakehouse' scheduled run successfully queued"),
        ("dbt-Runner", "INFO", "dbt run completed successfully. 12 models built, 24 tests passed.")
    ]
    for comp, lvl, msg in logs:
        cursor.execute("INSERT INTO System_Logs (component, log_level, message) VALUES (?,?,?)", (comp, lvl, msg))

if __name__ == "__main__":
    init_db()
    print("Database schema initialized and dimensions seeded successfully.")
