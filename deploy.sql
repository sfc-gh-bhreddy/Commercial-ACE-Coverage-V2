-- =============================================================================
-- Commercial ASC Coverage V2 — SPCS Deployment
-- =============================================================================
-- Run these statements in order. Adjust DB/SCHEMA/POOL names to match your env.
-- Prerequisites: a role with CREATE IMAGE REPOSITORY, CREATE SERVICE, and
-- USAGE on a compute pool.
-- =============================================================================

-- 1. Database & schema (reuse an existing one or create)
USE ROLE SALES_ENGINEER;
CREATE DATABASE IF NOT EXISTS ASC_COVERAGE_APP;
CREATE SCHEMA  IF NOT EXISTS ASC_COVERAGE_APP.V2;
USE SCHEMA ASC_COVERAGE_APP.V2;

-- 2. Image repository
CREATE IMAGE REPOSITORY IF NOT EXISTS ASC_COVERAGE_APP.V2.IMAGES;

-- Show the repo URL (you'll need this for docker push)
SHOW IMAGE REPOSITORIES IN SCHEMA ASC_COVERAGE_APP.V2;
-- Copy the "repository_url" value — it looks like:
--   <org>-<acct>.registry.snowflakecomputing.com/asc_coverage_app/v2/images

-- 3. Compute pool (skip if reusing an existing one)
CREATE COMPUTE POOL IF NOT EXISTS ASC_COVERAGE_POOL
  MIN_NODES = 1
  MAX_NODES = 1
  INSTANCE_FAMILY = CPU_X64_XS
  AUTO_RESUME  = TRUE
  AUTO_SUSPEND_SECS = 300;

-- 4. Grant the role access
GRANT USAGE ON COMPUTE POOL ASC_COVERAGE_POOL TO ROLE SALES_ENGINEER;

-- =============================================================================
-- DOCKER BUILD & PUSH (run these in your terminal, not in Snowflake)
-- =============================================================================
--
-- # Log in to the Snowflake image registry
-- docker login <repository_url>
--   Username: BHREDDY
--   Password: (use snowsql token or password)
--
-- # Build the image
-- cd ~/Desktop/ASE-Commercial-Coverage-V2
-- docker build --platform linux/amd64 -t asc-coverage-v2:latest .
--
-- # Tag for Snowflake registry
-- docker tag asc-coverage-v2:latest <repository_url>/asc-coverage-v2:latest
--
-- # Push
-- docker push <repository_url>/asc-coverage-v2:latest
--
-- =============================================================================

-- 5. Create the service
CREATE SERVICE IF NOT EXISTS ASC_COVERAGE_APP.V2.COVERAGE_SERVICE
  IN COMPUTE POOL ASC_COVERAGE_POOL
  FROM SPECIFICATION $$
  spec:
    containers:
      - name: app
        image: /asc_coverage_app/v2/images/asc-coverage-v2:latest
        env:
          SNOWFLAKE_WAREHOUSE: SNOWADHOC
        resources:
          requests:
            cpu: 0.5
            memory: 512M
          limits:
            cpu: 1
            memory: 1G
    endpoints:
      - name: app
        port: 3000
        public: true
  $$
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1;

-- 6. Check service status
SHOW SERVICES IN SCHEMA ASC_COVERAGE_APP.V2;
SELECT SYSTEM$GET_SERVICE_STATUS('ASC_COVERAGE_APP.V2.COVERAGE_SERVICE');

-- 7. Get the public URL
SHOW ENDPOINTS IN SERVICE ASC_COVERAGE_APP.V2.COVERAGE_SERVICE;
-- The "ingress_url" is the URL you hand out to users.

-- 8. View logs (debugging)
-- SELECT SYSTEM$GET_SERVICE_LOGS('ASC_COVERAGE_APP.V2.COVERAGE_SERVICE', 0, 'app', 100);

-- =============================================================================
-- TEARDOWN (when needed)
-- =============================================================================
-- DROP SERVICE IF EXISTS ASC_COVERAGE_APP.V2.COVERAGE_SERVICE;
-- DROP COMPUTE POOL IF EXISTS ASC_COVERAGE_POOL;
-- DROP IMAGE REPOSITORY IF EXISTS ASC_COVERAGE_APP.V2.IMAGES;
