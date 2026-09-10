import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'intent',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        define: {
            underscored: false,
        },
    }
);

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`MySQL Connected: ${sequelize.config.host}/${sequelize.config.database}`);

        // Sync models with the database.
        // Use { alter: true } in development to auto-adjust tables to match models.
        // In production, use proper migrations instead of sync/alter.
        const syncOptions = process.env.NODE_ENV === 'production' ? {} : { alter: true };
        await sequelize.sync(syncOptions);
        console.log('Database synced');
    } catch (error) {
        console.error(`Error connecting to MySQL: ${error.message}`);
        process.exit(1);
    }
};

export default sequelize;
