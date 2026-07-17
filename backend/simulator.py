import asyncio
import json
import random
from datetime import datetime
import os
import sqlite3
import math
from database import get_db_connection

class StreamingSimulator:
    def __init__(self):
        self.is_running = True
        self.is_paused = False
        self.events_per_second = 5  # Initial event rate
        self.fraud_rate = 5         # Percentage of orders that should trigger fraud
        self.kafka_lag = 0
        self.spark_throughput = 0.0
        self.spark_latency = 25.0    # ms
        self.spark_status = "Active"
        
        self.websocket_connections = set()
        self.message_queue = asyncio.Queue()
        self.loop_task = None
        
        # Airflow simulation state
        self.airflow_status = "Idle"
        self.airflow_progress = 0
        self.airflow_logs = []
        self.airflow_task = None

        # Cache of dimensions from SQLite to speed up event generation
        self.products = []
        self.customers = []
        self.load_dimensions()

        # KPI Caching to prevent database thrashing
        self.last_kpi_time = 0.0
        self.cached_kpis = None

    def load_dimensions(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT product_id, unit_price, category FROM Dim_Product")
        self.products = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("SELECT customer_id, name, email, country FROM Dim_Customer")
        self.customers = [dict(row) for row in cursor.fetchall()]
        conn.close()

    async def register_connection(self, websocket):
        self.websocket_connections.add(websocket)
        # Send initial configuration and KPIs
        try:
            kpis = await asyncio.to_thread(self.calculate_kpis)
            await websocket.send_text(json.dumps({
                "type": "init",
                "config": {
                    "is_running": self.is_running,
                    "is_paused": self.is_paused,
                    "events_per_second": self.events_per_second,
                    "fraud_rate": self.fraud_rate,
                    "kafka_lag": self.kafka_lag,
                    "spark_throughput": self.spark_throughput,
                    "spark_latency": self.spark_latency,
                    "spark_status": self.spark_status,
                    "airflow_status": self.airflow_status,
                    "airflow_progress": self.airflow_progress
                },
                "kpis": kpis
            }))
        except Exception as e:
            # Client disconnected before/during init — remove from pool immediately
            import sys
            print(f"[WS] register_connection failed ({type(e).__name__}), removing dead socket", file=sys.stderr)
            self.websocket_connections.discard(websocket)

    def unregister_connection(self, websocket):
        self.websocket_connections.discard(websocket)

    async def broadcast(self, data):
        if not self.websocket_connections:
            return
        dead_connections = set()
        message_str = json.dumps(data)
        for ws in self.websocket_connections:
            try:
                await ws.send_text(message_str)
            except Exception:
                dead_connections.add(ws)
        for ws in dead_connections:
            self.unregister_connection(ws)

    def start_simulation(self):
        self.is_running = True
        self.is_paused = False
        if not self.loop_task or self.loop_task.done():
            self.loop_task = asyncio.create_task(self.simulation_loop())

    def stop_simulation(self):
        self.is_running = False
        self.spark_throughput = 0.0

    def pause_simulation(self):
        self.is_paused = True
        self.spark_throughput = 0.0

    def resume_simulation(self):
        self.is_paused = False
        self.is_running = True

    def set_config(self, events_per_second, fraud_rate):
        self.events_per_second = max(1, min(events_per_second, 500))
        self.fraud_rate = max(0, min(fraud_rate, 100))
        # Schedule an async broadcast so the frontend sees the update immediately
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.broadcast({
                    "type": "config_update",
                    "config": {
                        "is_running": self.is_running,
                        "is_paused": self.is_paused,
                        "events_per_second": self.events_per_second,
                        "fraud_rate": self.fraud_rate
                    }
                }))
        except RuntimeError:
            pass

    async def simulation_loop(self):
        # Start order sequence from the highest existing order_id to avoid UNIQUE constraint errors
        try:
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("SELECT MAX(CAST(SUBSTR(order_id, 4) AS INTEGER)) FROM Silver_Orders WHERE order_id LIKE 'ORD%'")
            row = c.fetchone()
            conn.close()
            order_seq = (row[0] or 5000) + 1
        except Exception:
            order_seq = 5000
        while self.is_running:
            if self.is_paused:
                await asyncio.sleep(0.5)
                continue

            # Calculate sleep time based on events per second
            sleep_time = 1.0 / self.events_per_second
            await asyncio.sleep(sleep_time)

            # 1. Generate Order Event
            order_seq += 1
            event = self.generate_event(order_seq)
            
            # Simulate real-time stats
            self.kafka_lag = max(0, self.kafka_lag + random.choice([-1, 1, 2, -2, 0]))
            if self.kafka_lag > 50:
                self.kafka_lag = random.randint(10, 40)
            self.spark_throughput = round(self.events_per_second * random.uniform(0.95, 1.05), 1)
            self.spark_latency = round(random.uniform(15.0, 45.0) + (self.events_per_second * 0.05), 1)

            # 2. Store and process in database layers
            try:
                processed_info = await asyncio.to_thread(self.process_pipeline, event)
                
                # Cache KPI calculations to at most once per second to prevent database locks & thrashing
                current_time = asyncio.get_event_loop().time()
                if self.cached_kpis is None or (current_time - self.last_kpi_time) >= 1.0:
                    self.cached_kpis = await asyncio.to_thread(self.calculate_kpis)
                    self.last_kpi_time = current_time
                kpis = self.cached_kpis
                
                # 3. Broadcast real-time update
                await self.broadcast({
                    "type": "event",
                    "event": processed_info,
                    "metrics": {
                        "kafka_lag": self.kafka_lag,
                        "spark_throughput": self.spark_throughput,
                        "spark_latency": self.spark_latency,
                        "spark_status": self.spark_status
                    },
                    "kpis": kpis
                })
            except Exception as e:
                import traceback, sys
                print(f"[Simulator ERROR] Simulation cycle failed: {e}", file=sys.stderr)
                traceback.print_exc(file=sys.stderr)
                # Try to log error to SQLite (best-effort)
                try:
                    conn = get_db_connection()
                    c = conn.cursor()
                    c.execute("INSERT INTO System_Logs (component, log_level, message) VALUES (?,?,?)",
                              ("Simulator", "ERROR", f"Simulation cycle failed: {str(e)[:500]}"))
                    conn.commit()
                    conn.close()
                except Exception:
                    pass
                # Small sleep to prevent tight crash loops
                await asyncio.sleep(0.5)

    def generate_event(self, seq_id):
        customer = random.choice(self.customers)
        product = random.choice(self.products)
        
        # Decide if this should be flagged as fraud based on user rate
        trigger_fraud = (random.random() * 100) < self.fraud_rate
        
        order_id = f"ORD{seq_id}"
        quantity = random.randint(1, 4)
        price = product["unit_price"]
        amount = round(price * quantity, 2)
        
        # Generate some fraudulent values
        card_status = "Approved"
        billing_country = customer["country"]
        shipping_country = customer["country"]
        ip_addr = f"192.168.1.{random.randint(1, 254)}"
        
        if trigger_fraud:
            rule_type = random.choice(["card", "amount", "country", "travel"])
            if rule_type == "card":
                card_status = "Blocked"
            elif rule_type == "amount":
                # Trigger heavy order amount
                quantity = random.randint(20, 50)
                amount = round(price * quantity, 2)
            elif rule_type == "country":
                # Different country
                other_countries = [c["country_code"] for c in [
                    {"country_code": "US"}, {"country_code": "DE"}, {"country_code": "JP"}
                ] if c["country_code"] != customer["country"]]
                shipping_country = random.choice(other_countries) if other_countries else "DE"
            elif rule_type == "travel":
                # Impossible travel location ip address
                ip_addr = f"{random.randint(5, 200)}.{random.randint(10, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}"

        return {
            "order_id": order_id,
            "customer_id": customer["customer_id"],
            "product_id": product["product_id"],
            "quantity": quantity,
            "price": price,
            "amount": amount,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat(),
            "device": random.choice(["Mobile", "Desktop", "Tablet"]),
            "ip_address": ip_addr,
            "email": customer["email"],
            "billing_country": billing_country,
            "shipping_country": shipping_country,
            "card_status": card_status
        }

    def process_pipeline(self, event):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # A. Bronze Layer (Raw, JSON)
        cursor.execute(
            "INSERT INTO Bronze_Orders (topic, raw_message) VALUES (?, ?)",
            ("orders", json.dumps(event))
        )
        bronze_id = cursor.lastrowid
        
        # B. Silver Layer (Clean, Validate, Deduplicate)
        # Standardize amount & currency conversion (if other than USD, here we use USD as default but can convert)
        usd_amount = event["amount"] 
        
        # Apply Fraud Rules
        is_fraud = 0
        fraud_reasons = []
        
        if event["amount"] > 5000:
            is_fraud = 1
            fraud_reasons.append("Amount > $5000 threshold")
        if event["card_status"] == "Blocked":
            is_fraud = 1
            fraud_reasons.append("Payment card is flagged as blocked")
        if event["billing_country"] != event["shipping_country"]:
            is_fraud = 1
            fraud_reasons.append("Billing and Shipping country mismatch")
            
        # Add random impossible travel IP simulation or emails
        if event["ip_address"].startswith("192.168") == False and random.random() < 0.1:
            is_fraud = 1
            fraud_reasons.append("Impossible travel travel IP detected")

        fraud_score = 0.0
        if is_fraud:
            fraud_score = round(random.uniform(75.0, 99.9), 1)
        else:
            fraud_score = round(random.uniform(0.5, 35.0), 1)

        cursor.execute("""
        INSERT OR IGNORE INTO Silver_Orders (
            order_id, customer_id, product_id, quantity, price, amount, currency, usd_amount,
            transaction_date, device, ip_address, email, billing_country, shipping_country,
            card_status, fraud_score, is_fraud
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            event["order_id"], event["customer_id"], event["product_id"], event["quantity"],
            event["price"], event["amount"], event["currency"], usd_amount, event["transaction_date"],
            event["device"], event["ip_address"], event["email"], event["billing_country"],
            event["shipping_country"], event["card_status"], fraud_score, is_fraud
        ))

        # Payments — tie payment_id to order_id to guarantee uniqueness across restarts
        payment_id = f"PAY{event['order_id'][3:]}"  # e.g. ORD5123 -> PAY5123
        payment_method = random.choice(["Credit Card", "PayPal", "Apple Pay", "Google Pay"])
        payment_status = "Failed" if is_fraud else "Success"
        
        cursor.execute("""
        INSERT OR IGNORE INTO Silver_Payments (payment_id, order_id, customer_id, amount, payment_method, payment_status)
        VALUES (?,?,?,?,?,?)
        """, (
            payment_id, event["order_id"], event["customer_id"], usd_amount, payment_method, payment_status
        ))

        # C. Gold Layer (Fact tables)
        date_key = int(datetime.now().strftime("%Y%m%d"))
        time_key = datetime.now().hour * 100 + datetime.now().minute
        
        if not is_fraud:
            discount = round(usd_amount * random.choice([0, 0, 0, 0.05, 0.1]), 2)
            net = usd_amount - discount
            tax = round(net * 0.08, 2)
            shipping = 15.00 if net < 150 else 0.00
            
            cursor.execute("""
            INSERT OR IGNORE INTO Fact_Orders (
                order_id, customer_id, product_id, date_key, time_key, quantity, price, discount_amount, net_amount, tax_amount, shipping_amount, fraud_flag
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                event["order_id"], event["customer_id"], event["product_id"], date_key, time_key,
                event["quantity"], event["price"], discount, net, tax, shipping, 0
            ))
            
            cursor.execute("""
            INSERT OR IGNORE INTO Fact_Payments (payment_id, order_id, customer_id, date_key, amount, payment_method, status)
            VALUES (?,?,?,?,?,?,?)
            """, (
                payment_id, event["order_id"], event["customer_id"], date_key, net + tax + shipping, payment_method, "Success"
            ))

            # Trigger a return event with a 3% probability
            if random.random() < 0.03:
                return_id = f"RET{event['order_id'][3:]}"  # tied to order_id for uniqueness
                reason = random.choice(["Size Mismatch", "Quality Unsatisfactory", "Late Delivery", "Incorrect Item"])
                cursor.execute("""
                INSERT OR IGNORE INTO Silver_Returns (return_id, order_id, product_id, return_reason, refund_amount, refund_status)
                VALUES (?,?,?,?,?,?)
                """, (
                    return_id, event["order_id"], event["product_id"], reason, net, "Processed"
                ))
                cursor.execute("""
                INSERT OR IGNORE INTO Fact_Returns (return_id, order_id, product_id, date_key, refund_amount, reason)
                VALUES (?,?,?,?,?,?)
                """, (
                    return_id, event["order_id"], event["product_id"], date_key, net, reason
                ))

        conn.commit()
        conn.close()
        
        return {
            **event,
            "is_fraud": is_fraud,
            "fraud_score": fraud_score,
            "fraud_reasons": fraud_reasons,
            "payment_method": payment_method,
            "payment_status": payment_status
        }

    def calculate_kpis(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate last 24 hour stats vs previous
        cursor.execute("SELECT SUM(usd_amount), COUNT(*), SUM(is_fraud) FROM Silver_Orders")
        row = cursor.fetchone()
        total_rev = row[0] or 0.0
        total_orders = row[1] or 0
        total_fraud = row[2] or 0
        
        fraud_ratio = round((total_fraud / total_orders * 100), 2) if total_orders > 0 else 0.0

        # Category sales
        cursor.execute("""
            SELECT p.category, SUM(o.net_amount) 
            from Fact_Orders o
            join Dim_Product p on o.product_id = p.product_id
            group by p.category
        """)
        cat_sales = {row[0]: round(row[1], 2) for row in cursor.fetchall()}

        # Top product sales
        cursor.execute("""
            SELECT p.name, count(o.order_key) as sales_cnt 
            from Fact_Orders o
            join Dim_Product p on o.product_id = p.product_id
            group by p.name
            order by sales_cnt desc
            limit 5
        """)
        top_products = [{"name": r[0], "orders": r[1]} for r in cursor.fetchall()]

        # Sales map geographic counts
        cursor.execute("""
            SELECT billing_country, COUNT(*), SUM(usd_amount)
            FROM Silver_Orders
            GROUP BY billing_country
        """)
        geo_sales = [{"country": r[0], "orders": r[1], "revenue": round(r[2], 2)} for r in cursor.fetchall()]

        # Conversion rate (simulated based on orders vs website visits)
        conversion_rate = round(random.uniform(2.5, 4.2), 2)

        # Returns count
        cursor.execute("SELECT count(*) from Fact_Returns")
        returns_count = cursor.fetchone()[0]

        conn.close()

        return {
            "revenue": round(total_rev, 2),
            "orders": total_orders,
            "fraud_alerts": total_fraud,
            "fraud_ratio": fraud_ratio,
            "conversion_rate": conversion_rate,
            "category_sales": cat_sales,
            "top_products": top_products,
            "geo_sales": geo_sales,
            "returns_count": returns_count
        }

    def start_airflow_dag(self):
        if self.airflow_status == "Running":
            return
        self.airflow_status = "Running"
        self.airflow_progress = 0
        self.airflow_logs = []
        self.airflow_task = asyncio.create_task(self.airflow_dag_loop())

    async def airflow_dag_loop(self):
        steps = [
            ("generate_orders", "Ingesting simulated e-commerce streams to Kafka..."),
            ("kafka_producer", "Kafka Broker partitions balancing. Offsets sync completed."),
            ("spark_bronze", "Spark Structured Streaming: Fetching raw offsets, saving to S3 Bronze layer..."),
            ("spark_silver", "Spark Jobs: Deduplicating transactions, applying validation, parsing fraud rules..."),
            ("spark_gold", "Spark Jobs: Loading data into dimensional Fact/Dim schemas..."),
            ("upload_to_s3", "S3 Data lake partitions synchronized for Bronze, Silver, Gold folders."),
            ("load_snowflake", "Snowflake COPY command: Synchronized DW staging tables..."),
            ("run_dbt", "dbt run: Compiling star schema views, materializing tables..."),
            ("run_tests", "dbt test: Executed primary keys, null values, and custom DQ assertions..."),
            ("refresh_dashboard", "Power BI: Triggered DirectQuery cache reset and dashboard reload."),
            ("slack_notification", "Pipeline complete! Slack webhook sent with exit code 0.")
        ]
        
        for idx, (step_id, message) in enumerate(steps):
            self.airflow_progress = int(((idx + 1) / len(steps)) * 100)
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "step": step_id,
                "message": message,
                "status": "SUCCESS"
            }
            self.airflow_logs.append(log_entry)
            
            # Broadcast the DAG update
            await self.broadcast({
                "type": "airflow",
                "dag": {
                    "status": "Running",
                    "progress": self.airflow_progress,
                    "logs": self.airflow_logs,
                    "active_step": step_id
                }
            })
            
            # Simulate processing delay
            await asyncio.sleep(1.5)

        self.airflow_status = "Success"
        await self.broadcast({
            "type": "airflow",
            "dag": {
                "status": "Success",
                "progress": 100,
                "logs": self.airflow_logs,
                "active_step": "completed"
            }
        })

# Global simulator instance
simulator = StreamingSimulator()
