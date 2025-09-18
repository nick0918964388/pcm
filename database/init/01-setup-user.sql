-- PCM Photo Management Database Setup Script
-- This script creates the PCM user and grants necessary permissions

-- Connect as SYS to create user
CONNECT SYS/oracle AS SYSDBA;

-- Create PCM user if it doesn't exist
DECLARE
    user_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM all_users WHERE username = 'PCM_USER';
    IF user_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE USER pcm_user IDENTIFIED BY oracle123';
        DBMS_OUTPUT.PUT_LINE('User PCM_USER created successfully');
    ELSE
        DBMS_OUTPUT.PUT_LINE('User PCM_USER already exists');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error creating user: ' || SQLERRM);
END;
/

-- Grant necessary privileges
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE SEQUENCE TO pcm_user;
GRANT CREATE TRIGGER, CREATE PROCEDURE, CREATE TYPE TO pcm_user;
GRANT UNLIMITED TABLESPACE TO pcm_user;

-- Grant system privileges for text indexing
GRANT CTXAPP TO pcm_user;
GRANT CREATE SESSION TO pcm_user;

-- Additional privileges for Oracle Text (full-text search)
BEGIN
    EXECUTE IMMEDIATE 'GRANT EXECUTE ON CTX_DDL TO pcm_user';
    EXECUTE IMMEDIATE 'GRANT EXECUTE ON CTX_DOC TO pcm_user';
    EXECUTE IMMEDIATE 'GRANT EXECUTE ON CTX_QUERY TO pcm_user';
    DBMS_OUTPUT.PUT_LINE('Oracle Text privileges granted successfully');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Warning: Could not grant Oracle Text privileges: ' || SQLERRM);
END;
/

-- Switch to PCM_USER
CONNECT pcm_user/oracle123@XEPDB1;

-- Verify connection
SELECT USER AS current_user, 
       TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS connection_time 
FROM DUAL;

-- Create a simple test table to verify permissions
CREATE TABLE connection_test (
    id NUMBER PRIMARY KEY,
    test_message VARCHAR2(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO connection_test (id, test_message) VALUES (1, 'PCM Database setup completed successfully');

COMMIT;

-- Display success message
SELECT test_message FROM connection_test WHERE id = 1;

-- Clean up test table
DROP TABLE connection_test;

-- Display setup completion
SELECT 'PCM Database user setup completed successfully' AS status FROM DUAL;