import redisClient from './redis';
import dbClient from './db';

export async function getUserFromXToken(req) {
  const token = req.headers['x-token'];
  if (!token) return null;

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return null;

  const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
  return user || null;
}

