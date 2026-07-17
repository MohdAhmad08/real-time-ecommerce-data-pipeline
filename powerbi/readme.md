# Power BI Embedded Dashboard Setup Guide

This directory documents the data modeling, star schema connections, and custom DAX measures for the StreamFlow Dashboard.

## Model Schema Relationships

```text
               ┌──────────────────────┐
               │    Dim_Customer      │
               │ (customer_id) 1-to-N  │
               └──────────┬───────────┘
                          │
                          ▼
┌──────────────────┐  N-to-1  ┌──────────────────┐  1-to-N  ┌──────────────────┐
│   Dim_Product    │ ◄────────│   Fact_Orders    │────────► │     Dim_Date     │
│ (product_id)     │          │  (order_key)     │          │    (date_key)    │
└──────────────────┘          └────────┬─────────┘          └──────────────────┘
                                       │ 1-to-1
                                       ▼
                              ┌──────────────────┐
                              │  Fact_Payments   │
                              │  (payment_id)    │
                              └──────────────────┘
```

## Key DAX Measures

### 1. Cumulative Revenue
```dax
Cumulative Revenue = 
SUMX(
    Fact_Orders,
    Fact_Orders[net_amount] + Fact_Orders[shipping_amount]
)
```

### 2. Customer Retention Rate
```dax
Retention Rate = 
VAR ActiveCustomers = DISTINCTCOUNT(Fact_Orders[customer_id])
VAR PreviousActiveCustomers = 
    CALCULATE(
        DISTINCTCOUNT(Fact_Orders[customer_id]),
        DATEADD(Dim_Date[full_date], -30, DAY)
    )
RETURN
    DIVIDE(ActiveCustomers, PreviousActiveCustomers, 0)
```

### 3. Fraud Risk Mitigation Metric
```dax
Fraud Mitigation Score = 
DIVIDE(
    CALCULATE(COUNT(Fact_Orders[order_id]), Fact_Orders[fraud_flag] == 1),
    COUNT(Fact_Orders[order_id]),
    0
) * 100
```

## Connection Strategy
- **Ingestion Mode**: DirectQuery (Real-Time latency)
- **Data Source**: Snowflake Data Warehouse (Gold schema views)
- **Refresh Frequency**: Automatic page refresh (APR) every 1 second
