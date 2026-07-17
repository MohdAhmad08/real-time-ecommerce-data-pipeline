import sys
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, cast

def run_bronze_ingestion():
    spark = SparkSession.builder \
        .appName("StreamFlow-Bronze-Ingestion") \
        .config("spark.sql.streaming.forceDeleteTempCheckpointLocation", "true") \
        .getOrCreate()

    # Read stream from Kafka Broker
    kafka_df = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("subscribe", "orders") \
        .option("startingOffsets", "latest") \
        .load()

    # Convert binary values to UTF-8 String
    raw_orders = kafka_df.select(
        col("key").cast("string").alias("key"),
        col("value").cast("string").alias("raw_message"),
        col("topic"),
        col("partition"),
        col("offset"),
        col("timestamp").alias("ingested_at")
    )

    # Write Snappy compressed Parquet partitions to AWS S3 landing zone
    query = raw_orders.writeStream \
        .format("parquet") \
        .option("path", "s3a://streamflow-datalake/bronze/orders/") \
        .option("checkpointLocation", "s3a://streamflow-datalake/checkpoints/bronze_orders/") \
        .partitionBy("topic") \
        .outputMode("append") \
        .start()

    query.awaitTermination()

if __name__ == "__main__":
    run_bronze_ingestion()
