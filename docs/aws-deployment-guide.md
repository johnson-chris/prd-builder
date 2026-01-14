# AWS Deployment Guide - ECS Fargate

This guide covers deploying the PRD Builder application to AWS using ECS Fargate for containers, S3/CloudFront for the frontend, and RDS for the database.

## Architecture Overview

```
                                    ┌─────────────────┐
                                    │   Route 53      │
                                    │   (DNS)         │
                                    └────────┬────────┘
                                             │
                         ┌───────────────────┴───────────────────┐
                         │                                       │
                         ▼                                       ▼
              ┌─────────────────────┐              ┌─────────────────────┐
              │    CloudFront       │              │  Application Load   │
              │    (CDN)            │              │  Balancer (ALB)     │
              └──────────┬──────────┘              └──────────┬──────────┘
                         │                                    │
                         ▼                                    ▼
              ┌─────────────────────┐              ┌─────────────────────┐
              │    S3 Bucket        │              │   ECS Fargate       │
              │    (Frontend)       │              │   (Backend API)     │
              └─────────────────────┘              └──────────┬──────────┘
                                                              │
                                                              ▼
                                                  ┌─────────────────────┐
                                                  │   RDS PostgreSQL    │
                                                  │   (Database)        │
                                                  └─────────────────────┘
```

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured (`aws configure`)
- Docker installed locally
- Domain name (optional but recommended)

## Cost Estimate

| Service | Estimated Monthly Cost |
|---------|----------------------|
| ECS Fargate (1 task, 0.5 vCPU, 1GB) | $15-25 |
| RDS PostgreSQL (db.t3.micro) | $15-20 |
| Application Load Balancer | $16-20 |
| S3 + CloudFront | $1-5 |
| Secrets Manager | $1-2 |
| **Total** | **$50-75/month** |

---

## Step 1: Set Up AWS Infrastructure

### 1.1 Create a VPC (or use default)

If using the default VPC, note the VPC ID and subnet IDs:

```bash
# Get default VPC ID
aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text

# Get subnet IDs
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<VPC_ID>" --query "Subnets[*].SubnetId" --output text
```

### 1.2 Create Security Groups

**Database Security Group:**
```bash
# Create security group for RDS
aws ec2 create-security-group \
  --group-name prd-builder-db-sg \
  --description "Security group for PRD Builder RDS" \
  --vpc-id <VPC_ID>

# Note the security group ID returned, then allow PostgreSQL from ECS
aws ec2 authorize-security-group-ingress \
  --group-id <DB_SG_ID> \
  --protocol tcp \
  --port 5432 \
  --source-group <ECS_SG_ID>
```

**ECS Security Group:**
```bash
# Create security group for ECS
aws ec2 create-security-group \
  --group-name prd-builder-ecs-sg \
  --description "Security group for PRD Builder ECS" \
  --vpc-id <VPC_ID>

# Allow inbound from ALB on port 3001
aws ec2 authorize-security-group-ingress \
  --group-id <ECS_SG_ID> \
  --protocol tcp \
  --port 3001 \
  --source-group <ALB_SG_ID>
```

**ALB Security Group:**
```bash
# Create security group for ALB
aws ec2 create-security-group \
  --group-name prd-builder-alb-sg \
  --description "Security group for PRD Builder ALB" \
  --vpc-id <VPC_ID>

# Allow inbound HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id <ALB_SG_ID> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow inbound HTTP (for redirect to HTTPS)
aws ec2 authorize-security-group-ingress \
  --group-id <ALB_SG_ID> \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

---

## Step 2: Set Up RDS PostgreSQL

### 2.1 Create RDS Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name prd-builder-db-subnet \
  --db-subnet-group-description "Subnet group for PRD Builder DB" \
  --subnet-ids <SUBNET_ID_1> <SUBNET_ID_2>
```

### 2.2 Create RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier prd-builder-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username prdadmin \
  --master-user-password <STRONG_PASSWORD> \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-name prdbuilder \
  --vpc-security-group-ids <DB_SG_ID> \
  --db-subnet-group-name prd-builder-db-subnet \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --storage-encrypted
```

### 2.3 Wait for RDS to be Available

```bash
aws rds wait db-instance-available --db-instance-identifier prd-builder-db

# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier prd-builder-db \
  --query "DBInstances[0].Endpoint.Address" \
  --output text
```

---

## Step 3: Set Up Secrets Manager

### 3.1 Store Database Credentials

```bash
aws secretsmanager create-secret \
  --name prd-builder/database \
  --description "PRD Builder database credentials" \
  --secret-string '{
    "username": "prdadmin",
    "password": "<STRONG_PASSWORD>",
    "host": "<RDS_ENDPOINT>",
    "port": "5432",
    "database": "prdbuilder"
  }'
