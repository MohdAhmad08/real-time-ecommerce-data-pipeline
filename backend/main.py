from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import jwt
from datetime import datetime, timedelta
import sqlite3
import os
import asyncio
import json

from database import get_db_connection, DB_PATH
from simulator import simulator

SECRET_KEY = "streamflow_super_secret_key"
ALGORITHM = "HS256"

app = FastAPI(title="StreamFlow Data Lakehouse Platform API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

security = HTTPBearer()

# --- Pydantic Models ---
class UserRegister(BaseModel):
    username: str
    password: str
    role: str  # Admin, Data Engineer, Analyst

class UserLogin(BaseModel):
    username: str
    password: str

class SimConfig(BaseModel):
    events_per_second: int
    fraud_rate: int

class SqlQuery(BaseModel):
    query: str

# Create dynamic Auth table if not exists
def create_auth_table():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS Users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)
    conn.commit()
    conn.close()

create_auth_table()

# Helper for JWT
def generate_token(username: str, role: str) -> str:
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- AUTH API ---
@app.post("/api/auth/register")
def register(user: UserRegister):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Simple hashed password using sha256 for lightweight reliability
        import hashlib
        pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
        c.execute("INSERT INTO Users VALUES (?, ?, ?)", (user.username, pwd_hash, user.role))
        conn.commit()
        
        # Add to logs
        c.execute("INSERT INTO System_Logs (component, log_level, message) VALUES (?,?,?)", 
                  ("Auth", "INFO", f"New user '{user.username}' registered as {user.role}"))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        conn.close()
    return {"message": "User registered successfully"}

@app.post("/api/auth/login")
def login(user: UserLogin):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT password_hash, role FROM Users WHERE username = ?", (user.username,))
    row = c.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
    import hashlib
    pwd_hash = hashlib.sha256(user.password.encode()).hexdigest()
    if pwd_hash != row[0]:
         raise HTTPException(status_code=400, detail="Invalid username or password")
         
    token = generate_token(user.username, row[1])
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "role": row[1]
    }

