import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Tokens endpoint' });
});

export default router;
