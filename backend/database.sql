-- SecurePrint Database Schema
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS secureprint;
USE secureprint;

-- Documents table for storing encrypted file metadata
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,                    -- UUID for the document
    original_name VARCHAR(255) NOT NULL,           -- Original filename
    file_type VARCHAR(50) NOT NULL,                -- MIME type (application/pdf, image/jpeg, etc.)
    file_size INT NOT NULL,                        -- File size in bytes
    encrypted_path VARCHAR(500) NOT NULL,          -- Path to encrypted file on disk
    encryption_iv VARCHAR(32) NOT NULL,            -- Initialization vector for AES encryption
    access_token VARCHAR(64) UNIQUE NOT NULL,      -- Unique token for secure access
    expires_at DATETIME NOT NULL,                  -- Expiration timestamp (24 hours)
    accessed BOOLEAN DEFAULT FALSE,                -- Whether document has been accessed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- Last update timestamp
);

-- Index for faster lookups
CREATE INDEX idx_access_token ON documents(access_token);
CREATE INDEX idx_expires_at ON documents(expires_at);
CREATE INDEX idx_accessed ON documents(accessed);

-- Cleanup procedure for expired documents
DELIMITER //
CREATE PROCEDURE CleanupExpiredDocuments()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE doc_id VARCHAR(36);
    DECLARE doc_path VARCHAR(500);
    DECLARE cur CURSOR FOR 
        SELECT id, encrypted_path FROM documents 
        WHERE expires_at < NOW() OR accessed = TRUE;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO doc_id, doc_path;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Log cleanup (in production, you might want to add logging)
        SELECT CONCAT('Cleaning up document: ', doc_id) AS message;
        
    END LOOP;
    
    CLOSE cur;
    
    -- Delete expired or accessed documents from database
    DELETE FROM documents WHERE expires_at < NOW() OR accessed = TRUE;
    
END //
DELIMITER ;

-- Create event to run cleanup every hour (requires event scheduler to be enabled)
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS cleanup_expired_docs
-- ON SCHEDULE EVERY 1 HOUR
-- DO CALL CleanupExpiredDocuments();