```

### 3.2 Store Application Secrets

```bash
aws secretsmanager create-secret \
  --name prd-builder/app \
  --description "PRD Builder application secrets" \
  --secret-string '{
    "JWT_SECRET": "<GENERATE_32_CHAR_SECRET>",
    "JWT_REFRESH_SECRET": "<GENERATE_32_CHAR_SECRET>",
    "ANTHROPIC_API_KEY": "sk-ant-..."
  }'
```

**Generate secure secrets:**
```bash
openssl rand -base64 32
```

---

## Step 4: Set Up ECR (Container Registry)

### 4.1 Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name prd-builder-backend \
  --image-scanning-configuration scanOnPush=true
```

### 4.2 Build and Push Docker Image

```bash
# Get ECR login
aws ecr get-login-password --region <REGION> | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com

# Build the backend image
cd backend
docker build -t prd-builder-backend .

# Tag the image
docker tag prd-builder-backend:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/prd-builder-backend:latest

# Push to ECR
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/prd-builder-backend:latest
```

---

## Step 5: Set Up ECS Fargate

### 5.1 Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name prd-builder-cluster
```

### 5.2 Create IAM Role for ECS Task Execution

Create `ecs-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```bash
# Create the role
aws iam create-role \
  --role-name prd-builder-ecs-execution-role \
  --assume-role-policy-document file://ecs-trust-policy.json

# Attach managed policy
aws iam attach-role-policy \
  --role-name prd-builder-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Add Secrets Manager access
aws iam put-role-policy \
  --role-name prd-builder-ecs-execution-role \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Resource": [
          "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:prd-builder/*"
        ]
      }
    ]
  }'
```

### 5.3 Create Task Definition

Create `task-definition.json`:
```json
{
  "family": "prd-builder-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/prd-builder-ecs-execution-role",
  "taskRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/prd-builder-ecs-execution-role",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/prd-builder-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3001"
        },
        {
          "name": "CORS_ORIGIN",
          "value": "https://your-domain.com"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:prd-builder/database"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:prd-builder/app:JWT_SECRET::"
        },
        {
          "name": "JWT_REFRESH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:prd-builder/app:JWT_REFRESH_SECRET::"
        },
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:prd-builder/app:ANTHROPIC_API_KEY::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/prd-builder-backend",
          "awslogs-region": "<REGION>",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/prd-builder-backend

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 5.4 Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name prd-builder-alb \
  --subnets <SUBNET_ID_1> <SUBNET_ID_2> \
  --security-groups <ALB_SG_ID> \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name prd-builder-backend-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id <VPC_ID> \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30

# Create listener (HTTPS - requires SSL certificate)
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<ACM_CERTIFICATE_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TARGET_GROUP_ARN>

# Create HTTP listener (redirect to HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

### 5.5 Create ECS Service

```bash
aws ecs create-service \
  --cluster prd-builder-cluster \
  --service-name prd-builder-backend \
  --task-definition prd-builder-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_ID_1>,<SUBNET_ID_2>],securityGroups=[<ECS_SG_ID>],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<TARGET_GROUP_ARN>,containerName=backend,containerPort=3001"
```

---

## Step 6: Deploy Frontend to S3 + CloudFront

### 6.1 Create S3 Bucket

```bash
aws s3 mb s3://prd-builder-frontend-<UNIQUE_SUFFIX> --region <REGION>

# Enable static website hosting
aws s3 website s3://prd-builder-frontend-<UNIQUE_SUFFIX> \
  --index-document index.html \
  --error-document index.html
```

### 6.2 Build and Deploy Frontend

```bash
cd frontend

# Update environment variables for production
echo "VITE_API_URL=https://api.your-domain.com" > .env.production

# Build
npm run build

# Deploy to S3
aws s3 sync dist/ s3://prd-builder-frontend-<UNIQUE_SUFFIX> --delete
```

### 6.3 Create CloudFront Distribution

Create `cloudfront-config.json`:
```json
{
  "CallerReference": "prd-builder-frontend",
  "Comment": "PRD Builder Frontend",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-prd-builder-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-prd-builder-frontend",
        "DomainName": "prd-builder-frontend-<UNIQUE_SUFFIX>.s3.<REGION>.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_100"
}
```

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

---

## Step 7: Set Up Route 53 (DNS)

### 7.1 Create Hosted Zone (if needed)

```bash
aws route53 create-hosted-zone \
  --name your-domain.com \
  --caller-reference $(date +%s)
```

### 7.2 Create DNS Records

```bash
# Frontend (CloudFront)
aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.your-domain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "<CLOUDFRONT_DOMAIN>.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'

# Backend (ALB)
aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.your-domain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<ALB_HOSTED_ZONE_ID>",
          "DNSName": "<ALB_DNS_NAME>",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

---

## Step 8: SSL Certificates (ACM)

### 8.1 Request Certificate