# --- SIMULATION CONTROLS ---
@app.post("/api/simulation/start")
async def start_sim(user = Depends(get_current_user)):
    if user["role"] not in ["Admin", "Data Engineer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    simulator.start_simulation()
    return {"message": "Simulation started"}

@app.post("/api/simulation/stop")
async def stop_sim(user = Depends(get_current_user)):
    if user["role"] not in ["Admin", "Data Engineer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    simulator.stop_simulation()
    return {"message": "Simulation stopped"}

@app.post("/api/simulation/pause")
async def pause_sim(user = Depends(get_current_user)):
    if user["role"] not in ["Admin", "Data Engineer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    simulator.pause_simulation()
    return {"message": "Simulation paused"}

@app.post("/api/simulation/resume")
async def resume_sim(user = Depends(get_current_user)):
    if user["role"] not in ["Admin", "Data Engineer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    simulator.resume_simulation()
    return {"message": "Simulation resumed"}

@app.post("/api/simulation/config")
async def update_config(config: SimConfig, user = Depends(get_current_user)):
    if user["role"] not in ["Admin", "Data Engineer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    simulator.set_config(config.events_per_second, config.fraud_rate)
    return {"message": "Simulation config updated"}

# --- AIRFLOW CONTROLS ---
@app.post("/api/airflow/trigger")
async def trigger_airflow(user = Depends(get_current_user)):
    if user["role"] not in ["Admin", "Data Engineer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    simulator.start_airflow_dag()
    return {"message": "Airflow DAG triggered"}

# --- WAREHOUSE EXPLORER ---
@app.get("/api/warehouse/tables")
def get_tables():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Fetch list of user tables (Bronze, Silver, Gold)
    c.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND (name LIKE 'Bronze%' OR name LIKE 'Silver%' OR name LIKE 'Dim%' OR name LIKE 'Fact%')
    """)
    table_names = [r[0] for r in c.fetchall()]
    
    tables_info = []
    for name in table_names:
        c.execute(f"PRAGMA table_info({name})")
        columns = [{"name": col[1], "type": col[2]} for col in c.fetchall()]
        
        c.execute(f"SELECT COUNT(*) FROM {name}")
        row_count = c.fetchone()[0]
        
        tables_info.append({
            "name": name,
            "layer": "Bronze" if name.startswith("Bronze") else "Silver" if name.startswith("Silver") else "Gold",
            "columns": columns,
            "rows": row_count
        })
        
    conn.close()
    return tables_info

@app.post("/api/warehouse/query")
def execute_sql(payload: SqlQuery, user = Depends(get_current_user)):
    # Check permissions (Analysts can read, Admin/Data Engineer can execute other commands but we limit write commands for safety)
    query_upper = payload.query.upper().strip()
    
    # We restrict to SELECT queries for safety and user experience
    if not query_upper.startswith("SELECT"):
         raise HTTPException(status_code=400, detail="Only read queries (SELECT) are allowed in the explorer.")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(payload.query)
        columns = [desc[0] for desc in c.description] if c.description else []
        rows = [list(row) for row in c.fetchall()]
        
        # Log SQL execution
        c.execute("INSERT INTO System_Logs (component, log_level, message) VALUES (?,?,?)", 
                  ("Warehouse-Explorer", "INFO", f"User {user['sub']} executed query: {payload.query[:60]}..."))
        conn.commit()
        
        return {
            "success": True,
            "columns": columns,
            "rows": rows
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        conn.close()

# --- FRAUD CUSTOMERS ---
@app.get("/api/fraud/customers")
def get_fraud_customers():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT
            so.customer_id,
            COALESCE(dc.name, 'Unknown') AS customer_name,
            COALESCE(dc.email, so.email) AS email,
            COALESCE(dc.country, so.billing_country) AS country,
            COALESCE(dc.segment, 'N/A') AS segment,
            COUNT(so.order_id) AS fraud_count,
            MAX(so.fraud_score) AS max_fraud_score,
            MAX(so.transaction_date) AS last_flagged_at,
            GROUP_CONCAT(DISTINCT so.card_status) AS card_statuses
        FROM Silver_Orders so
        LEFT JOIN Dim_Customer dc ON so.customer_id = dc.customer_id
        WHERE so.is_fraud = 1
        GROUP BY so.customer_id
        ORDER BY fraud_count DESC, max_fraud_score DESC
    """)
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- METRICS HISTORY ---
@app.get("/api/metrics/history")
def get_historical_metrics():
    # Return aggregated logs, order volume counts over time (for landing features or charts)
    conn = get_db_connection()
    c = conn.cursor()
    
    # Retrieve past 10 logs
    c.execute("SELECT timestamp, component, log_level, message FROM System_Logs ORDER BY id DESC LIMIT 20")
    logs = [dict(row) for row in c.fetchall()]
    
    # Hourly aggregate simulation
    c.execute("""
        SELECT substr(transaction_date, 1, 13) as hour_bucket, count(*), sum(usd_amount), sum(is_fraud)
        FROM Silver_Orders
        GROUP BY hour_bucket
        ORDER BY hour_bucket DESC
        LIMIT 12
    """)
    trends = []
    for r in c.fetchall():
        trends.append({
            "time": f"{r[0][-2:]}:00",
            "orders": r[1],
            "revenue": round(r[2], 2),
            "fraud": r[3]
        })
    trends.reverse()
    
    conn.close()
    return {
        "logs": logs,
        "trends": trends
    }

# --- WEBSOCKET CONNECTION ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await simulator.register_connection(websocket)
        while True:
            # Maintain connection and listen for updates
            data = await websocket.receive_text()
            command = json.loads(data)
            if command.get("action") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        simulator.unregister_connection(websocket)
    except Exception as e:
        simulator.unregister_connection(websocket)

# --- STARTUP EVENT ---
@app.on_event("startup")
async def startup_event():
    # Pre-register some default accounts
    conn = get_db_connection()
    c = conn.cursor()
    import hashlib
    default_users = [
        ("admin", hashlib.sha256("admin123".encode()).hexdigest(), "Admin"),
        ("engineer", hashlib.sha256("engineer123".encode()).hexdigest(), "Data Engineer"),
        ("analyst", hashlib.sha256("analyst123".encode()).hexdigest(), "Analyst")
    ]
    for username, pwd_hash, role in default_users:
        try:
            c.execute("INSERT OR REPLACE INTO Users VALUES (?,?,?)", (username, pwd_hash, role))
        except sqlite3.Error:
            pass
    conn.commit()
    conn.close()
    
    # Start order simulator automatically
    simulator.start_simulation()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
