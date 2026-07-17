from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator

default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'start_date': datetime(2026, 1, 1),
    'email': ['alerts@streamflow.io'],
    'email_on_failure': True,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'streamflow_data_lakehouse',
    default_args=default_args,
    description='E-Commerce Lakehouse synchronization and dbt modeling pipeline',
    schedule_interval='@hourly',
    catchup=False,
    tags=['streamflow', 'lakehouse', 'dbt'],
) as dag:

    start_node = EmptyOperator(task_id='start_pipeline')

    # 1. Run Spark Gold aggregations
    spark_gold_aggregation = SparkSubmitOperator(
        task_id='spark_gold_aggregates',
        application='/opt/spark/jobs/gold_job.py',
        conn_id='spark_default',
        verbose=True
    )

    # 2. Stage S3 folders to Snowflake staging
    stage_to_snowflake = SnowflakeOperator(
        task_id='stage_s3_to_snowflake',
        snowflake_conn_id='snowflake_default',
        sql="""
            COPY INTO snowflake_db.staging.orders_staging
            FROM @s3_gold_stage/orders/
            FILE_FORMAT = (TYPE = PARQUET COMPRESSION = SNAPPY);
        """
    )

    # 3. Trigger dbt compile and test modeling rules
    dbt_run = BashOperator(
        task_id='dbt_run_models',
        bash_command='cd /opt/dbt/streamflow_models && dbt run --profiles-dir .'
    )

    dbt_test = BashOperator(
        task_id='dbt_test_rules',
        bash_command='cd /opt/dbt/streamflow_models && dbt test --profiles-dir .'
    )

    # 4. Slack notification on completion
    slack_notify = BashOperator(
        task_id='slack_notification',
        bash_command='curl -X POST -H "Content-type: application/json" --data \'{"text":"StreamFlow Data Pipeline ran successfully at {{ ts }}"}\' $SLACK_WEBHOOK'
    )

    end_node = EmptyOperator(task_id='end_pipeline')

    # Pipeline task ordering
    start_node >> spark_gold_aggregation >> stage_to_snowflake >> dbt_run >> dbt_test >> slack_notify >> end_node