```bash
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names "*.your-domain.com" \
  --validation-method DNS \
  --region us-east-1  # Must be us-east-1 for CloudFront
```

### 8.2 Validate Certificate

Add the CNAME records provided by ACM to your DNS, then wait for validation:

```bash
aws acm wait certificate-validated \
  --certificate-arn <CERTIFICATE_ARN> \
  --region us-east-1
```

---

## Step 9: Run Database Migrations

### 9.1 Connect to RDS and Run Prisma Migrate

You can use ECS Exec or a bastion host to run migrations:

```bash
# Using ECS Exec (requires enabling in service)
aws ecs execute-command \
  --cluster prd-builder-cluster \
  --task <TASK_ID> \
  --container backend \
  --interactive \
  --command "/bin/sh"

# Inside container
npx prisma migrate deploy
```

---

## Step 10: Set Up CI/CD (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: prd-builder-backend
  ECS_CLUSTER: prd-builder-cluster
  ECS_SERVICE: prd-builder-backend
  S3_BUCKET: prd-builder-frontend-<UNIQUE_SUFFIX>
  CLOUDFRONT_DISTRIBUTION_ID: <DISTRIBUTION_ID>

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --force-new-deployment

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build
        run: cd frontend && npm run build
        env:
          VITE_API_URL: https://api.your-domain.com

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to S3
        run: aws s3 sync frontend/dist/ s3://$S3_BUCKET --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
            --paths "/*"
```

---

## Monitoring and Maintenance

### View Logs

```bash
# ECS logs
aws logs tail /ecs/prd-builder-backend --follow

# RDS logs
aws rds describe-db-log-files --db-instance-identifier prd-builder-db
```

### Scale Service

```bash
# Scale up
aws ecs update-service \
  --cluster prd-builder-cluster \
  --service prd-builder-backend \
  --desired-count 2

# Scale down
aws ecs update-service \
  --cluster prd-builder-cluster \
  --service prd-builder-backend \
  --desired-count 1
```

### Update Backend

```bash
# Build and push new image
docker build -t prd-builder-backend ./backend
docker tag prd-builder-backend:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/prd-builder-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/prd-builder-backend:latest

# Force new deployment
aws ecs update-service \
  --cluster prd-builder-cluster \
  --service prd-builder-backend \
  --force-new-deployment
```

### Update Frontend

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://prd-builder-frontend-<UNIQUE_SUFFIX> --delete
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

---

## Troubleshooting

### ECS Task Not Starting

```bash
# Check stopped tasks
aws ecs list-tasks --cluster prd-builder-cluster --desired-status STOPPED

# Describe task for error details
aws ecs describe-tasks --cluster prd-builder-cluster --tasks <TASK_ARN>
```

### Database Connection Issues

```bash
# Verify security group rules
aws ec2 describe-security-groups --group-ids <DB_SG_ID>

# Test connectivity from ECS
aws ecs execute-command --cluster prd-builder-cluster --task <TASK_ID> --container backend --interactive --command "nc -zv <RDS_ENDPOINT> 5432"
```

### CloudFront 403 Errors

- Ensure S3 bucket policy allows CloudFront access
- Check that `index.html` exists in S3
- Verify CloudFront Origin Access Identity is configured

---

## Cleanup (Tear Down)

To remove all resources:

```bash
# Delete ECS service and cluster
aws ecs update-service --cluster prd-builder-cluster --service prd-builder-backend --desired-count 0
aws ecs delete-service --cluster prd-builder-cluster --service prd-builder-backend
aws ecs delete-cluster --cluster prd-builder-cluster

# Delete RDS
aws rds delete-db-instance --db-instance-identifier prd-builder-db --skip-final-snapshot

# Delete ECR repository
aws ecr delete-repository --repository-name prd-builder-backend --force

# Delete S3 bucket
aws s3 rb s3://prd-builder-frontend-<UNIQUE_SUFFIX> --force

# Delete CloudFront distribution (must disable first)
aws cloudfront update-distribution --id <DISTRIBUTION_ID> --if-match <ETAG> --distribution-config file://disabled-config.json
aws cloudfront delete-distribution --id <DISTRIBUTION_ID> --if-match <ETAG>

# Delete secrets
aws secretsmanager delete-secret --secret-id prd-builder/database --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id prd-builder/app --force-delete-without-recovery

# Delete security groups, ALB, target groups, etc.
```

---

## Security Checklist

- [ ] RDS not publicly accessible
- [ ] All secrets in Secrets Manager (not environment variables)
- [ ] HTTPS enforced on both frontend and backend
- [ ] Security groups follow least-privilege principle
- [ ] RDS encryption at rest enabled
- [ ] CloudWatch logs enabled for ECS
- [ ] Regular RDS backups configured
- [ ] IAM roles follow least-privilege principle
