from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sum, count, window, date_format

def run_gold_modeling():
    spark = SparkSession.builder \
        .appName("StreamFlow-Gold-Analytical-Aggregates") \
        .getOrCreate()

    # Load cleansed Silver tables
    silver_orders = spark.read \
        .format("parquet") \
        .load("s3a://streamflow-datalake/silver/orders/")

    # Gold Layer: Fact_Orders analytical aggregations
    # Aggregates hourly revenue by product lines
    hourly_kpis = silver_orders \
        .filter(col("is_fraud") == 0) \
        .groupBy(
            window(col("transaction_date"), "1 hour"),
            col("product_id")
        ) \
        .agg(
            sum("usd_amount").alias("revenue"),
            count("order_id").alias("orders_count")
        ) \
        .select(
            col("window.start").alias("hour_start"),
            col("window.end").alias("hour_end"),
            col("product_id"),
            col("revenue"),
            col("orders_count")
        )

    # Save to Gold aggregate bucket for reporting queries
    hourly_kpis.write \
        .format("parquet") \
        .mode("overwrite") \
        .save("s3a://streamflow-datalake/gold/kpis_by_hour/")

if __name__ == "__main__":
    run_gold_modeling()
