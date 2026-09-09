SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Database is created by MYSQL_DATABASE env var.
-- This file exists for any extra initialization if needed.

GRANT ALL PRIVILEGES ON `numeros_rojos`.* TO 'app'@'%';
FLUSH PRIVILEGES;
