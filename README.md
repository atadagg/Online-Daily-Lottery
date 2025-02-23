# Simple Daily Lottery App

A straightforward daily lottery application where users can buy tickets and participate in daily draws. Built with Node.js, Express, and MySQL.

## Features

- User authentication and session management
- Daily lottery ticket purchases
- Automatic daily draws
- Winning number matching and payout system
- Transaction history
- Secure payment processing

## Technical Stack

- Backend: Node.js + Express
- Database: MySQL
- Session Management: express-session with MySQL store
- Payment Processing: Stripe (in test mode)
- Frontend: HTML, CSS, JavaScript

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  numbers JSON NOT NULL,
  draw_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Transactions table
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'completed', 'failed') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/lottery-app.git
cd lottery-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env`:
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=lottery_db
SESSION_SECRET=your_session_secret
STRIPE_TEST_KEY=your_stripe_test_key
```

4. Set up the database:
```bash
mysql -u root -p < setup/database.sql
```

5. Start the server:
```bash
npm start
```

## Configuration

### Session Management
Sessions are stored in MySQL using express-mysql-session. The session table is automatically created and managed.

### Payment Processing
Stripe is implemented in test mode. To process real payments:
1. Apply for Stripe account approval
2. Replace test keys with production keys
3. Update webhook endpoints

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- POST /api/auth/logout - Logout user

### Lottery
- GET /api/lottery/current - Get current draw info
- POST /api/lottery/buy - Buy new ticket
- GET /api/lottery/tickets - Get user's tickets
- GET /api/lottery/results - Get latest results

### Transactions
- GET /api/transactions - Get user's transaction history
- POST /api/transactions/create - Create new transaction

## Business Logic

### Ticket Purchase
- Each ticket costs $2
- Users can select numbers manually or get random numbers
- Numbers range from 1-49
- 6 numbers per ticket

### Draw Schedule
- Draws occur daily at midnight
- Results are processed automatically
- Winners are notified via email

### Payout Structure
- 6 numbers: Jackpot (accumulating)
- 5 numbers: $5,000
- 4 numbers: $100
- 3 numbers: $10

## Security Measures

- Password hashing using bcrypt
- Session-based authentication
- SQL injection protection
- XSS protection
- Rate limiting on API endpoints

## Development

To run in development mode:
```bash
npm run dev
```

To run tests:
```bash
npm test
```

## Production Deployment

1. Update environment variables
2. Enable secure cookies
3. Set up SSL certificate
4. Configure database backups
5. Set up monitoring

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT License - see LICENSE.md

## Contact

For support or queries, reach out to [your-email@example.com]
