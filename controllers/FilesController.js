import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { getUserFromXToken } from '../utils/auth';
import { getMimeType } from '../utils/mime';
import fs from 'fs/promises';

class FilesController {
  static async getShow(req, res) {
    const user = await getUserFromXToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const user = await getUserFromXToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page || '0', 10);
    const pageSize = 20;

    const files = await dbClient.filesCollection
      .aggregate([
        { $match: { userId: user._id, parentId } },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ])
      .toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const user = await getUserFromXToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.filesCollection.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
    return res.status(200).json({ ...file, isPublic: true });
  }

  static async putUnpublish(req, res) {
    const user = await getUserFromXToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({ _id: ObjectId(fileId), userId: user._id });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.filesCollection.updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
    return res.status(200).json({ ...file, isPublic: false });
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({ _id: ObjectId(fileId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    if (!file.isPublic) {
      const user = await getUserFromXToken(req);
      if (!user || String(user._id) !== String(file.userId)) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    try {
      const content = await fs.readFile(file.localPath, 'utf-8');
      const mimeType = getMimeType(file.name);
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(content);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;

