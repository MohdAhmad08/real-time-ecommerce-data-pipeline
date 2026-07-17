from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, when, current_timestamp, expr
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType

def run_silver_processing():
    spark = SparkSession.builder \
        .appName("StreamFlow-Silver-Cleanse") \
        .getOrCreate()

    # Define schema for raw order messages
    schema = StructType([
        StructField("order_id", StringType(), True),
        StructField("customer_id", StringType(), True),
        StructField("product_id", StringType(), True),
        StructField("quantity", IntegerType(), True),
        StructField("price", DoubleType(), True),
        StructField("amount", DoubleType(), True),
        StructField("currency", StringType(), True),
        StructField("transaction_date", StringType(), True),
        StructField("device", StringType(), True),
        StructField("ip_address", StringType(), True),
        StructField("email", StringType(), True),
        StructField("billing_country", StringType(), True),
        StructField("shipping_country", StringType(), True),
        StructField("card_status", StringType(), True),
    ])

    # Read parquet stream from S3 Bronze bucket
    raw_df = spark.readStream \
        .format("parquet") \
        .load("s3a://streamflow-datalake/bronze/orders/")

    # Parse and cleanse JSON fields
    cleansed_df = raw_df.select(from_json(col("raw_message"), schema).alias("data")) \
        .select("data.*") \
        .filter(col("order_id").isNotNull() & col("customer_id").isNotNull()) \
        .filter(col("amount") >= 0)  # DQ check: positive amounts only

    # Deduplicate stream by buffering order keys
    deduplicated_df = cleansed_df.withWatermark("transaction_date", "10 minutes") \
        .dropDuplicates(["order_id"])

    # Standardize currencies and evaluate Fraud heuristics
    enriched_df = deduplicated_df.withColumn(
        "usd_amount",
        when(col("currency") == "USD", col("amount"))
        .otherwise(col("amount") * 1.08) # Example conversion rate
    ).withColumn(
        "is_fraud",
        when((col("amount") > 5000) | (col("card_status") == "Blocked") | (col("billing_country") != col("shipping_country")), 1)
        .otherwise(0)
    ).withColumn(
        "processed_at", 
        current_timestamp()
    )

    # Write clean streams to S3 Silver directories
    query = enriched_df.writeStream \
        .format("parquet") \
        .option("path", "s3a://streamflow-datalake/silver/orders/") \
        .option("checkpointLocation", "s3a://streamflow-datalake/checkpoints/silver_orders/") \
        .outputMode("append") \
        .start()

    query.awaitTermination()

if __name__ == "__main__":
    run_silver_processing()
