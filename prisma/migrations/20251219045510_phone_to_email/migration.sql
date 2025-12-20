ALTER TABLE verification_codes
DROP COLUMN phone_number,
ADD COLUMN email VARCHAR(255) NOT NULL;
