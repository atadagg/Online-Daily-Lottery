CREATE DATABASE lottery_db;
USE lottery_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    numbers VARCHAR(255) NOT NULL,
    draw_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE daily_draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    draw_date DATE UNIQUE NOT NULL,
    prize_pool DECIMAL(15,2) NOT NULL DEFAULT 0,
    winning_numbers VARCHAR(255),
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);