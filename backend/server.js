const http = require('http');
const dns = require('dns');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const winston = require('winston');
const app = require('./app');
const { initIO } = require('./socket');

// Fix SRV DNS resolution issues on some Windows/network setups
dns.setDefaultResultOrder('ipv4first');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

const connectDB = async () => {
    const uri = process.env.ATLAS_MONGO_URI || process.env.MONGO_URI;

    if (!uri) {
        logger.error('MongoDB URI is not configured. Set ATLAS_MONGO_URI or MONGO_URI in backend/.env.');
        process.exit(1);
        return;
    }

    try {
        const conn = await mongoose.connect(uri);
        const hostDisplay = conn.connection.host || 'MongoDB Cluster';
        const dbName = conn.connection.name;
        logger.info(`MongoDB Connected successfully to [${dbName}] at ${hostDisplay}`);
    } catch (error) {
        logger.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

const PORT = process.env.PORT || 5000;
const startScheduler = require('./cron/scheduler');

const server = http.createServer(app);
initIO(server);

if (require.main === module) {
    connectDB().then(() => {
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            startScheduler();
        });
    });
}

module.exports = { app, server, connectDB };
