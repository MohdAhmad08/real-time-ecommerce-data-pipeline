# StreamFlow: Real-Time E-Commerce Data Lakehouse Platform

StreamFlow is an enterprise-grade real-time data engineering platform built for ingesting, transforming, modeling, and analyzing high-velocity e-commerce events. 

---

## 🏗️ Complete Pipeline Architecture

```text
                        ┌──────────────────────────┐
                        │     React Dashboard      │
                        │ (Order Simulator/Admin)  │
                        └─────────────┬────────────┘
                                      │ REST API & WebSockets
                                      ▼
                          ┌────────────────────────┐
                          │     FastAPI Backend    │
                          │ Authentication + APIs  │
                          └─────────────┬──────────┘
                                        │
                Generates Real-Time Order Events
                                        │
                                        ▼
                         ┌────────────────────────┐
                         │   Kafka Producer       │
                         │ Python Event Generator │
                         └─────────────┬──────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────┐
                    │       Apache Kafka          │
                    │ orders / payments / users   │
                    └─────────────┬───────────────┘
                                  │
                     Spark Structured Streaming
                                  │
                                  ▼
              ┌────────────────────────────────────┐
              │        Apache Spark Cluster         │
              │                                    │
              │ Data Cleaning                      │
              │ Null Handling                      │
              │ Fraud Detection                    │
              │ Currency Conversion                │
              │ Deduplication                      │
              │ Feature Engineering                │
              │ Schema Validation                  │
              └─────────────┬──────────────────────┘
                            │
          Raw Parquet                Clean Parquet
                            │
                            ▼
                    AWS S3 Data Lake
               Bronze → Silver → Gold Layers
                            │
                            ▼
                 Snowflake Data Warehouse
                            │
                            ▼
                         dbt Models
                            │
                            ▼
                  Star Schema Warehouse
```

---

## 📂 Project Structure

```text
streamflow/
├── frontend/             # Vite + React + TypeScript + Tailwind CSS Dashboard
├── backend/              # FastAPI + WebSockets + SQLite database engine
├── kafka/
│   └── producer/
│       └── producer.py   # Python event producer simulation script
├── spark/
│   ├── bronze_job.py     # PySpark job: Kafka ingest to S3 Bronze layer
│   ├── silver_job.py     # PySpark job: Deduplication, cleansing, and fraud detection
│   └── gold_job.py       # PySpark job: star-schema aggregations
├── airflow/
│   └── dags/
│       └── streamflow_dag.py # Airflow DAG to trigger dbt compilation and tests
├── dbt/
│   └── models/
│       └── schema.yml    # dbt modeling validation configurations
├── powerbi/
│   ├── readme.md         # DAX formulas and relationships docs
│   └── dataset_config.json # Power BI dataset configuration configurations
├── docker/
│   └── docker-compose.yml # Compose file for local Kafka, Spark and Postgres
├── terraform/
│   └── main.tf           # Provisioning file for AWS S3 and Snowflake
└── README.md
```

---

## 🗄️ Relational Database Schema Design

StreamFlow leverages a structured **Star Schema** in the Gold warehouse layer:

### Fact Tables
- **Fact_Orders**: Tracks completed orders, quantities, net amounts, and fraud flags.
- **Fact_Payments**: Captures payment modes, timestamps, status metrics, and billing indices.
- **Fact_Returns**: Records returning reasons, refund amounts, and reference order keys.

### Dimension Tables
- **Dim_Customer**: Tracks customer name, country coordinates, segments, and types.
- **Dim_Product**: Standard product information, departments, and unit values.
- **Dim_Date**: Granular date references (is_weekend, month_name, quarters).
- **Dim_Time**: Time divisions (morning, night, specific hour references).
- **Dim_Country**: High-level regional coordinates.
- **Dim_State**: Local regional code divisions.
- **Dim_Seller**: Merchant names, feedback ratings, and account status indices.

---

## 🔒 Automated Fraud Detection Rules
Transactions matching any of the following parameters are tagged `is_fraud = 1` and excluded from the Gold layer to prevent metrics skewing:
1. **High Volume Alert**: Single transaction amount exceeds `$5000`.
2. **Flagged Account Code**: Credit card processor returns status `Blocked`.
3. **Geo-Location Conflict**: Order shipping country does not match the billing country.
4. **Impossible Speed Anomaly**: IP address geolocation logs rapid logins from disparate regions.

---

## 🚀 Quick Start Deployment Guide

To run the StreamFlow interactive portfolio locally:

### 1. Launch FastAPI Backend
1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Activate virtual environment and install requirements:
   ```bash
   py -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Initialize the database and launch server:
   ```bash
   py database.py
   python -m uvicorn main:app --host 127.0.0.1 --port 8000
   ```

### 2. Launch Vite React Frontend
1. Open a terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`.
5. Authenticate using default portfolio accounts:
   - **Admin**: `admin / admin123`
   - **Data Engineer**: `engineer / engineer123`
   - **Analyst**: `analyst / analyst123`
