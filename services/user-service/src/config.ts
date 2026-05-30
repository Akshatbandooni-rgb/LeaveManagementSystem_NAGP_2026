import dotenv from 'dotenv';
import path from 'path/win32';

dotenv.config({
  path: path.resolve(__dirname, '../../../.env')
});

const port = Number(process.env.PORT) || 3001;
console.log('***********************************************************************************************');
console.log('Process Environment Variables:');
console.log(`PORT: ${process.env.PORT}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'Not Set'}`);
console.log('***********************************************************************************************');

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const config = {
  port,
  jwtSecret,
};
