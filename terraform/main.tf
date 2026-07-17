terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    snowflake = {
      source  = "snowflake-labs/snowflake"
      version = "~> 0.50.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "snowflake" {
  account  = "xy12345.us-east-1"
  username = "sf_admin"
  password = "sf_password_secure"
  role     = "ACCOUNTADMIN"
}

# 1. AWS S3 Buckets for Data Lake
resource "aws_s3_bucket" "datalake" {
  bucket = "streamflow-datalake"
}

resource "aws_s3_bucket_lifecycle_configuration" "datalake_lifecycle" {
  bucket = aws_s3_bucket.datalake.id

  rule {
    id     = "archive_bronze"
    status = "Enabled"

    filter {
      prefix = "bronze/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

# 2. Snowflake Database & Schema Architecture
resource "snowflake_database" "db" {
  name    = "STREAMFLOW_DWH"
  comment = "E-commerce transactional analysis repository"
}

resource "snowflake_schema" "gold_schema" {
  database = snowflake_database.db.name
  name     = "GOLD"
  comment  = "Materialized star schema facts and dimension tables"
}

resource "snowflake_warehouse" "wh" {
  name           = "ANALYTICS_WH"
  warehouse_size = "X-SMALL"
  auto_suspend   = 60
  auto_resume    = true
}
