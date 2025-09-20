-- PCM Health Check Script for Oracle Database
-- This script is used by Docker health check to verify database connectivity

SET PAGESIZE 0
SET FEEDBACK OFF
SET VERIFY OFF
SET HEADING OFF

SELECT 'OK' FROM DUAL;

EXIT;