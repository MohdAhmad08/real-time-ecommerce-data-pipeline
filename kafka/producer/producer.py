import time
import json
import random
from datetime import datetime
from kafka import KafkaProducer

def get_producer(servers=['localhost:9092']):
    return KafkaProducer(
        bootstrap_servers=servers,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        key_serializer=lambda k: k.encode('utf-8') if k else None
    )

def simulate_order(producer, topic='orders'):
    products = [
        {"id": "PROD001", "price": 1299.99, "category": "Electronics"},
        {"id": "PROD002", "price": 299.99, "category": "Electronics"},
        {"id": "PROD004", "price": 249.99, "category": "Fashion"},
        {"id": "PROD007", "price": 349.99, "category": "Home"},
        {"id": "PROD010", "price": 180.00, "category": "Sports"}
    ]
    
    order_id_seq = 10000
    while True:
        order_id_seq += 1
        product = random.choice(products)
        qty = random.randint(1, 3)
        amount = round(product["price"] * qty, 2)
        
        payload = {
            "order_id": f"ORD{order_id_seq}",
            "customer_id": f"CUST{random.randint(100, 999)}",
            "product_id": product["id"],
            "quantity": qty,
            "price": product["price"],
            "amount": amount,
            "currency": "USD",
            "transaction_date": datetime.utcnow().isoformat(),
            "device": random.choice(["Mobile", "Desktop", "Tablet"]),
            "ip_address": f"192.168.1.{random.randint(2, 254)}",
            "email": f"user_{random.randint(1, 50)}@example.com",
            "billing_country": "US",
            "shipping_country": "US",
            "card_status": "Approved" if random.random() > 0.05 else "Blocked"
        }
        
        # Send event key-partitioned by customer_id for order preservation
        producer.send(topic, key=payload["customer_id"], value=payload)
        print(f"Sent: {payload['order_id']} | Amount: ${payload['amount']}")
        time.sleep(random.uniform(0.5, 2.0))

if __name__ == "__main__":
    print("Initiating Kafka producer streaming loops...")
    try:
        prod = get_producer()
        simulate_order(prod)
    except KeyboardInterrupt:
        print("Producer stopped.")
    except Exception as e:
        print(f"Connection failed: {e}")
